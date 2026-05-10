const dotenv = require("dotenv");
dotenv.config({ override: true, quiet: true });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Mongo Error:", err.message);
    process.exit(1);
  }
};

connectDB();

app.use("/api/auth", require("./routes/authRoutes"));

app.get("/", (req, res) => {
  res.send("Server running....");
});

const port = process.env.PORT || 5000;

app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);