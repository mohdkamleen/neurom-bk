const User = require("../models/User");
const DataShare = require("../models/DataShare");
const mongoose = require("mongoose");

function normalizeEmail(email) {
  return email != null ? String(email).trim().toLowerCase() : "";
}

async function resolveSharedAccess(granteeId, ownerEmail) {
  const email = normalizeEmail(ownerEmail);
  if (!email) {
    return {
      ok: false,
      status: 400,
      message: "Shared user email is required",
    };
  }

  const owner = await User.findOne({ email }).select("_id name email").lean();
  if (!owner) {
    return { ok: false, status: 404, message: "User not found" };
  }

  const share = await DataShare.findOne({
    owner: owner._id,
    grantee: new mongoose.Types.ObjectId(String(granteeId)),
    status: "active",
  }).lean();

  if (!share) {
    return {
      ok: false,
      status: 403,
      message: "You do not have access to this user's data",
    };
  }

  return {
    ok: true,
    ownerId: owner._id,
    owner,
    permission: share.permission,
  };
}

async function resolveSharedEditAccess(granteeId, ownerEmail) {
  const access = await resolveSharedAccess(granteeId, ownerEmail);
  if (!access.ok) {
    return access;
  }

  if (access.permission !== "view_edit") {
    return {
      ok: false,
      status: 403,
      message: "You only have view access to this user's data",
    };
  }

  return access;
}

module.exports = {
  normalizeEmail,
  resolveSharedAccess,
  resolveSharedEditAccess,
};
