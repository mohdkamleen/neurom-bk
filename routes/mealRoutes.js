const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const meals = require("../controllers/mealController");

router.get("/", auth, meals.list);
router.get("/:id", auth, meals.getById);
router.post("/", auth, meals.create);

module.exports = router;
