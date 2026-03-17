const mongoose = require("mongoose");
require("dotenv").config();
const { User, Order, Payment } = require("../src/server/models");

async function findDuplicatePayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // Find all payments and group by client and createdAt
    const duplicates = await Payment.aggregate([
      {
        $group: {
          _id: {
            client: "$client",
            createdAt: "$createdAt"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          paymentIds: { $push: "$_id" },
          amounts: { $push: "$amount" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.client",
          foreignField: "_id",
          as: "clientData"
        }
      },
      { $unwind: "$clientData" }
    ]);

    console.log(`\n--- Bir xil vaqtda kiritilgan to'lovlar (Dublikat ehtimoli) ---`);
    
    if (duplicates.length === 0) {
      console.log("Hech qanday dublikat topilmadi.");
    } else {
      duplicates.forEach(d => {
        console.log(`👤 Klient: ${d.clientData.firstName} ${d.clientData.lastName || ""}`);
        console.log(`⏰ Vaqt: ${d._id.createdAt.toISOString()}`);
        console.log(`📊 Soni: ${d.count} ta alohida payment record`);
        console.log(`💰 Summalar: ${d.amounts.join(", ")}`);
        
        // Check if one amount equals the sum of others (classic split bug)
        const sorted = [...d.amounts].sort((a, b) => b - a);
        const max = sorted[0];
        const restSum = sorted.slice(1).reduce((a, b) => a + b, 0);
        
        if (max === restSum) {
          console.log(`⚠️ ALERt: Top payment (${max}) matches the sum of others (${restSum})! This is a confirmed duplication/split bug.`);
        }
        console.log("--------------------------------------------------");
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

findDuplicatePayments();
