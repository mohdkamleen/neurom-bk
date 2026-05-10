const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const {
  signup,
  login,
  verifyOtp,
  getProfile,
  deleteAllUsers
} = require("../controllers/authController");
 
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verifyOtp", verifyOtp); 
router.post("/profile", authMiddleware, getProfile);
router.delete("/delete-all-users", deleteAllUsers);

module.exports = router;