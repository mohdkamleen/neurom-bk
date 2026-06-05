/** @returns {{ from: Date, to: Date }} */
function glucoseHistoryWindow(rangeKey) {
  const to = new Date();
  const from = new Date(to);
  const days = rangeKey === "14d" ? 14 : rangeKey === "30d" ? 30 : 7;
  from.setDate(from.getDate() - days);
  return { from, to };
}

function startOfUtcDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfUtcDay(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

module.exports = { glucoseHistoryWindow, startOfUtcDay, endOfUtcDay };
