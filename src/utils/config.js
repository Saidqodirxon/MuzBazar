const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

/**
 * Database connection configuration
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

/**
 * Environment variables validation
 */
const validateEnv = () => {
  const required = [
    "BOT_TOKEN",
    "MONGODB_URI",
    "ADMIN_TELEGRAM_ID",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
  ];

  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  }
};

module.exports = {
  connectDB,
  validateEnv,
};
