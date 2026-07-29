const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");

router.get("/users", auth, admin, adminController.listUsers);
router.patch("/users/:id", auth, admin, adminController.updateUser);
router.delete("/users/all", auth, admin, adminController.deleteAllUsers);

module.exports = router;
