const mongoose = require("mongoose");

const checkupReminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    catalogKey: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: [
        null,
        "one_time",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "every_3_months",
        "every_6_months",
        "yearly",
      ],
      default: null,
    },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    repeatEveryHours: { type: Number, default: null },
    snoozeMinutes: { type: Number, default: null },
    snoozeTimes: { type: Number, default: null },
    weekday: { type: Number, default: null },
    monthDay: { type: Number, default: null },
    remindOn: { type: String, default: null },
  },
  { timestamps: true }
);

checkupReminderSchema.index(
  { user: 1, catalogKey: 1 },
  { unique: true, partialFilterExpression: { catalogKey: { $type: "string" } } }
);

module.exports = mongoose.model("CheckupReminder", checkupReminderSchema);
