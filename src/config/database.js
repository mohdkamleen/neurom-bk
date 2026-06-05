const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
      }
    );

    console.log(
      `MongoDB Connected: ${conn.connection.host}`
    );

  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    console.warn('⚠  Running without database — API docs still available at /api-docs');
  }
};

module.exports = connectDB;