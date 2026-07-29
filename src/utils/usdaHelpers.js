/**
 * USDA FoodData Central helpers — generic / non-packaged foods.
 * Docs: https://fdc.nal.usda.gov/api-guide
 */

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const GENERIC_DATA_TYPES = ["Foundation", "SR Legacy"];

/** Nutrient id → frontend field (values are per 100g from USDA). */
const NUTRIENT = {
  ENERGY_KCAL: 1008,
  ENERGY_KJ: 1062,
  ENERGY_ATWATER_GENERAL: 2047,
  ENERGY_ATWATER_SPECIFIC: 2048,
  WATER: 1051,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
  SUGAR_ALT: 1063,
  SUCROSE: 1010,
  GLUCOSE: 1011,
  FRUCTOSE: 1012,
  SATURATED_FAT: 1258,
  MONOUNSATURATED_FAT: 1292,
  POLYUNSATURATED_FAT: 1293,
  TRANS_FAT: 1257,
  CHOLESTEROL: 1253,
  SODIUM: 1093,
  POTASSIUM: 1092,
  CALCIUM: 1087,
  IRON: 1089,
  MAGNESIUM: 1090,
  PHOSPHORUS: 1091,
  ZINC: 1095,
  COPPER: 1098,
  MANGANESE: 1101,
  SELENIUM: 1103,
  VITAMIN_A: 1106,
  VITAMIN_C: 1162,
  VITAMIN_D: 1114,
  VITAMIN_E: 1109,
  VITAMIN_K: 1185,
  THIAMIN: 1165,
  RIBOFLAVIN: 1166,
  NIACIN: 1167,
  VITAMIN_B6: 1175,
  FOLATE: 1177,
  VITAMIN_B12: 1178,
  CHOLINE: 1180,
  CAFFEINE: 1057,
};

function getUsdaApiKey() {
  return process.env.USDA_API_KEY || "DEMO_KEY";
}

async function usdaFetch(path, params = {}) {
  const qs = new URLSearchParams(params);
  qs.set("api_key", getUsdaApiKey());
  const url = `${USDA_BASE}${path}?${qs.toString()}`;
  const upstream = await fetch(url);

  if (!upstream.ok) {
    const err = new Error("upstream");
    err.status = upstream.status;
    throw err;
  }

  return upstream.json();
}

