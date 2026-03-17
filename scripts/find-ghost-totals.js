const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment } = require("../src/server/models");

async function findGhostTotals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Searching for Ghost Totals (The Olimjon bug pattern)...");

    const payments = await Payment.find().sort({ client: 1, createdAt: 1 });
    let totalBugs = 0;

    for (let i = 0; i < payments.length; i++) {
      const p1 = payments[i];
      // Look ahead for payments within 5 seconds for the same client
      let j = i + 1;
      let group = [p1];
      while (j < payments.length && 
             payments[j].client.toString() === p1.client.toString() &&
             (payments[j].createdAt - p1.createdAt) < 5000) {
        group.push(payments[j]);
        j++;
      }

      if (group.length > 2) { // At least 3 payments to have a Split + Total
        const amounts = group.map(p => p.amount);
        const sorted = [...group].sort((a, b) => b.amount - a.amount);
        const max = sorted[0];
        const others = sorted.slice(1);
        const othersSum = others.reduce((sum, p) => sum + p.amount, 0);

        if (Math.abs(max.amount - othersSum) < 2) {
            totalBugs++;
            const user = await User.findById(p1.client);
            console.log(`\n🚨 BUG DETECTED: ${user?.firstName} ${user?.lastName}`);
            console.log(`   Vaqt: ${max.createdAt.toISOString()}`);
            console.log(`   Total (The duplicate): ${max.amount}`);
            console.log(`   Splits: ${others.map(o => o.amount).join(" + ")}`);
        }
      }
    }

    console.log(`\nAudit finished. Found ${totalBugs} bugs.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}
findGhostTotals();
