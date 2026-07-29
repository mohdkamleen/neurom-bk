const express = require("express");
const router = express.Router();
const {
  searchFoods,
  searchGenericFoods,
  getFoodDetails,
  getGenericFoodDetails,
  scanBarcode,
  getFoodByCode,
  nutrientsForServing,
} = require("../controllers/foodController");

router.get("/search", searchFoods);
router.get("/generic/search", searchGenericFoods);
router.get("/generic/details/:fdcId", getGenericFoodDetails);
router.get("/barcode/:code", scanBarcode);
router.get("/details/:code", getFoodDetails);
router.get("/product/:code", getFoodByCode);
router.get("/nutrients-for-serving", nutrientsForServing);

module.exports = router;
