const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const medicine = require("../controllers/medicineController");

router.get("/", auth, medicine.list);
router.post("/", auth, medicine.create);

module.exports = router;
