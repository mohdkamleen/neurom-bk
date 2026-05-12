const mongoose = require("mongoose");
const ChatThread = require("../models/ChatThread");
const Message = require("../models/Message");
const User = require("../models/User");

exports.listThreads = async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id);
    const threads = await ChatThread.find({ participants: uid })
      .sort({ lastMessageAt: -1 })
      .limit(80)
      .lean();
    return res.json({ success: true, threads });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createDirectThread = async (req, res) => {
  try {
    const { peerUserId } = req.body;
    if (!peerUserId || String(peerUserId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: "peerUserId required and must differ from you" });
    }

    const peer = await User.findById(peerUserId).select("_id").lean();
    if (!peer) {
      return res.status(404).json({ success: false, message: "Peer user not found" });
    }

    const a = new mongoose.Types.ObjectId(req.user.id);
    const b = new mongoose.Types.ObjectId(peerUserId);

    let thread = await ChatThread.findOne({
      participants: { $all: [a, b], $size: 2 },
    });

    if (!thread) {
      thread = await ChatThread.create({
        participants: [a, b],
        subject: "Chat",
      });
    }

    return res.json({ success: true, thread });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const thread = await ChatThread.findById(req.params.threadId).lean();
    if (!thread || !thread.participants.some((p) => String(p) === String(req.user.id))) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const messages = await Message.find({ thread: thread._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const text = req.body.body != null ? String(req.body.body).trim() : "";
    if (!text) {
      return res.status(400).json({ success: false, message: "body is required" });
    }

    const thread = await ChatThread.findById(req.params.threadId);
    if (!thread || !thread.participants.some((p) => String(p) === String(req.user.id))) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    const msg = await Message.create({
      thread: thread._id,
      sender: req.user.id,
      body: text,
    });

    thread.lastMessageAt = new Date();
    thread.lastMessagePreview = text.slice(0, 160);
    await thread.save();

    return res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
