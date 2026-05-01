const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI from environment variables.
 * Mongoose handles connection pooling automatically, so we call
 * this once at startup and reuse the connection throughout.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Exit with failure code — the app cannot run without the database
    process.exit(1);
  }
};

module.exports = connectDB;
