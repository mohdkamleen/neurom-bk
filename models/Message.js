const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

messageSchema.index({ thread: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
