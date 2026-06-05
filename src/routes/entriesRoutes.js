const express = require("express");
const auth = require("../middleware/authMiddleware");
const entries = require("../controllers/entriesController");

const router = express.Router();

router.post("/manual", auth, entries.manual);

module.exports = router;
