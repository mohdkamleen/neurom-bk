const GlucoseReading = require("../models/GlucoseReading");
const User = require("../models/User");
const { glucoseHistoryWindow } = require("../utils/dateRange");
const { glucoseDisplayStatus } = require("../utils/glucoseDisplay");

function statusForValue(value, low, high) {
  return glucoseDisplayStatus(value, low, high);
}

exports.list = async (req, res) => {
  try {
    const range = ["7d", "14d", "30d"].includes(req.query.range) ? req.query.range : "7d";
    const { from, to } = glucoseHistoryWindow(range);

    const readings = await GlucoseReading.find({
      user: req.user.id,
      measuredAt: { $gte: from, $lte: to },
    })
      .sort({ measuredAt: 1 })
      .lean();

    const user = await User.findById(req.user.id)
      .select("glucoseTargetLow glucoseTargetHigh")
      .lean();
    const low = user?.glucoseTargetLow ?? 70;
    const high = user?.glucoseTargetHigh ?? 180;

    const withStatus = readings.map((r) => ({
      ...r,
      status: statusForValue(r.valueMgDl, low, high),
    }));

    const latest = withStatus.length ? withStatus[withStatus.length - 1] : null;

    return res.json({
      success: true,
      range,
      from,
      to,
      latest,
      readings: withStatus,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const { valueMgDl, measuredAt, notes } = req.body;
    const v = Number(valueMgDl);
    if (!Number.isFinite(v) || v <= 0 || v > 600) {
      return res.status(400).json({
        success: false,
        message: "valueMgDl must be a number between 1 and 600",
      });
    }

    const doc = await GlucoseReading.create({
      user: req.user.id,
      valueMgDl: v,
      measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
      notes,
    });

    const user = await User.findById(req.user.id)
      .select("glucoseTargetLow glucoseTargetHigh")
      .lean();
    const low = user?.glucoseTargetLow ?? 70;
    const high = user?.glucoseTargetHigh ?? 180;

    return res.status(201).json({
      success: true,
      reading: {
        ...doc.toObject(),
        status: statusForValue(v, low, high),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await GlucoseReading.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!r) {
      return res.status(404).json({ success: false, message: "Reading not found" });
    }
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
