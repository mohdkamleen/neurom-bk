const MealLog = require("../models/MealLog");
const { MEAL_TYPES } = require("../models/MealLog");

exports.create = async (req, res) => {
  try {
    const { mealType, consumedAt, items, notes } = req.body;

    if (!MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: `mealType must be one of: ${MEAL_TYPES.join(", ")}`,
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items must be a non-empty array",
      });
    }

    const at = consumedAt ? new Date(consumedAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid consumedAt" });
    }

    const meal = await MealLog.create({
      user: req.user.id,
      mealType,
      consumedAt: at,
      items,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Saved successfully",
      meal,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.list = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const q = { user: req.user.id };
    if (from && !Number.isNaN(from.getTime())) q.consumedAt = { $gte: from };
    if (to && !Number.isNaN(to.getTime())) {
      q.consumedAt = q.consumedAt || {};
      q.consumedAt.$lte = to;
    }

    const meals = await MealLog.find(q).sort({ consumedAt: -1 }).limit(200).lean();
    return res.json({ success: true, meals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const meal = await MealLog.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!meal) {
      return res.status(404).json({ success: false, message: "Meal not found" });
    }
    return res.json({ success: true, meal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
