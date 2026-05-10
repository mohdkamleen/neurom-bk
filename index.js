const dotenv = require("dotenv");
dotenv.config({ override: true, quiet: true  });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(cors()); 
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));  

app.get("/", (req, res) => {
  res.send("Server running....");
});
 
var port = process.env.PORT || 5000

app.listen(port, () => console.log(`Server running on port ${port}`));