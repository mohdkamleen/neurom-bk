// config/db.js
const mongoose = require("mongoose");

const connectDB = _ => {
  try {
    mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error(err); 
  }
};

module.exports = connectDB;