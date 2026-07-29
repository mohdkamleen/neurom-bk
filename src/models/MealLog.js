const mongoose = require("mongoose");

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"];
const MEAL_TIMING = ["before_meal", "after_meal", "unspecified"];

const foodItemSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true },
    barcode: { type: String },
    openFoodFactsCode: { type: String },
    servingAmount: { type: Number },
    servingUnit: { type: String, default: "g" },
    servings: { type: Number, default: 1 },
    // Legacy flat macros — kept for meal aggregates / predictions
    carbsG: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    fatG: { type: Number, default: 0 },
    proteinG: { type: Number, default: 0 },
    sugarG: { type: Number, default: 0 },
    fiberG: { type: Number, default: 0 },
    // Full per-serving nutrition map (frontend shape; Mixed so extras aren't stripped)
    nutrition: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    mealTiming: { type: String, enum: MEAL_TIMING, default: "unspecified" },
  },
  { _id: true }
);

const mealLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    consumedAt: { type: Date, required: true, index: true },
    items: { type: [foodItemSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true }
);

mealLogSchema.index({ user: 1, consumedAt: -1 });

module.exports = mongoose.model("MealLog", mealLogSchema);
module.exports.MEAL_TYPES = MEAL_TYPES;
module.exports.MEAL_TIMING = MEAL_TIMING;
