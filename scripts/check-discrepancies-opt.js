const mongoose = require("mongoose");
require("dotenv").config();
const { Order, Payment } = require("../src/server/models");

async function checkDiscrepanciesOptimized() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    const paymentSums = await Payment.aggregate([
      {
        $group: {
          _id: "$order",
          totalPaid: { $sum: "$amount" }
        }
      }
    ]);

    const paymentMap = {};
    paymentSums.forEach(p => {
      if (p._id) paymentMap[p._id.toString()] = p.totalPaid;
    });

    const orders = await Order.find({ status: { $ne: "cancelled" } }).populate("client");
    const discrepancies = [];

    for (const order of orders) {
      const totalPayments = paymentMap[order._id.toString()] || 0;

      if (totalPayments > order.totalSum) {
        discrepancies.push({
          orderNumber: order.orderNumber,
          client: order.client ? `${order.client.firstName} ${order.client.lastName || ""}` : "Unknown",
          totalSum: order.totalSum,
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

checkDiscrepanciesOptimized();
