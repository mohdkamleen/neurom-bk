const dotenv = require("dotenv");
dotenv.config({ override: true, quiet: true });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/food", require("./routes/foodRoutes"));
app.use("/api/glucose", require("./routes/glucoseRoutes"));
app.use("/api/meals", require("./routes/mealRoutes"));
app.use("/api/medicine", require("./routes/medicineRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/predictions", require("./routes/predictionRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => {
  res.send("NeuroM API running");
});

const port = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});
