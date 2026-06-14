const express = require("express");
const router = express.Router();
const {
  searchFoods,
  scanBarcode,
  getFoodByCode,
  nutrientsForServing,
} = require("../controllers/foodController");

router.get("/search", searchFoods);
router.get("/barcode/:code", scanBarcode);
router.get("/product/:code", getFoodByCode);
router.get("/nutrients-for-serving", nutrientsForServing);

module.exports = router;
