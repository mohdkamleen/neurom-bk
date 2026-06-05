const SEGMENT_COLORS = {
  Protein: "#66BB6A",
  Fat: "#4285F4",
  Fiber: "#FFA726",
  Carbs: "#26C6DA",
  Cal: "#EF9A9A",
  Sugar: "#9575CD",
};

/** Shape expected by neurom-native-fr DietChart. Returns null when no meals logged. */
function buildDietSegments(dietSummary) {
  const t = dietSummary?.totals || {};
  const p = dietSummary?.percentages || {};
  const cal = Number(t.calories) || 0;

  // No meals logged today — return null so the frontend shows "No data"
  if (!cal && !Number(t.proteinG) && !Number(t.carbsG) && !Number(t.fatG)) {
    return null;
  }

  const rows = [
    { label: "Protein", amount: Number(t.proteinG) || 0, percent: p.protein ?? 0 },
    { label: "Fat",     amount: Number(t.fatG)     || 0, percent: p.fat     ?? 0 },
    { label: "Fiber",   amount: Number(t.fiberG)   || 0, percent: 0 },
    { label: "Carbs",   amount: Number(t.carbsG)   || 0, percent: p.carbs   ?? 0 },
    { label: "Cal",     amount: cal,                      percent: 0 },
    { label: "Sugar",   amount: Number(t.sugarG)   || 0, percent: 0 },
  ];

  const macroSum =
    rows[0].amount * 4 + rows[3].amount * 4 + rows[1].amount * 9 || 1;

  return rows.map((row) => {
    let percent = row.percent;
    if (row.label === "Fiber" || row.label === "Sugar") {
      percent = macroSum > 0 ? Math.round((row.amount / macroSum) * 1000) / 10 : 0;
    }
    if (row.label === "Cal" && cal > 0) {
      percent = 100;
    }
    return {
      label: row.label,
      amount: Math.round(row.amount * 100) / 100,
      percent: Math.round(percent * 10) / 10,
      color: SEGMENT_COLORS[row.label] || "#999",
    };
  });
}

module.exports = { buildDietSegments };
