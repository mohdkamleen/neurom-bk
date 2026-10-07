const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    pushNotifications: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: false },
    healthInsightAlerts: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);
