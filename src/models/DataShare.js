const mongoose = require("mongoose");

const dataShareSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    grantee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    granteeEmail: { type: String },
    granteePhone: { type: String },
    permission: {
      type: String,
      enum: ["view_only", "view_edit"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "revoked"],
      default: "active",
      index: true,
    },
    kind: {
      type: String,
      enum: ["grant", "request"],
      default: "grant",
    },
  },
  { timestamps: true }
);

dataShareSchema.index({ owner: 1, grantee: 1, status: 1 });

module.exports = mongoose.model("DataShare", dataShareSchema);
