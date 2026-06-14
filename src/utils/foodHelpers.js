const { nutritionToFrontend, nutrientsForGrams } = require("./offHelpers");
const { extractUsdaNutrition } = require("./usdaHelpers");

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
    foods,
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
  };
}

module.exports = {
  tagOffFood,
  buildFoodSearchResponse,
  nutritionToFrontend,
  nutrientsForGrams,
  nutrientsForGramsFromUsda,
};
