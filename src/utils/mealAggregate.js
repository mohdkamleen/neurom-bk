const MealLog = require("../models/MealLog");

/**
 * @param {string} userId
 * @param {string} dateYmd - "YYYY-MM-DD" (UTC day bounds)
 * @param {number} [calorieGoal]
 */
async function sumMealsForDay(userId, dateYmd, calorieGoal = 2200) {
  const start = new Date(`${dateYmd}T00:00:00.000Z`);
  const end = new Date(`${dateYmd}T23:59:59.999Z`);

  const meals = await MealLog.find({
    user: userId,
    consumedAt: { $gte: start, $lte: end },
  }).lean();

  const totals = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    sugarG: 0,
    fiberG: 0,
  };

  for (const m of meals) {
    for (const it of m.items || []) {
      const s =
        it.servings != null && !Number.isNaN(Number(it.servings))
          ? Number(it.servings)
          : 1;
      totals.calories += (Number(it.calories) || 0) * s;
      totals.proteinG += (Number(it.proteinG) || 0) * s;
      totals.carbsG += (Number(it.carbsG) || 0) * s;
      totals.fatG += (Number(it.fatG) || 0) * s;
      totals.sugarG += (Number(it.sugarG) || 0) * s;
      totals.fiberG += (Number(it.fiberG) || 0) * s;
    }
  }

  const calFromP = totals.proteinG * 4;
  const calFromC = totals.carbsG * 4;
  const calFromF = totals.fatG * 9;
  const denom = calFromP + calFromC + calFromF || 1;

  const percentages = {
    protein: Math.round((10000 * calFromP) / denom) / 100,
    carbs: Math.round((10000 * calFromC) / denom) / 100,
    fat: Math.round((10000 * calFromF) / denom) / 100,
  };

  const consumed = Math.round(totals.calories);
  const goal = Math.round(Number(calorieGoal) || 2200);

  return {
    date: dateYmd,
    totals: {
      calories: consumed,
      proteinG: Math.round(totals.proteinG * 100) / 100,
      carbsG: Math.round(totals.carbsG * 100) / 100,
      fatG: Math.round(totals.fatG * 100) / 100,
      sugarG: Math.round(totals.sugarG * 100) / 100,
      fiberG: Math.round(totals.fiberG * 100) / 100,
    },
    percentages,
    calories: { consumed, goal, remaining: Math.max(0, goal - consumed) },
    mealsCount: meals.length,
  };
}

module.exports = { sumMealsForDay };
