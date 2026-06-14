const express = require("express");
const auth = require("../middleware/authMiddleware");
const sharing = require("../controllers/sharingController");

const router = express.Router();

router.get("/users", auth, sharing.listUsers);
router.post("/grant", auth, sharing.grantAccess);
router.post("/request-access", auth, sharing.requestAccess);
router.patch("/:id/permission", auth, sharing.updatePermission);
router.delete("/:id", auth, sharing.revokeAccess);

module.exports = router;
