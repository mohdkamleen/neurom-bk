const { computePrediction } = require("../utils/predictionEngine");

exports.run = async (req, res) => {
  try {
    const { startDate, endDate } = req.body || {};
    const result = await computePrediction(req.user.id, startDate, endDate);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.json({
      success: true,
      disclaimer: result.summary.disclaimer,
      range: result.range,
      inputs: result.inputs,
      estimate: result.estimate,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** Full payload for neurom-native-fr PredictionSummaryScreen. */
exports.summary = async (req, res) => {
  try {
    const startDate = req.body?.startDate ?? req.query?.startDate;
    const endDate = req.body?.endDate ?? req.query?.endDate;
    const result = await computePrediction(req.user.id, startDate, endDate);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.json({
      success: true,
      ...result.summary,
      range: result.range,
      inputs: result.inputs,
      estimate: result.estimate,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
