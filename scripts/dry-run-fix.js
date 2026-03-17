const mongoose = require("mongoose");
require("dotenv").config();
const { User, Order } = require("../src/server/models");

async function dryRun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    const ordersWithSurplus = await Order.find({ debt: { $lt: 0 }, status: { $ne: "cancelled" } }).populate("client");
    console.log(`Found ${ordersWithSurplus.length} orders with negative debt.`);

    const userChanges = {};

    for (const order of ordersWithSurplus) {
      if (!order.client) continue;
      const userId = order.client._id.toString();
      const surplus = Math.abs(order.debt);

      if (!userChanges[userId]) {
        userChanges[userId] = {
          name: `${order.client.firstName} ${order.client.lastName || ""}`,
          totalSurplus: 0,
          orders: []
        };
      }

      userChanges[userId].totalSurplus += surplus;
      userChanges[userId].orders.push({
        orderNumber: order.orderNumber,
        debt: order.debt
      });
    }

    console.log("\n--- Proyektsiya (Nima o'zgaradi) ---");
    for (const userId in userChanges) {
      const change = userChanges[userId];
      console.log(`👤 Klient: ${change.name} (${userId})`);
      console.log(`   💰 Balansga o'tadi: +${change.totalSurplus.toLocaleString()} so'm`);
      console.log(`   📦 Buyurtmalar: ${change.orders.map(o => `${o.orderNumber} (${o.debt})`).join(", ")}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

dryRun();
