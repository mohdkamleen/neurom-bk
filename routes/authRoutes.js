const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  verifyOtp,
  getProfile,
  getUsers
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verifyOtp", verifyOtp); 
router.get("/profile", authMiddleware, getProfile);

module.exports = router;