const express = require("express");
const auth = require("../middleware/authMiddleware");
const entries = require("../controllers/entriesController");

const router = express.Router();

router.get("/manual", auth, entries.listManual);
router.get("/barcode/:id", auth, entries.getBarcode);
router.get("/:id", auth, entries.getById);
router.post("/manual", auth, entries.manual);
router.post("/barcode", auth, entries.barcode);

module.exports = router;
