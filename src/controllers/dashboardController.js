const { buildHomeDashboard } = require("../services/dashboardService");

exports.home = async (req, res) => {
  try {
    const range = ["7d", "14d", "30d"].includes(req.query.glucoseRange)
      ? req.query.glucoseRange
      : "7d";

    const payload = await buildHomeDashboard(req.user.id, range);
    if (!payload) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      ...payload,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
