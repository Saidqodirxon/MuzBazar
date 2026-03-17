const mongoose = require("mongoose");
require("dotenv").config();
const { Order, Payment } = require("../src/server/models");

async function checkDiscrepanciesJSON() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const paymentSums = await Payment.aggregate([
      { $group: { _id: "$order", totalPaid: { $sum: "$amount" } } }
    ]);
    const paymentMap = {};
    paymentSums.forEach(p => { if (p._id) paymentMap[p._id.toString()] = p.totalPaid; });
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
    console.log(JSON.stringify(discrepancies, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}
checkDiscrepanciesJSON();
