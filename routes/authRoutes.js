const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  verifyOtp,
  getProfile,
  deleteAllUsers
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verifyOtp", verifyOtp); 
router.post("/profile", authMiddleware, getProfile);
router.delete("/delete-all-users", deleteAllUsers);

module.exports = router;