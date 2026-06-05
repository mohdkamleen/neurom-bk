const GlucoseReading = require("../models/GlucoseReading");
const MealLog = require("../models/MealLog");
const User = require("../models/User");
const { glucoseDisplayStatus } = require("../utils/glucoseDisplay");

/**
 * Manual entry screen: optional meal text + portion + glucose (mg/dL).
 */
exports.manual = async (req, res) => {
  try {
    const { meal, portion, glucoseMgDl, valueMgDl, consumedAt, notes } = req.body || {};
    const glucoseRaw = glucoseMgDl ?? valueMgDl;
    const hasMeal = meal != null && String(meal).trim().length > 0;
    const hasGlucose = glucoseRaw != null && String(glucoseRaw).trim() !== "";

    if (!hasMeal && !hasGlucose) {
      return res.status(400).json({
        success: false,
        message: "Provide at least a meal description or glucose value",
      });
    }

    const at = consumedAt ? new Date(consumedAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid consumedAt" });
    }

    const result = { success: true, message: "Saved successfully" };

    if (hasMeal) {
      const portionText = portion != null ? String(portion).trim() : "";
      const mealDoc = await MealLog.create({
        user: req.user.id,
        mealType: "Other",
        consumedAt: at,
        items: [
          {
            foodName: String(meal).trim(),
            servingAmount: portionText ? 1 : undefined,
            servingUnit: portionText || "portion",
            servings: 1,
            mealTiming: "unspecified",
          },
        ],
        notes: portionText ? `Portion: ${portionText}` : notes,
      });
      result.meal = mealDoc;
    }

    if (hasGlucose) {
      const v = Number(glucoseRaw);
      if (!Number.isFinite(v) || v <= 0 || v > 600) {
        return res.status(400).json({
          success: false,
          message: "glucoseMgDl must be between 1 and 600",
        });
      }

      const user = await User.findById(req.user.id)
        .select("glucoseTargetLow glucoseTargetHigh")
        .lean();
      const low = user?.glucoseTargetLow ?? 70;
      const high = user?.glucoseTargetHigh ?? 180;

      const reading = await GlucoseReading.create({
        user: req.user.id,
        valueMgDl: v,
        measuredAt: at,
        notes,
      });

      result.reading = {
        ...reading.toObject(),
        status: glucoseDisplayStatus(v, low, high),
      };
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
