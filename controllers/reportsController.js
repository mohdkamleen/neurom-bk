const mongoose = require("mongoose");
const MealLog = require("../models/MealLog");
const User = require("../models/User");
const { sumMealsForDay } = require("../utils/mealAggregate");

exports.dietChart = async (req, res) => {
  try {
    const dateYmd =
      typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().slice(0, 10);

    const user = await User.findById(req.user.id).select("calorieGoal").lean();
    const goal = user?.calorieGoal ?? 2200;

    const diet = await sumMealsForDay(req.user.id, dateYmd, goal);
    return res.json({ success: true, dietChart: diet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.topFoods = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const from = new Date();
    from.setDate(from.getDate() - days);

    const rows = await MealLog.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id), consumedAt: { $gte: from } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $toLower: "$items.foodName" },
          count: { $sum: 1 },
          label: { $first: "$items.foodName" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    return res.json({
      success: true,
      days,
      foods: rows.map((r) => ({ foodName: r.label, count: r.count })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
