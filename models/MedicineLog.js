const mongoose = require("mongoose");

const medicineLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    dosageValue: { type: Number },
    dosageUnit: { type: String, default: "mg" },
    form: { type: String },
    quantity: { type: Number, default: 1 },
    takenAt: { type: Date, required: true, index: true },
    barcode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicineLog", medicineLogSchema);
