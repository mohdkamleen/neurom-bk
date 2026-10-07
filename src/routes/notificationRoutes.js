const express = require("express");
const auth = require("../middleware/authMiddleware");
const notifications = require("../controllers/notificationController");

const router = express.Router();

router.get("/settings", auth, notifications.getSettings);
router.patch("/settings", auth, notifications.updateSettings);
router.get("/inbox", auth, notifications.listInbox);
router.post("/email", auth, notifications.sendDueEmails);

router.get("/checkups", auth, notifications.listCheckups);
router.post("/checkups", auth, notifications.saveCheckup);
router.delete("/checkups/:id", auth, notifications.deleteCheckup);

router.get("/medications", auth, notifications.listMedications);
router.post("/medications", auth, notifications.createMedication);
router.patch("/medications/:id", auth, notifications.updateMedication);
router.delete("/medications/:id", auth, notifications.deleteMedication);

module.exports = router;
