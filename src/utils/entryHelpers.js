const { MEAL_TYPES } = require("../models/MealLog");

/** Frontend-shaped nutrition keys we persist on meal items. */
const NUTRITION_KEYS = [
  "calories",
  "carbs",
  "fat",
  "protein",
  "sugar",
  "fiber",
  "water",
  "saturatedFat",
  "monounsaturatedFat",
  "polyunsaturatedFat",
  "transFat",
  "cholesterol",
  "salt",
  "sodium",
  "potassium",
  "calcium",
  "iron",
  "magnesium",
  "phosphorus",
  "zinc",
  "copper",
  "manganese",
  "selenium",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "thiamin",
  "riboflavin",
  "niacin",
  "vitaminB6",
  "folate",
  "vitaminB12",
  "choline",
  "caffeine",
  "sucrose",
  "glucose",
  "fructose",
];

/** Aliases from request / legacy flat fields → frontend keys. */
const NUTRITION_ALIASES = {
  carbsG: "carbs",
  fatG: "fat",
  proteinG: "protein",
  sugarG: "sugar",
  fiberG: "fiber",
  saturatedFatG: "saturatedFat",
  monounsaturatedFatG: "monounsaturatedFat",
  polyunsaturatedFatG: "polyunsaturatedFat",
  transFatG: "transFat",
  cholesterolMg: "cholesterol",
  saltG: "salt",
  sodiumMg: "sodium",
  potassiumMg: "potassium",
  calciumMg: "calcium",
  ironMg: "iron",
  magnesiumMg: "magnesium",
  phosphorusMg: "phosphorus",
  zincMg: "zinc",
  copperMg: "copper",
  manganeseMg: "manganese",
  seleniumMcg: "selenium",
  vitaminAMcg: "vitaminA",
  vitaminCMg: "vitaminC",
  vitaminDMcg: "vitaminD",
  vitaminEMg: "vitaminE",
  vitaminKMcg: "vitaminK",
  thiaminMg: "thiamin",
  riboflavinMg: "riboflavin",
  niacinMg: "niacin",
  vitaminB6Mg: "vitaminB6",
  folateMcg: "folate",
  vitaminB12Mcg: "vitaminB12",
  cholineMg: "choline",
  caffeineMg: "caffeine",
  waterG: "water",
  sucroseG: "sucrose",
  glucoseG: "glucose",
  fructoseG: "fructose",
};

function omitZeroNutrition(nutrition = {}) {
  const out = {};
  for (const [key, value] of Object.entries(nutrition)) {
    if (value == null) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) continue;
    out[key] = n;
  }
  return out;
}

/**
 * Normalize incoming nutrition (frontend map and/or legacy *G/*Mg keys)
 * into the frontend-shaped map used by food APIs.
 */
function normalizeNutritionMap(nutrition = {}) {
  const src =
    nutrition && typeof nutrition === "object" && !Array.isArray(nutrition)
      ? nutrition
      : {};
  const out = {};

  for (const [key, value] of Object.entries(src)) {
    const dest = NUTRITION_ALIASES[key] || key;
    if (!NUTRITION_KEYS.includes(dest)) continue;
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    out[dest] = n;
  }

  return out;
}

