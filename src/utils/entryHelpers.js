const { MEAL_TYPES } = require("../models/MealLog");

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
  return {
    calories: Number(nutrition.calories) || 0,
    carbsG: Number(nutrition.carbs ?? nutrition.carbsG) || 0,
    fatG: Number(nutrition.fat ?? nutrition.fatG) || 0,
    proteinG: Number(nutrition.protein ?? nutrition.proteinG) || 0,
    sugarG: Number(nutrition.sugar ?? nutrition.sugarG) || 0,
    fiberG: Number(nutrition.fiber ?? nutrition.fiberG) || 0,
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
  return {
    calories: item.calories ?? 0,
    carbs: item.carbsG ?? 0,
    fat: item.fatG ?? 0,
    protein: item.proteinG ?? 0,
    sugar: item.sugarG ?? 0,
    fiber: item.fiberG ?? 0,
  };
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

  if (query.date) {
    const day = new Date(query.date);
    if (!Number.isNaN(day.getTime())) {
      from = new Date(day);
      from.setHours(0, 0, 0, 0);
      to = new Date(day);
      to.setHours(23, 59, 59, 999);
    }
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
  parseTimestamp,
  parseServingAmount,
  mapNutrition,
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
