const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment } = require("../src/server/models");

async function diagnoseUserPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Find the specific user from image or others with target sums
    const users = await User.find({ 
      $or: [
        { telegramId: "1235927836" }, // Olimjon
        { firstName: /Olimjon/i }
      ]
    });

    for (const user of users) {
      console.log(`\n📋 Klient: ${user.firstName} ${user.lastName} (${user._id})`);
      
      const payments = await Payment.find({ client: user._id })
        .sort({ createdAt: -1 })
        .limit(20);

      console.log(`Sana (Precise)             | Summa      | Izoh`);
      console.log(`------------------------------------------------------------`);
      payments.forEach(p => {
        console.log(`${p.createdAt.toISOString()} | ${p.amount.toLocaleString().padEnd(10)} | ${p.notes}`);
      });
    }

    // Also look for ANY payments near each other (within 5 seconds)
    console.log("\n--- Tizim bo'ylab shubhali (ketma-ket) to'lovlar (5 sek oralig'ida) ---");
    const allRecentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("client", "firstName lastName");

    for (let i = 0; i < allRecentPayments.length - 1; i++) {
        const p1 = allRecentPayments[i];
        const p2 = allRecentPayments[i+1];
        
        const diff = Math.abs(p1.createdAt - p2.createdAt);
        if (diff < 5000 && p1.client?._id.toString() === p2.client?._id.toString()) {
            console.log(`⚠️ SHUBHA: ${p1.client.firstName} - Diff: ${diff}ms | Amounts: ${p1.amount} & ${p2.amount}`);
        }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

diagnoseUserPayments();
