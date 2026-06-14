const {
  isFoodDbReady,
  getFoodByBarcodeModel,
  getFoodByNameModel,
} = require("../food");

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function buildSearchTerms(query = "", productName = "") {
  return [...new Set([...tokenize(query), ...tokenize(productName)])];
}

function toApiFood(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const result = {
    source: o.source,
    productName: o.productName,
    servingSize: o.servingSize || "100",
    servings: o.servings ?? 1,
    nutrition: o.nutrition || {
      calories: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    },
  };

  if (o.barcode) result.barcode = o.barcode;
  if (o.fdcId) result.fdcId = o.fdcId;
  if (o.brand) result.brand = o.brand;
  if (o.imageUrl) result.imageUrl = o.imageUrl;
  if (o.foodCategory) result.foodCategory = o.foodCategory;
  if (o.dataType) result.dataType = o.dataType;

  return result;
}

function toCacheDocument(food, query = "") {
  const searchTerms = buildSearchTerms(query, food.productName);
  return {
    source: food.source,
    barcode: food.barcode || undefined,
    fdcId: food.fdcId || undefined,
    productName: food.productName,
    brand: food.brand,
    imageUrl: food.imageUrl,
    servingSize: food.servingSize || "100",
    servings: food.servings ?? 1,
    nutrition: food.nutrition || {},
    foodCategory: food.foodCategory,
    dataType: food.dataType,
    searchTerms,
    cachedAt: new Date(),
  };
}

function nameLookupFilter(food) {
  if (food.fdcId) return { fdcId: food.fdcId };
  if (food.barcode) return { barcode: food.barcode, source: food.source };
  return { productName: food.productName, source: food.source };
}

async function cacheFood(food, query = "") {
  if (!isFoodDbReady() || !food?.productName) return;

  const doc = toCacheDocument(food, query);
  const FoodByBarcode = getFoodByBarcodeModel();
  const FoodByName = getFoodByNameModel();
  const nameFilter = nameLookupFilter(food);

  const existing = await FoodByName.findOne(nameFilter).select("searchTerms").lean();
  if (existing?.searchTerms?.length) {
    doc.searchTerms = [...new Set([...existing.searchTerms, ...doc.searchTerms])];
  }

  const ops = [];

  if (food.barcode) {
    ops.push(
      FoodByBarcode.findOneAndUpdate({ barcode: food.barcode }, doc, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
    );
  }

  ops.push(
    FoodByName.findOneAndUpdate(nameFilter, doc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    })
  );

  await Promise.all(ops);
}

async function cacheFoods(foods = [], query = "") {
  for (const food of foods) {
    await cacheFood(food, query);
  }
}

async function findByBarcode(barcode) {
  if (!isFoodDbReady() || !barcode) return null;
  const doc = await getFoodByBarcodeModel().findOne({ barcode }).lean();
  return toApiFood(doc);
}

async function findByFdcId(fdcId) {
  if (!isFoodDbReady() || !fdcId) return null;
  const doc = await getFoodByNameModel().findOne({ fdcId }).lean();
  return toApiFood(doc);
}

function buildNameFilter(query, source) {
  const terms = tokenize(query);
  const filter = {
    $or: [
      { productName: { $regex: query, $options: "i" } },
      ...(terms.length ? [{ searchTerms: { $all: terms } }] : []),
    ],
  };

  if (source === "usda") filter.source = "usda";
  if (source === "off" || source === "openfoodfacts") {
    filter.source = "openfoodfacts";
  }

  return filter;
}

async function searchByName(query, { source = "all", page = 1, pageSize = 20 } = {}) {
  if (!isFoodDbReady() || !query) {
    return { foods: [], count: 0 };
  }

  const filter = buildNameFilter(query, source);
  const skip = (page - 1) * pageSize;
  const FoodByName = getFoodByNameModel();

  const [docs, count] = await Promise.all([
    FoodByName.find(filter).sort({ cachedAt: -1 }).skip(skip).limit(pageSize).lean(),
    FoodByName.countDocuments(filter),
  ]);

  return {
    foods: docs.map(toApiFood).filter(Boolean),
    count,
  };
}

function splitCachedBySource(foods = []) {
  const usda = foods.filter((f) => f.source === "usda");
  const openfoodfacts = foods.filter((f) => f.source === "openfoodfacts");
  return { usda, openfoodfacts };
}

module.exports = {
  buildSearchTerms,
  toApiFood,
  cacheFood,
  cacheFoods,
  findByBarcode,
  findByFdcId,
  searchByName,
  splitCachedBySource,
  isFoodDbReady,
};
