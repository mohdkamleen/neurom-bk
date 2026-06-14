/**
 * USDA FoodData Central helpers — generic / non-packaged foods.
 * Docs: https://fdc.nal.usda.gov/api-guide
 */

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const GENERIC_DATA_TYPES = ["Foundation", "SR Legacy"];

const NUTRIENT = {
  ENERGY_KCAL: 1008,
  ENERGY_KJ: 1062,
  ENERGY_ATWATER_GENERAL: 2047,
  ENERGY_ATWATER_SPECIFIC: 2048,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
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

/** USDA values are per 100g for Foundation / SR Legacy. */
function extractUsdaNutrition(foodNutrients, servingGrams = 100) {
  const scale = servingGrams / 100;

  let calories =
    getNutrientValue(foodNutrients, NUTRIENT.ENERGY_KCAL) ??
    getNutrientValue(foodNutrients, NUTRIENT.ENERGY_ATWATER_GENERAL) ??
    getNutrientValue(foodNutrients, NUTRIENT.ENERGY_ATWATER_SPECIFIC);

  if (calories == null) {
    const kj = getNutrientValue(foodNutrients, NUTRIENT.ENERGY_KJ);
    if (kj != null) calories = kj / 4.184;
  }

  const protein = getNutrientValue(foodNutrients, NUTRIENT.PROTEIN) ?? 0;
  const fat = getNutrientValue(foodNutrients, NUTRIENT.FAT) ?? 0;
  const carbs = getNutrientValue(foodNutrients, NUTRIENT.CARBS) ?? 0;
  const fiber = getNutrientValue(foodNutrients, NUTRIENT.FIBER) ?? 0;
  const sugar = getNutrientValue(foodNutrients, NUTRIENT.SUGAR) ?? 0;

  if (calories == null) {
    calories = protein * 4 + carbs * 4 + fat * 9;
  }

  const round2 = (n) => Math.round(n * scale * 100) / 100;
  const roundCal = (n) => Math.round(n * scale);

  return {
    calories: roundCal(calories),
    carbs: round2(carbs),
    fat: round2(fat),
    protein: round2(protein),
    sugar: round2(sugar),
    fiber: round2(fiber),
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
