const GlucoseReading = require("../models/GlucoseReading");
const MealLog = require("../models/MealLog");

function formatTimeLabel(date) {
  const d = new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildTrendPoints(baseline, peak, start = new Date()) {
  const offsetsMin = [0, 15, 30, 45, 60, 75, 90, 105];
  const values = [
    baseline,
    baseline + (peak - baseline) * 0.15,
    baseline + (peak - baseline) * 0.35,
    baseline + (peak - baseline) * 0.55,
    baseline + (peak - baseline) * 0.75,
    baseline + (peak - baseline) * 0.92,
    peak,
    peak - (peak - baseline) * 0.12,
  ];

  return offsetsMin.map((min, i) => {
    const t = new Date(start.getTime() + min * 60000);
    return {
      time: formatTimeLabel(t),
      value: Math.round(Math.max(70, values[i])),
    };
  });
}

function buildFactors(totalCarbs, mealsCount, hour) {
  const factors = [];

  if (totalCarbs > 45) {
    factors.push({
      label: "High net carbs",
      icon: "cube-outline",
      color: "#EF4444",
      barWidth: 0.92,
      impact: "+18",
    });
  } else if (totalCarbs > 25) {
    factors.push({
      label: "Moderate carbs",
      icon: "cube-outline",
      color: "#F97316",
      barWidth: 0.65,
      impact: "+10",
    });
  }

  if (hour >= 20 || hour <= 6) {
    factors.push({
      label: "Late meal time",
      icon: "clock-outline",
      color: "#EAB308",
      barWidth: 0.48,
      impact: "+6",
    });
  }

  if (mealsCount < 2) {
    factors.push({
      label: "Limited meal history",
      icon: "food",
      color: "#EAB308",
      barWidth: 0.4,
      impact: "+5",
    });
  }

  factors.push({
    label: "Medication timing",
    icon: "pill",
    color: "#22C55E",
    barWidth: 0.32,
    impact: "+3",
  });

  return factors.length
    ? factors
    : [
        {
          label: "Stable inputs",
          icon: "check-circle-outline",
          color: "#22C55E",
          barWidth: 0.35,
          impact: "+0",
        },
      ];
}

const LOWER_RISK_TIPS = [
  "Reduce portion size or split the meal to lower the peak.",
  "Add fiber (vegetables/whole grains) to slow absorption.",
  "Take a 10–15 minute walk within an hour after eating.",
  "Log medication timing so predictions stay accurate.",
  "Avoid late meals when possible; shift earlier by 30–60 minutes.",
  "Use notes to capture stress or sleep changes that affect glucose.",
];

async function computePrediction(userId, startDate, endDate) {
  const e = endDate ? new Date(endDate) : new Date();
  const s = startDate ? new Date(startDate) : new Date(e.getTime() - 7 * 86400000);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
    return { error: "Invalid startDate / endDate" };
  }

  const readings = await GlucoseReading.find({
    user: userId,
    measuredAt: { $gte: s, $lte: e },
  })
    .sort({ measuredAt: 1 })
    .lean();

  const meals = await MealLog.find({
    user: userId,
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
  const peak = Math.round(last + bump);
  const low = Math.round(last + bump * 0.35);
  const high = Math.round(peak + 8);
  const accuracy = Math.min(
    95,
    Math.max(55, 72 + readings.length * 2 + meals.length * 3)
  );

  const hour = e.getHours();

  return {
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
      peakMgDl: peak,
      status: last >= 70 && last <= 180 ? "In Range" : last < 70 ? "Low" : "High",
    },
    summary: {
      likelyGlucoseRange: `${low}–${high} mg/dL`,
      modelAccuracyPercent: accuracy,
      modelAccuracyTrend: accuracy >= 80 ? "Improving" : "Building",
      glucosePredictions: buildTrendPoints(last, peak, e),
      predictionFactors: buildFactors(totalCarbs, meals.length, hour),
      lowerRiskTips: LOWER_RISK_TIPS,
      disclaimer:
        "Educational estimate only — not medical advice. Wire your ML model to replace this heuristic.",
    },
  };
}

module.exports = { computePrediction, LOWER_RISK_TIPS };
