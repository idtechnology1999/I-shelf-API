// config/db.js
const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  try {
    // Just connect without old options
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected Successfully 🚀");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
