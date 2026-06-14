const mongoose = require("mongoose");
const { foodFields } = require("./schemas");

let foodDb = null;
let FoodByBarcode = null;
let FoodByName = null;

function isFoodDbReady() {
  return mongoose.connection.readyState === 1 && FoodByBarcode != null;
}

function initFoodDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const dbName = process.env.FOOD_DB_NAME || "neurom_food";
  foodDb = mongoose.connection.useDb(dbName, { useCache: true });

  if (!FoodByBarcode) {
    const barcodeSchema = new mongoose.Schema(
      {
        ...foodFields,
        barcode: { type: String, required: true },
      },
      { timestamps: true }
    );
    barcodeSchema.index({ barcode: 1 }, { unique: true });
    barcodeSchema.index({ productName: "text", brand: "text" });
    FoodByBarcode = foodDb.model("FoodByBarcode", barcodeSchema, "food_by_barcode");
  }

  if (!FoodByName) {
    const nameSchema = new mongoose.Schema(
      {
        ...foodFields,
        searchTerms: { type: [String], default: [] },
      },
      { timestamps: true }
    );
    nameSchema.index({ productName: "text" });
    nameSchema.index({ searchTerms: 1 });
    nameSchema.index({ fdcId: 1 }, { unique: true, sparse: true });
    nameSchema.index({ barcode: 1 }, { sparse: true });
    nameSchema.index({ source: 1, productName: 1 });
    FoodByName = foodDb.model("FoodByName", nameSchema, "food_by_name");
  }

  syncFoodIndexes().catch((err) => {
    console.warn("Food cache index sync:", err.message);
  });

  console.log(`Food cache DB ready: ${dbName}`);
  return true;
}

async function syncFoodIndexes() {
  if (!FoodByBarcode || !FoodByName) return;
  await Promise.all([FoodByBarcode.syncIndexes(), FoodByName.syncIndexes()]);
}

module.exports = {
  initFoodDatabase,
  isFoodDbReady,
  getFoodByBarcodeModel: () => FoodByBarcode,
  getFoodByNameModel: () => FoodByName,
};
