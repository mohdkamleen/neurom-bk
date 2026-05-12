// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String },
    gender: { type: String },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    size: { type: String },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    calorieGoal: { type: Number, default: 2200 },
    glucoseTargetLow: { type: Number, default: 70 },
    glucoseTargetHigh: { type: Number, default: 180 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
