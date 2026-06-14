const mongoose = require("mongoose");
const DataShare = require("../models/DataShare");
const User = require("../models/User");
const {
  buildHomeDashboard,
  splitFirst,
} = require("../services/dashboardService");
const { normalizeEmail, resolveSharedAccess } = require("../utils/sharedAccess");

const VALID_PERMISSIONS = new Set(["view_only", "view_edit"]);

function normalizeEmail(email) {
  return email != null ? String(email).trim().toLowerCase() : "";
}

function normalizePhone(phone, countryCode) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const codeDigits = String(countryCode || "").replace(/\D/g, "");
  if (codeDigits && !digits.startsWith(codeDigits)) {
    return `${codeDigits}${digits}`;
  }

  return digits;
}

async function findUserByContact({ email, phone, countryCode }) {
  const emailNorm = normalizeEmail(email);
  if (emailNorm) {
    const byEmail = await User.findOne({ email: emailNorm }).select(
      "name email phone avatarUrl"
    );
    if (byEmail) {
      return byEmail;
    }
  }

  const phoneNorm = normalizePhone(phone, countryCode);
  if (phoneNorm) {
    const byPhone = await User.findOne({ phone: phoneNorm }).select(
      "name email phone avatarUrl"
    );
    if (byPhone) {
      return byPhone;
    }

    const byPhoneSuffix = await User.findOne({
      phone: { $regex: `${phoneNorm.slice(-10)}$` },
    }).select("name email phone avatarUrl");

    if (byPhoneSuffix) {
      return byPhoneSuffix;
    }
  }

  return null;
}

function mapSharedUser(share, peer) {
  return {
    id: String(share._id),
    userId: peer?._id ? String(peer._id) : undefined,
    name: peer?.name || share.granteeEmail || "User",
    email: peer?.email || share.granteeEmail || "",
    phone: peer?.phone || share.granteePhone || "",
    avatar: peer?.avatarUrl || "",
    permission: share.permission,
  };
}

exports.listUsers = async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id);

    const [sharedByMeRaw, sharedWithMeRaw] = await Promise.all([
      DataShare.find({ owner: uid, status: "active" })
        .populate("grantee", "name email phone avatarUrl")
        .sort({ updatedAt: -1 })
        .lean(),
      DataShare.find({ grantee: uid, status: "active" })
        .populate("owner", "name email phone avatarUrl")
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return res.json({
      success: true,
      sharedByMe: sharedByMeRaw.map((share) =>
        mapSharedUser(share, share.grantee)
      ),
      sharedWithMe: sharedWithMeRaw.map((share) => ({
        ...mapSharedUser(share, share.owner),
        ownerId: share.owner?._id ? String(share.owner._id) : undefined,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.grantAccess = async (req, res) => {
  try {
    const { email, phone, countryCode, permission } = req.body;

    if (!VALID_PERMISSIONS.has(permission)) {
      return res.status(400).json({
        success: false,
        message: "Valid permission is required",
      });
    }

    const emailNorm = normalizeEmail(email);
    const phoneNorm = normalizePhone(phone, countryCode);

    if (!emailNorm && !phoneNorm) {
      return res.status(400).json({
        success: false,
        message: "Receiver email or phone is required",
      });
    }

    const grantee = await findUserByContact({ email, phone, countryCode });
    if (!grantee) {
      return res.status(404).json({
        success: false,
        message: "No registered user found with that email or phone",
      });
    }

    if (String(grantee._id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot share with yourself",
      });
    }

    let share = await DataShare.findOne({
      owner: req.user.id,
      grantee: grantee._id,
      status: "active",
    });

    if (share) {
      share.permission = permission;
      share.granteeEmail = grantee.email;
      share.granteePhone = grantee.phone || "";
      share.kind = "grant";
      await share.save();

      return res.json({
        success: true,
        message: "Access updated",
      });
    }

    share = await DataShare.create({
      owner: req.user.id,
      grantee: grantee._id,
      granteeEmail: grantee.email,
      granteePhone: grantee.phone || "",
      permission,
      status: "active",
      kind: "grant",
    });

    return res.status(201).json({
      success: true,
      message: "Access granted",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.requestAccess = async (req, res) => {
  try {
    const { email, phone, countryCode } = req.body;
    const emailNorm = normalizeEmail(email);
    const phoneNorm = normalizePhone(phone, countryCode);

    if (!emailNorm && !phoneNorm) {
      return res.status(400).json({
        success: false,
        message: "Owner email or phone is required",
      });
    }

    const owner = await findUserByContact({ email, phone, countryCode });
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "No registered user found with that email or phone",
      });
    }

    if (String(owner._id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot request access to your own data",
      });
    }

    const existing = await DataShare.findOne({
      owner: owner._id,
      grantee: req.user.id,
      status: { $in: ["active", "pending"] },
    });

    if (existing) {
      return res.json({
        success: true,
        message:
          existing.status === "active"
            ? "You already have access"
            : "Access request already sent",
      });
    }

    await DataShare.create({
      owner: owner._id,
      grantee: req.user.id,
      granteeEmail: owner.email,
      granteePhone: owner.phone || "",
      permission: "view_only",
      status: "pending",
      kind: "request",
    });

    return res.status(201).json({
      success: true,
      message: "Access request sent",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const { permission } = req.body;

    if (!VALID_PERMISSIONS.has(permission)) {
      return res.status(400).json({
        success: false,
        message: "Valid permission is required",
      });
    }

    const share = await DataShare.findById(req.params.id);
    if (!share || share.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Share not found",
      });
    }

    if (String(share.owner) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Only the data owner can change permissions",
      });
    }

    share.permission = permission;
    await share.save();

    return res.json({
      success: true,
      message: "Permission updated",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.revokeAccess = async (req, res) => {
  try {
    const share = await DataShare.findById(req.params.id);
    if (!share || share.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Share not found",
      });
    }

    if (String(share.owner) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Only the data owner can revoke access",
      });
    }

    share.status = "revoked";
    await share.save();

    return res.json({
      success: true,
      message: "Access revoked",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.dashboard = async (req, res) => {
  try {
    const access = await resolveSharedAccess(req.user.id, req.query.email);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const range = ["7d", "14d", "30d"].includes(req.query.glucoseRange)
      ? req.query.glucoseRange
      : "7d";

    const payload = await buildHomeDashboard(access.ownerId, range);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      ...payload,
      sharedUser: {
        email: access.owner.email,
        name: access.owner.name,
        firstName: splitFirst(access.owner.name),
        permission: access.permission,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
