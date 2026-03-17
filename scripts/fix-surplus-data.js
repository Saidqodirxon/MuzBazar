const mongoose = require("mongoose");
require("dotenv").config();
const { User, Order, Payment } = require("../src/server/models");

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🚀 Ma'lumotlarni migratsiya qilish boshlandi...");

    const paymentSums = await Payment.aggregate([
      { $group: { _id: "$order", totalPaid: { $sum: "$amount" } } }
    ]);
    const paymentMap = {};
    paymentSums.forEach(p => { if (p._id) paymentMap[p._id.toString()] = p.totalPaid; });

    const orders = await Order.find({ status: { $ne: "cancelled" } }).populate("client");
    let totalFixedUsers = 0;
    let totalSurplusMoved = 0;

    for (const order of orders) {
      const totalPayments = paymentMap[order._id.toString()] || 0;

      if (totalPayments > order.totalSum) {
        const surplus = totalPayments - order.totalSum;
        const user = await User.findById(order.client?._id);

        if (user) {
          console.log(`✅ To'g'irlanmoqda: ${user.firstName} ${user.lastName || ""} | Order: ${order.orderNumber}`);
          console.log(`   🔸 Surplus: ${surplus.toLocaleString()} so'm balansga o'tkazildi.`);

          user.balance = (user.balance || 0) + surplus;
          await user.save();

          // Buyurtmadagi notes'ga yozib qo'yamiz
          order.notes = (order.notes || "") + `\n[System Fix]: ${surplus.toLocaleString()} so'm ortiqcha to'lov foydalanuvchi balansiga o'tkazildi.`;
          await order.save();

          await User.updateUserTotalDebt(user._id);

          totalFixedUsers++;
          totalSurplusMoved += surplus;
        }
      }
    }

    console.log(`\n🎉 Migratsiya yakunlandi!`);
    console.log(`👤 To'g'irlangan foydalanuvchilar: ${totalFixedUsers}`);
    console.log(`💰 Jami balansga o'tkazilgan summa: ${totalSurplusMoved.toLocaleString()} so'm`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Migratsiyada xatolik:", error);
  }
}

migrateData();
