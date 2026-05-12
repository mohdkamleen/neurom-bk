const GlucoseReading = require("../models/GlucoseReading");
const MealLog = require("../models/MealLog");

exports.run = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const e = endDate ? new Date(endDate) : new Date();
    const s = startDate ? new Date(startDate) : new Date(e.getTime() - 7 * 86400000);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate / endDate",
      });
    }

    const readings = await GlucoseReading.find({
      user: req.user.id,
      measuredAt: { $gte: s, $lte: e },
    })
      .sort({ measuredAt: 1 })
      .lean();

    const meals = await MealLog.find({
      user: req.user.id,
      consumedAt: { $gte: s, $lte: e },
    }).lean();

    let totalCarbs = 0;
    for (const m of meals) {
      for (const it of m.items || []) {
        const sv =
          it.servings != null && !Number.isNaN(Number(it.servings))
            ? Number(it.servings)
            : 1;
        totalCarbs += (Number(it.carbsG) || 0) * sv;
      }
    }

    const last = readings.length ? readings[readings.length - 1].valueMgDl : 110;
    const bump = Math.min(55, 8 + totalCarbs * 0.22);

    return res.json({
      success: true,
      disclaimer:
        "Educational estimate only — not medical advice. Wire your ML model to replace this heuristic.",
      range: { startDate: s.toISOString(), endDate: e.toISOString() },
      inputs: {
        glucoseReadingsInRange: readings.length,
        mealsInRange: meals.length,
        totalCarbsFromLogsApprox: Math.round(totalCarbs * 10) / 10,
      },
      estimate: {
        baselineMgDl: last,
        predicted1hMgDl: Math.round(last + bump * 0.42),
        predicted2hMgDl: Math.round(Math.max(70, last + bump * 0.18 - 6)),
        status:
          last >= 70 && last <= 180 ? "In Range" : last < 70 ? "Low" : "High",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
