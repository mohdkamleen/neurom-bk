const User = require("../models/User");

exports.listUsers = async (req, res) => {
  try {
    const q = {};
    if (req.query.status === "blocked") q.isBlocked = true;
    else if (req.query.status === "active") q.isBlocked = false;

    const users = await User.find(q)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, email, phone, role, isBlocked } = req.body;

    if (name !== undefined) u.name = name;
    if (phone !== undefined) u.phone = phone;
    if (email !== undefined) u.email = String(email).toLowerCase().trim();
    if (role !== undefined) {
      if (["user", "admin"].includes(role)) u.role = role;
    }
    if (typeof isBlocked === "boolean") u.isBlocked = isBlocked;

    await u.save();
    const fresh = await User.findById(u._id).select("-password").lean();
    return res.json({ success: true, user: fresh });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteAllUsers = async (req, res) => {
  try {
    const result = await User.deleteMany({});
    return res.json({
      success: true,
      message: "All users deleted",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
