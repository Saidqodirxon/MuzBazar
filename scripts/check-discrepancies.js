const mongoose = require("mongoose");
require("dotenv").config();
const { User, Order, Payment } = require("../src/server/models");

async function checkDiscrepancies() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Find all orders
    const orders = await Order.find({ status: { $ne: "cancelled" } }).populate("client");
    console.log(`Checking ${orders.length} orders...`);

    const discrepancies = [];

    for (const order of orders) {
      if (!order.client) continue;

      // Sum all payments for this order
      const payments = await Payment.find({ order: order._id });
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPayments > order.totalSum) {
        discrepancies.push({
          orderNumber: order.orderNumber,
          client: `${order.client.firstName} ${order.client.lastName || ""}`,
          totalSum: order.totalSum,
          paidSumInOrder: order.paidSum,
          totalPaymentsRecord: totalPayments,
          surplus: totalPayments - order.totalSum
        });
      }
    }

    console.log("\n--- Topilgan Xatoliklar (Surplus lost in capping) ---");
    if (discrepancies.length === 0) {
      console.log("Hech qanday xatolik topilmadi.");
    } else {
      discrepancies.forEach(d => {
        console.log(`📦 Order: ${d.orderNumber} | 👤 Klient: ${d.client}`);
        console.log(`   💰 Buyurtma summasi: ${d.totalSum.toLocaleString()} so'm`);
        console.log(`   💳 To'langan (Payment records): ${d.totalPaymentsRecord.toLocaleString()} so'm`);
        console.log(`   ⚠️ Yo'qotilgan qoldiq: ${d.surplus.toLocaleString()} so'm`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkDiscrepancies();
