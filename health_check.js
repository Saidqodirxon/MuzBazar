const { connectDB } = require("./src/utils/config");
const {
  User,
  Category,
  Product,
  Order,
  Settings,
} = require("./src/server/models");
const mongoose = require("mongoose");

async function checkHealth() {
  try {
    console.log("🔍 Checking database connection...");
    await connectDB();
    console.log("✅ Database connected.");

    console.log("🔍 Checking models...");
    const userCount = await User.countDocuments();
    const catCount = await Category.countDocuments();
    const prodCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const settingCount = await Settings.countDocuments();

    console.log(`📊 Stats:
- Users: ${userCount}
- Categories: ${catCount}
- Products: ${prodCount}
- Orders: ${orderCount}
- Settings: ${settingCount}`);

    console.log("🔍 Testing Settings.get...");
    const shopName = await Settings.get("shop_name");
    console.log(`✅ Shop Name: ${shopName}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Health check failed:");
    console.error(error);
    process.exit(1);
  }
}

checkHealth();
