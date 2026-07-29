/** Display labels used by neurom-native-fr (GlucoseCard, home). */
function glucoseDisplayStatus(valueMgDl, low = 70, high = 180) {
  const v = Number(valueMgDl);
  if (!Number.isFinite(v)) return "No data";
  if (v < low) return "Low";
  if (v > high + 20) return "High";
  if (v > high) return "Slightly High";
  return "In Range";
}

module.exports = { glucoseDisplayStatus };
