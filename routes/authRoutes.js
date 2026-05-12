const express = require("express");
const router = express.Router();

const {
  sendOtp,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/sendOtp", sendOtp);
router.post("/login", login);
router.post("/verifyOtp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", authMiddleware, getProfile);
router.post("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, updateProfile);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
