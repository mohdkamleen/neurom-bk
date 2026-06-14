const mongoose = require("mongoose");

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
  },
  { _id: false }
);

const foodFields = {
  source: {
    type: String,
    enum: ["openfoodfacts", "usda"],
    required: true,
  },
  barcode: { type: String },
  fdcId: { type: String },
  productName: { type: String, required: true },
  brand: { type: String },
  imageUrl: { type: String },
  servingSize: { type: String, default: "100" },
  servings: { type: Number, default: 1 },
  nutrition: { type: nutritionSchema, default: () => ({}) },
  foodCategory: { type: String },
  dataType: { type: String },
  cachedAt: { type: Date, default: Date.now },
};

module.exports = { nutritionSchema, foodFields };