function getNutrientValue(foodNutrients, nutrientId) {
  const row = (foodNutrients || []).find(
    (n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId
  );
  if (!row) return null;
  const value = row.amount ?? row.value;
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
}

function roundN(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** USDA values are per 100g for Foundation / SR Legacy. */
function extractUsdaNutrition(foodNutrients, servingGrams = 100) {
  const scale = servingGrams / 100;
  const val = (id) => getNutrientValue(foodNutrients, id);
  const g = (id) => {
    const v = val(id);
    return v == null ? 0 : roundN(v * scale);
  };
  const mg = (id) => {
    const v = val(id);
    return v == null ? 0 : roundN(v * scale);
  };
  const mcg = (id) => {
    const v = val(id);
    return v == null ? 0 : roundN(v * scale, 3);
  };

  let calories =
    val(NUTRIENT.ENERGY_KCAL) ??
    val(NUTRIENT.ENERGY_ATWATER_GENERAL) ??
    val(NUTRIENT.ENERGY_ATWATER_SPECIFIC);

  if (calories == null) {
    const kj = val(NUTRIENT.ENERGY_KJ);
    if (kj != null) calories = kj / 4.184;
  }

  const protein = val(NUTRIENT.PROTEIN) ?? 0;
  const fat = val(NUTRIENT.FAT) ?? 0;
  const carbs = val(NUTRIENT.CARBS) ?? 0;
  const fiber = val(NUTRIENT.FIBER) ?? 0;
  const sugar = val(NUTRIENT.SUGAR) ?? val(NUTRIENT.SUGAR_ALT) ?? 0;

  if (calories == null) {
    calories = protein * 4 + carbs * 4 + fat * 9;
  }

  return {
    calories: Math.round(calories * scale),
    carbs: roundN(carbs * scale),
    fat: roundN(fat * scale),
    protein: roundN(protein * scale),
    sugar: roundN(sugar * scale),
    fiber: roundN(fiber * scale),
    water: g(NUTRIENT.WATER),
    saturatedFat: g(NUTRIENT.SATURATED_FAT),
    monounsaturatedFat: g(NUTRIENT.MONOUNSATURATED_FAT),
    polyunsaturatedFat: g(NUTRIENT.POLYUNSATURATED_FAT),
    transFat: g(NUTRIENT.TRANS_FAT),
    cholesterol: mg(NUTRIENT.CHOLESTEROL),
    sodium: mg(NUTRIENT.SODIUM),
    potassium: mg(NUTRIENT.POTASSIUM),
    calcium: mg(NUTRIENT.CALCIUM),
    iron: mg(NUTRIENT.IRON),
    magnesium: mg(NUTRIENT.MAGNESIUM),
    phosphorus: mg(NUTRIENT.PHOSPHORUS),
    zinc: mg(NUTRIENT.ZINC),
    copper: mg(NUTRIENT.COPPER),
    manganese: mg(NUTRIENT.MANGANESE),
    selenium: mcg(NUTRIENT.SELENIUM),
    vitaminA: mcg(NUTRIENT.VITAMIN_A),
    vitaminC: mg(NUTRIENT.VITAMIN_C),
    vitaminD: mcg(NUTRIENT.VITAMIN_D),
    vitaminE: mg(NUTRIENT.VITAMIN_E),
    vitaminK: mcg(NUTRIENT.VITAMIN_K),
    thiamin: mg(NUTRIENT.THIAMIN),
    riboflavin: mg(NUTRIENT.RIBOFLAVIN),
    niacin: mg(NUTRIENT.NIACIN),
    vitaminB6: mg(NUTRIENT.VITAMIN_B6),
    folate: mcg(NUTRIENT.FOLATE),
    vitaminB12: mcg(NUTRIENT.VITAMIN_B12),
    choline: mg(NUTRIENT.CHOLINE),
    caffeine: mg(NUTRIENT.CAFFEINE),
    sucrose: g(NUTRIENT.SUCROSE),
    glucose: g(NUTRIENT.GLUCOSE),
    fructose: g(NUTRIENT.FRUCTOSE),
  };
}

async function searchUsdaFoods(query, { page = 1, pageSize = 20 } = {}) {
  const qs = new URLSearchParams();
  qs.set("api_key", getUsdaApiKey());
  qs.set("query", query);
  qs.set("pageSize", String(pageSize));
  qs.set("pageNumber", String(Math.max(1, page) - 1));
  for (const dataType of GENERIC_DATA_TYPES) {
    qs.append("dataType", dataType);
  }

  const url = `${USDA_BASE}/foods/search?${qs.toString()}`;
  const upstream = await fetch(url);
  if (!upstream.ok) {
    const err = new Error("upstream");
    err.status = upstream.status;
    throw err;
  }
  return upstream.json();
}

async function fetchUsdaFood(fdcId) {
  return usdaFetch(`/food/${encodeURIComponent(fdcId)}`);
}

function usdaFoodToScanResult(food, servingGrams = 100) {
  const fdcId = String(food.fdcId || "").trim();
  const productName = String(food.description || "").trim();
  if (!fdcId || !productName) return null;

  const result = {
    source: "usda",
    fdcId,
    productName,
    servingSize: String(servingGrams),
    servings: 1,
    nutrition: extractUsdaNutrition(food.foodNutrients, servingGrams),
  };

  if (food.foodCategory) result.foodCategory = food.foodCategory;
  if (food.dataType) result.dataType = food.dataType;

  return result;
}

module.exports = {
  GENERIC_DATA_TYPES,
  getUsdaApiKey,
  extractUsdaNutrition,
  searchUsdaFoods,
  fetchUsdaFood,
  usdaFoodToScanResult,
};
