const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const glucose = require("../controllers/glucoseController");

router.get("/", auth, glucose.list);
router.post("/", auth, glucose.create);
router.delete("/:id", auth, glucose.remove);

module.exports = router;
