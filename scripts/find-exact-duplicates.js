const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment } = require("../src/server/models");

async function findExactRapidDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Searching for exact rapid duplicates...");

    const payments = await Payment.find().sort({ client: 1, createdAt: 1 }).populate("client", "firstName lastName");
    let count = 0;

    for (let i = 0; i < payments.length - 1; i++) {
      const p1 = payments[i];
      const p2 = payments[i+1];

      const sameClient = p1.client?._id.toString() === p2.client?._id.toString();
      const sameAmount = p1.amount === p2.amount;
      const timeDiff = Math.abs(p2.createdAt - p1.createdAt);

      if (sameClient && sameAmount && timeDiff < 2000) {
        count++;
        console.log(`\n⚠️ EXACT DUPLICATE: ${p1.client?.firstName}`);
        console.log(`   Vaqtlar: ${p1.createdAt.toISOString()} | ${p2.createdAt.toISOString()}`);
        console.log(`   Diff: ${timeDiff}ms | Amount: ${p1.amount}`);
      }
    }

    console.log(`\nAudit finished. Found ${count} exact duplicates.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}
findExactRapidDuplicates();
