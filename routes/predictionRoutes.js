const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const predict = require("../controllers/predictionController");

router.post("/run", auth, predict.run);

module.exports = router;
