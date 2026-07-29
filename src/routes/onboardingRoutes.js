const express = require("express");
const auth = require("../middleware/authMiddleware");
const onboarding = require("../controllers/onboardingController");

const router = express.Router();

router.get("/status", auth, onboarding.status);
router.post("/complete", auth, onboarding.complete);

module.exports = router;
