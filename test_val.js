const mongoose = require("mongoose");
const { connectDB } = require("./src/utils/config");
const { User } = require("./src/server/models");

async function testValidation() {
  try {
    await connectDB();
    console.log("Connected to DB");

    const user = new User({
      telegramId: "test_" + Date.now(),
      firstName: "",
      lastName: "Test",
      username: "test",
      role: "client",
    });

    await user.save();
    console.log("✅ User saved with empty firstName!");
    await User.deleteOne({ _id: user._id });
  } catch (error) {
    console.error("❌ Validation failed for empty firstName:");
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

testValidation();
