const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);
// Same routes without /api prefix (e.g. POST /auth/login)
app.use(apiRoutes);

app.get("/", (req, res) => {
  res.send("NeuroM API running");
});

module.exports = app;
