const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment, Order } = require("../src/server/models");

async function deepAuditDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for Deep Audit...");

    const users = await User.find();
    let totalIssuesFound = 0;

    for (const user of users) {
      const payments = await Payment.find({ client: user._id }).sort({ createdAt: 1 });
      
      if (payments.length < 2) continue;

      let currentGroup = [payments[0]];
      const suspectGroups = [];

      for (let i = 1; i < payments.length; i++) {
        const p = payments[i];
        const last = currentGroup[currentGroup.length - 1];
        const diff = p.createdAt - last.createdAt;

        if (diff < 2000) { // Under 2 seconds window
          currentGroup.push(p);
        } else {
          if (currentGroup.length > 1) {
            suspectGroups.push([...currentGroup]);
          }
          currentGroup = [p];
        }
      }
      if (currentGroup.length > 1) suspectGroups.push(currentGroup);

      // Analyze suspect groups
      for (const group of suspectGroups) {
        const amounts = group.map(p => p.amount);
        const sorted = [...group].sort((a, b) => b.amount - a.amount);
        const max = sorted[0];
        const others = sorted.slice(1);
        const othersSum = others.reduce((sum, p) => sum + p.amount, 0);

        let isIssue = false;
        let issueType = "";

        // Pattern 1: Same amounts (Exact Duplicates)
        const uniqueAmounts = new Set(amounts);
        if (uniqueAmounts.size < amounts.length) {
            isIssue = true;
            issueType = "EXACT_DUPLICATE (Bir xil summali to'lovlar)";
        }

        // Pattern 2: Total vs Split (The Olimjon bug)
        if (!isIssue && Math.abs(max.amount - othersSum) < 1) {
            isIssue = true;
            issueType = "TOTAL_VS_SPLIT (Summa va uning bo'laklari)";
        }

        if (isIssue) {
          totalIssuesFound++;
          console.log(`\n⚠️ TOPILDI: ${user.firstName} ${user.lastName || ""}`);
          console.log(`   Turi: ${issueType}`);
          console.log(`   Vaqt oralig'i: ${group[0].createdAt.toISOString()} dan ${group[group.length-1].createdAt.toISOString()} gacha`);
          console.log(`   Summalar: ${amounts.join(", ")}`);
          group.forEach(p => {
              console.log(`     - ID: ${p._id} | Order: ${p.order} | Amount: ${p.amount}`);
          });
        }
      }
    }

    console.log(`\nAudit yakunlandi. Jami ${totalIssuesFound} ta shubhali holat aniqlandi.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Audit error:", error);
  }
}

deepAuditDuplicates();
