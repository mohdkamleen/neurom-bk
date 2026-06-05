const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const reports = require("../controllers/reportsController");

router.get("/diet", auth, reports.dietChart);
router.get("/top-foods", auth, reports.topFoods);

module.exports = router;
