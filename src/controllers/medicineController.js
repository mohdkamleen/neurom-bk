const MedicineLog = require("../models/MedicineLog");

exports.create = async (req, res) => {
  try {
    const { name, dosageValue, dosageUnit, form, quantity, takenAt, barcode } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const at = takenAt ? new Date(takenAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid takenAt" });
    }

    const doc = await MedicineLog.create({
      user: req.user.id,
      name: name.trim(),
      dosageValue,
      dosageUnit: dosageUnit || "mg",
      form,
      quantity: quantity != null ? Number(quantity) : 1,
      takenAt: at,
      barcode,
    });

    return res.status(201).json({
      success: true,
      message: "Medicine log saved",
      medicine: doc,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.list = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const q = { user: req.user.id };
    if (from && !Number.isNaN(from.getTime())) q.takenAt = { $gte: from };
    if (to && !Number.isNaN(to.getTime())) {
      q.takenAt = q.takenAt || {};
      q.takenAt.$lte = to;
    }

    const logs = await MedicineLog.find(q).sort({ takenAt: -1 }).limit(200).lean();
    return res.json({ success: true, medicines: logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
