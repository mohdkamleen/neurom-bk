const { nutritionToFrontend, nutrientsForGrams } = require("./offHelpers");
const { extractUsdaNutrition } = require("./usdaHelpers");

/** Drop nutrients with value 0 / null / undefined from API responses. */
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

function withCleanNutrition(food) {
  if (!food) return food;
  return {
    ...food,
    nutrition: omitZeroNutrition(food.nutrition),
  };
}

function tagOffFood(food) {
  return { source: "openfoodfacts", ...food };
}

function buildFoodSearchResponse({ query, page, pageSize, foods, count, sources, fromCache }) {
  const payload = {
    success: true,
    query,
    page,
    pageSize,
    count: count ?? foods.length,
    foods: (foods || []).map(withCleanNutrition),
    fromCache: Boolean(fromCache),
  };

  if (sources) payload.sources = sources;
  return payload;
}

function nutrientsForGramsFromUsda(foodNutrients, grams) {
  const nutrition = extractUsdaNutrition(foodNutrients, grams);
  return {
    grams,
    calories: nutrition.calories,
    carbsG: nutrition.carbs,
    fatG: nutrition.fat,
    proteinG: nutrition.protein,
    sugarG: nutrition.sugar,
    fiberG: nutrition.fiber,
    saturatedFatG: nutrition.saturatedFat,
    monounsaturatedFatG: nutrition.monounsaturatedFat,
    polyunsaturatedFatG: nutrition.polyunsaturatedFat,
    transFatG: nutrition.transFat,
    cholesterolMg: nutrition.cholesterol,
    sodiumMg: nutrition.sodium,
    potassiumMg: nutrition.potassium,
    calciumMg: nutrition.calcium,
    ironMg: nutrition.iron,
    magnesiumMg: nutrition.magnesium,
    phosphorusMg: nutrition.phosphorus,
    zincMg: nutrition.zinc,
    copperMg: nutrition.copper,
    manganeseMg: nutrition.manganese,
    seleniumMcg: nutrition.selenium,
    vitaminAMcg: nutrition.vitaminA,
    vitaminCMg: nutrition.vitaminC,
    vitaminDMcg: nutrition.vitaminD,
    vitaminEMg: nutrition.vitaminE,
    vitaminKMcg: nutrition.vitaminK,
    thiaminMg: nutrition.thiamin,
    riboflavinMg: nutrition.riboflavin,
    niacinMg: nutrition.niacin,
    vitaminB6Mg: nutrition.vitaminB6,
    folateMcg: nutrition.folate,
    vitaminB12Mcg: nutrition.vitaminB12,
    cholineMg: nutrition.choline,
    caffeineMg: nutrition.caffeine,
    waterG: nutrition.water,
    sucroseG: nutrition.sucrose,
    glucoseG: nutrition.glucose,
    fructoseG: nutrition.fructose,
  };
}

module.exports = {
  tagOffFood,
  buildFoodSearchResponse,
  omitZeroNutrition,
  withCleanNutrition,
  nutritionToFrontend,
  nutrientsForGrams,
  nutrientsForGramsFromUsda,
};
