const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const msg = require("../controllers/messageController");

router.get("/threads", auth, msg.listThreads);
router.post("/threads", auth, msg.createDirectThread);
router.get("/threads/:threadId/messages", auth, msg.getMessages);
router.post("/threads/:threadId/messages", auth, msg.sendMessage);

module.exports = router;