function parseTimestamp(value, fallback = new Date()) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseServingAmount(raw) {
  if (raw == null || raw === "") return undefined;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapNutrition(nutrition = {}) {
  const full = normalizeNutritionMap(nutrition);
  return {
    calories: Number(full.calories) || 0,
    carbsG: Number(full.carbs) || 0,
    fatG: Number(full.fat) || 0,
    proteinG: Number(full.protein) || 0,
    sugarG: Number(full.sugar) || 0,
    fiberG: Number(full.fiber) || 0,
    nutrition: omitZeroNutrition(full),
  };
}

function normalizeMealType(raw) {
  const t = String(raw || "Other").trim();
  const match = MEAL_TYPES.find((m) => m.toLowerCase() === t.toLowerCase());
  return match || "Other";
}

function foodToMealItem(food, barcode) {
  const nutrition = mapNutrition(food.nutrition);
  const servingAmount = parseServingAmount(food.servingSize ?? food.servingAmount);

  return {
    foodName: String(food.name || food.foodName).trim(),
    barcode,
    openFoodFactsCode: barcode,
    servingAmount,
    servingUnit: food.servingUnit || "g",
    servings: Number(food.servings) > 0 ? Number(food.servings) : 1,
    ...nutrition,
    mealTiming: food.mealTiming || "unspecified",
  };
}

function groupFoodsIntoMeals(foods, userId) {
  const groups = new Map();

  for (const food of foods) {
    const name = food.name || food.foodName;
    if (!name || !String(name).trim()) continue;

    const mealType = normalizeMealType(food.foodType || food.mealType);
    const consumedAt =
      parseTimestamp(food.consumedAt || food.eatenAt) || new Date();
    const key = `${mealType}|${consumedAt.toISOString()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        user: userId,
        mealType,
        consumedAt,
        items: [],
        notes: food.notes,
      });
    }

    groups.get(key).items.push(
      foodToMealItem({ ...food, name: String(name).trim() }, food.barcode)
    );
  }

  return [...groups.values()];
}

function parseGlucoseValue(raw) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0 || v > 600) return null;
  return v;
}

function itemNutritionToFrontend(item = {}) {
  const fromNested = normalizeNutritionMap(item.nutrition || {});
  const fromFlat = normalizeNutritionMap({
    calories: item.calories,
    carbsG: item.carbsG,
    fatG: item.fatG,
    proteinG: item.proteinG,
    sugarG: item.sugarG,
    fiberG: item.fiberG,
  });

  // Nested map wins for extras; flat macros fill gaps for older documents
  return omitZeroNutrition({ ...fromFlat, ...fromNested });
}

function parseBrandFromNotes(notes) {
  if (!notes || typeof notes !== "string") return undefined;
  const m = notes.match(/^Brand:\s*(.+)$/i);
  return m ? m[1].trim() : undefined;
}

function mealLogToFoods(meal) {
  const mealId = String(meal._id);
  const consumedAt =
    meal.consumedAt instanceof Date
      ? meal.consumedAt.toISOString()
      : meal.consumedAt;
  const source = meal.items?.some((i) => i.barcode) ? "barcode" : "manual";

  return (meal.items || []).map((item) => ({
    id: String(item._id),
    mealId,
    foodType: meal.mealType,
    name: item.foodName,
    servingSize:
      item.servingAmount != null ? String(item.servingAmount) : "",
    servings: item.servings ?? 1,
    nutrition: itemNutritionToFrontend(item),
    consumedAt,
    barcode: item.barcode,
    brand: parseBrandFromNotes(meal.notes),
    source,
  }));
}

function medicineLogToFrontend(med) {
  return {
    id: String(med._id),
    name: med.name,
    dosage: med.dosageValue != null ? String(med.dosageValue) : "",
    dosageUnit: med.dosageUnit || "mg",
    form: med.form,
    quantity: med.quantity ?? 1,
    takenAt:
      med.takenAt instanceof Date ? med.takenAt.toISOString() : med.takenAt,
    barcode: med.barcode,
    source: med.barcode ? "barcode" : "manual",
  };
}

function glucoseReadingToFrontend(reading, status) {
  return {
    id: String(reading._id),
    valueMgDl: reading.valueMgDl,
    measuredAt:
      reading.measuredAt instanceof Date
        ? reading.measuredAt.toISOString()
        : reading.measuredAt,
    status,
    notes: reading.notes,
    source: "manual",
  };
}

function mealLogToBarcodeEntry(meal) {
  const item = (meal.items || [])[0];
  if (!item) return null;

  return {
    id: String(meal._id),
    barcode: item.barcode,
    productName: item.foodName,
    brand: parseBrandFromNotes(meal.notes),
    category: "food",
    eatenAt:
      meal.consumedAt instanceof Date
        ? meal.consumedAt.toISOString()
        : meal.consumedAt,
    foodType: meal.mealType,
    servingSize:
      item.servingAmount != null ? String(item.servingAmount) : undefined,
    servings: item.servings ?? 1,
    nutrition: itemNutritionToFrontend(item),
  };
}

function medicineLogToBarcodeEntry(med) {
  return {
    id: String(med._id),
    barcode: med.barcode,
    productName: med.name,
    brand: undefined,
    category: "medicine",
    eatenAt:
      med.takenAt instanceof Date ? med.takenAt.toISOString() : med.takenAt,
    medicine: {
      medicineName: med.name,
      dosage: med.dosageValue ?? 0,
      dosageUnit: med.dosageUnit || "mg",
      form: med.form,
      quantity: med.quantity ?? 1,
    },
  };
}

function parseDateRange(query = {}) {
  const now = new Date();
  let from = query.from ? new Date(query.from) : null;
  let to = query.to ? new Date(query.to) : null;

  if (
    from &&
    to &&
    !Number.isNaN(from.getTime()) &&
    !Number.isNaN(to.getTime())
  ) {
    return { from, to };
  }

  const dateYmd = query.date ? String(query.date).trim() : "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    return {
      from: new Date(`${dateYmd}T00:00:00.000Z`),
      to: new Date(`${dateYmd}T23:59:59.999Z`),
    };
  }

  if (!from || Number.isNaN(from.getTime())) {
    from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }
  if (!to || Number.isNaN(to.getTime())) {
    to = now;
  }

  return { from, to };
}

module.exports = {
  NUTRITION_KEYS,
  parseTimestamp,
  parseServingAmount,
  mapNutrition,
  normalizeNutritionMap,
  omitZeroNutrition,
  normalizeMealType,
  foodToMealItem,
  groupFoodsIntoMeals,
  parseGlucoseValue,
  itemNutritionToFrontend,
  parseBrandFromNotes,
  mealLogToFoods,
  medicineLogToFrontend,
  glucoseReadingToFrontend,
  mealLogToBarcodeEntry,
  medicineLogToBarcodeEntry,
  parseDateRange,
};
