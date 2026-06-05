const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const predict = require("../controllers/predictionController");

router.post("/run", auth, predict.run);
router.post("/summary", auth, predict.summary);
router.get("/summary", auth, predict.summary);

module.exports = router;
