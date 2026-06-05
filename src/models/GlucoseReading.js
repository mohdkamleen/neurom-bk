const mongoose = require("mongoose");

const glucoseReadingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    valueMgDl: { type: Number, required: true },
    measuredAt: { type: Date, default: Date.now, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GlucoseReading", glucoseReadingSchema);
