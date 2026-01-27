/**
 * Barcha foydalanuvchilarning totalDebt maydonini qayta hisoblash
 * 
 * Bu script'ni ishlatish:
 * node fix-all-user-debts.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("./src/utils/config");

async function fixAllUserDebts() {
  try {
    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    console.log("✅ MongoDB'ga ulandi");

    const User = require("./src/server/models/User");
    const Order = require("./src/server/models/Order");

    // Get all users
    const users = await User.find();
    console.log(`\n👥 Jami ${users.length} ta foydalanuvchi topildi\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Calculate debt from non-cancelled orders
        const orders = await Order.find({
          client: user._id,
          status: { $ne: "cancelled" },
          debt: { $gt: 0 },
        });

        const totalDebt = orders.reduce(
          (sum, order) => sum + (order.debt || 0),
          0
        );

        const oldDebt = user.totalDebt || 0;

        // Update user
        user.totalDebt = totalDebt;
        await user.save();

        if (oldDebt !== totalDebt) {
          console.log(
            `✅ ${user.firstName} ${user.lastName || ""}: ${oldDebt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} → ${totalDebt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`
          );
          fixedCount++;
        }
      } catch (err) {
        console.error(
          `❌ ${user.firstName} ${user.lastName || ""}: ${err.message}`
        );
        errorCount++;
      }
    }

    console.log(`\n📊 Natijalar:`);
    console.log(`   ✅ To'g'irlandi: ${fixedCount} ta`);
    console.log(`   ❌ Xatolik: ${errorCount} ta`);
    console.log(`   ℹ️ O'zgarishsiz: ${users.length - fixedCount - errorCount} ta`);

    // Summary statistics
    const totalDebtSum = users.reduce((sum, u) => sum + (u.totalDebt || 0), 0);
    console.log(
      `\n💰 Umumiy qarzdorlik: ${totalDebtSum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`
    );

    mongoose.connection.close();
    console.log("\n✅ Tugadi!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    process.exit(1);
  }
}

fixAllUserDebts();
