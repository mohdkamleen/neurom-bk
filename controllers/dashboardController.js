const GlucoseReading = require("../models/GlucoseReading");
const User = require("../models/User");
const { glucoseHistoryWindow } = require("../utils/dateRange");
const { sumMealsForDay } = require("../utils/mealAggregate");

function splitFirst(name) {
  if (!name || typeof name !== "string") return "there";
  const p = name.trim().split(/\s+/)[0];
  return p || "there";
}

function dayPeriodGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function statusForValue(value, low, high) {
  if (value < low) return "Low";
  if (value > high) return "High";
  return "In Range";
}

async function buildInsights(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const readings = await GlucoseReading.find({
    user: userId,
    measuredAt: { $gte: since },
  })
    .select("valueMgDl")
    .lean();

  if (readings.length < 3) {
    return {
      insulinSensitivityPercent: null,
      a1cEstimatePercent: null,
      avgGlucoseMgDl: null,
      note: "Log more glucose readings for estimates.",
    };
  }

  const vals = readings.map((r) => r.valueMgDl);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  const sd = Math.sqrt(variance);
  const cv = avg > 0 ? (sd / avg) * 100 : 0;
  const insulinSensitivityPercent = Math.max(55, Math.min(100, Math.round(100 - cv * 0.6)));
  const a1cEstimatePercent = Math.round(((avg + 46.7) / 28.7) * 10) / 10;

  return {
    insulinSensitivityPercent,
    a1cEstimatePercent,
    avgGlucoseMgDl: Math.round(avg),
  };
}

exports.home = async (req, res) => {
  try {
    const range = ["7d", "14d", "30d"].includes(req.query.glucoseRange)
      ? req.query.glucoseRange
      : "7d";
    const { from, to } = glucoseHistoryWindow(range);

    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const low = user.glucoseTargetLow ?? 70;
    const high = user.glucoseTargetHigh ?? 180;

    const readings = await GlucoseReading.find({
      user: req.user.id,
      measuredAt: { $gte: from, $lte: to },
    })
      .sort({ measuredAt: 1 })
      .lean();

    const latest = readings.length ? readings[readings.length - 1] : null;
    const latestStatus = latest ? statusForValue(latest.valueMgDl, low, high) : null;

    const today = new Date().toISOString().slice(0, 10);
    const diet = await sumMealsForDay(req.user.id, today, user.calorieGoal);
    const insights = await buildInsights(req.user.id);

    return res.json({
      success: true,
      greeting: {
        firstName: splitFirst(user.name),
        fullName: user.name,
        period: dayPeriodGreeting(),
      },
      glucose: {
        latest: latest
          ? { ...latest, status: statusForValue(latest.valueMgDl, low, high) }
          : null,
        latestStatus,
        range,
        from,
        to,
        series: readings.map((r) => ({
          ...r,
          status: statusForValue(r.valueMgDl, low, high),
        })),
        targets: { low, high },
      },
      dietChart: diet,
      insights,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
