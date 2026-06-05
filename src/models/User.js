const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    phone: { type: String },
    gender: { type: String },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    size: { type: String },
    bloodGroup: { type: String },
    dateOfBirth: { type: String },
    avatarUrl: { type: String },
    emailVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    calorieGoal: { type: Number, default: 2200 },
    glucoseTargetLow: { type: Number, default: 70 },
    glucoseTargetHigh: { type: Number, default: 180 },
    diabetesDiagnosed: { type: String },
    diabetesType: { type: String },
    glucoseMeasureFrequency: { type: String },
    familyGlucoseHistory: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);