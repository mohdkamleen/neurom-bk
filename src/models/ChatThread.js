const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    subject: { type: String, default: "Chat" },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
  },
  { timestamps: true }
);

chatThreadSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model("ChatThread", chatThreadSchema);
