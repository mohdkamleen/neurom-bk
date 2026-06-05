const express = require("express");

const router = express.Router();

router.use("/health", require("./healthRoutes"));
router.use("/auth", require("./authRoutes"));
router.use("/onboarding", require("./onboardingRoutes"));
router.use("/entries", require("./entriesRoutes"));
router.use("/food", require("./foodRoutes"));
router.use("/glucose", require("./glucoseRoutes"));
router.use("/meals", require("./mealRoutes"));
router.use("/medicine", require("./medicineRoutes"));
router.use("/dashboard", require("./dashboardRoutes"));
router.use("/predictions", require("./predictionRoutes"));
router.use("/reports", require("./reportRoutes"));
router.use("/messages", require("./messageRoutes"));
router.use("/admin", require("./adminRoutes"));

module.exports = router;
