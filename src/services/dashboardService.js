const GlucoseReading = require("../models/GlucoseReading");
const User = require("../models/User");
const MealLog = require("../models/MealLog");
const mongoose = require("mongoose");
const { glucoseHistoryWindow, localDateYmd } = require("../utils/dateRange");
const { sumMealsForDay, sumMealsForRange } = require("../utils/mealAggregate");
const { glucoseDisplayStatus } = require("../utils/glucoseDisplay");
const { buildDietSegments } = require("../utils/dietSegments");

function splitFirst(name) {
  if (!name || typeof name !== "string") return "there";
  const p = name.trim().split(/\s+/)[0];
  return p || "there";
}

function dayPeriodGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
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
      modelAccuracyPercent: null,
      modelAccuracyTrend: null,
      note: "Log more glucose readings for estimates.",
    };
  }

  const vals = readings.map((r) => r.valueMgDl);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  const sd = Math.sqrt(variance);
  const cv = avg > 0 ? (sd / avg) * 100 : 0;
  const insulinSensitivityPercent = Math.max(
    55,
    Math.min(100, Math.round(100 - cv * 0.6))
  );
  const a1cEstimatePercent = Math.round(((avg + 46.7) / 28.7) * 10) / 10;
  const modelAccuracyPercent = Math.min(
    95,
    Math.max(72, 80 + Math.floor(readings.length / 5))
  );

  return {
    insulinSensitivityPercent,
    a1cEstimatePercent,
    avgGlucoseMgDl: Math.round(avg),
    modelAccuracyPercent,
    modelAccuracyTrend: modelAccuracyPercent >= 80 ? "Improving" : "Building",
  };
}

async function glucoseCardForRange(userId, range, low, high) {
  const { from, to } = glucoseHistoryWindow(range);
  const readings = await GlucoseReading.find({
    user: userId,
    measuredAt: { $gte: from, $lte: to },
  })
    .select("valueMgDl measuredAt")
    .lean();

  if (!readings.length) {
    return { value: null, status: "No data", unit: "mg/dl" };
  }

  const avg =
    readings.reduce((sum, reading) => sum + reading.valueMgDl, 0) /
    readings.length;
  const value = Math.round(avg);

  return {
    value,
    status: glucoseDisplayStatus(value, low, high),
    unit: "mg/dl",
    measuredAt: readings[readings.length - 1].measuredAt,
    readingCount: readings.length,
  };
}

async function topImpactFoods(userId, days = 7) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const rows = await MealLog.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        consumedAt: { $gte: from },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: { $toLower: "$items.foodName" },
        count: { $sum: 1 },
        label: { $first: "$items.foodName" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 7 },
  ]);

  return rows.map((r) => ({ name: r.label, count: r.count }));
}

async function buildHomeDashboard(userId, glucoseRange = "7d") {
  const range = ["7d", "14d", "30d"].includes(glucoseRange)
    ? glucoseRange
    : "7d";
  const { from, to } = glucoseHistoryWindow(range);

  const user = await User.findById(userId).select("-password").lean();
  if (!user) {
    return null;
  }

  const low = user.glucoseTargetLow ?? 70;
  const high = user.glucoseTargetHigh ?? 180;

  const readings = await GlucoseReading.find({
    user: userId,
    measuredAt: { $gte: from, $lte: to },
  })
    .sort({ measuredAt: 1 })
    .lean();

  const latest = readings.length ? readings[readings.length - 1] : null;
  const latestStatus = latest
    ? statusForValue(latest.valueMgDl, low, high)
    : null;

  const today = localDateYmd();
  const diet = await sumMealsForRange(userId, from, to, user.calorieGoal);
  const insights = await buildInsights(userId);

  const [card7d, card14d, card30d, impactFoods] = await Promise.all([
    glucoseCardForRange(userId, "7d", low, high),
    glucoseCardForRange(userId, "14d", low, high),
    glucoseCardForRange(userId, "30d", low, high),
    topImpactFoods(userId, 7),
  ]);

  const firstName = splitFirst(user.name);
  const period = dayPeriodGreeting();

  return {
    greeting: {
      firstName,
      fullName: user.name,
      period,
      hi: `Hi ${firstName} 👋`,
      line: period,
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
    glucoseCard: {
      "7d": card7d,
      "14d": card14d,
      "30d": card30d,
    },
    dietChart: {
      range,
      from,
      to,
      date: today,
      segments: buildDietSegments(diet),
      summary: diet,
    },
    insights: {
      ...insights,
      avg30DayMgDl: insights.avgGlucoseMgDl,
      footerNote: "Estimate only",
    },
    topImpactFoods: impactFoods,
    onboardingCompleted: !!user.onboardingCompleted,
  };
}

module.exports = {
  buildHomeDashboard,
  splitFirst,
};
