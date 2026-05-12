const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const dashboard = require("../controllers/dashboardController");

router.get("/home", auth, dashboard.home);

module.exports = router;
