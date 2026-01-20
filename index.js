const { connectDB, validateEnv } = require("./src/utils/config");

// Start the application
async function startApp() {
  try {
    // Validate environment variables
    validateEnv();

    // Connect to database
    await connectDB();

    // Initialize default settings
    const { Settings } = require("./src/server/models");
    await Settings.initDefaults();
    console.log("⚙️ Settings initialized");

    // Start bot and server in parallel
    const bot = require("./src/bot");
    const server = require("./src/server/app");
    
    // Initialize scheduler for automated tasks (debt reminders, etc.)
    const scheduler = require("./src/utils/scheduler");
    scheduler.init();

    console.log("🚀 MUZ BAZAR BOT started successfully!");
  } catch (error) {
    console.error("❌ Failed to start application:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down gracefully...");
  process.exit(0);
});

// Start the application
startApp();
