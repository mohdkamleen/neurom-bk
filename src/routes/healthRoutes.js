const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    service: "neurom-bk",
    client: "neurom-native-fr",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
