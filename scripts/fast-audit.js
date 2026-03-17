const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment } = require("../src/server/models");

async function fastDeepAudit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for FAST Deep Audit...");

    // Fetch all payments sorted by client and time
    const payments = await Payment.find().sort({ client: 1, createdAt: 1 }).populate("client", "firstName lastName");
    console.log(`Loaded ${payments.length} payments. Analyzing...`);

    let totalIssuesFound = 0;
    let i = 0;

    while (i < payments.length) {
      let j = i + 1;
      let currentGroup = [payments[i]];

      // Group payments for the same client within 2 seconds
      while (j < payments.length && 
             payments[j].client?._id.toString() === payments[i].client?._id.toString() &&
             (payments[j].createdAt - payments[j-1].createdAt) < 2000) {
        currentGroup.push(payments[j]);
        j++;
      }

      if (currentGroup.length > 1) {
        const amounts = currentGroup.map(p => p.amount);
        const sorted = [...currentGroup].sort((a, b) => b.amount - a.amount);
        const max = sorted[0];
        const others = sorted.slice(1);
        const othersSum = others.reduce((sum, p) => sum + p.amount, 0);

        let isIssue = false;
        let issueType = "";

        // Pattern 1: Same amounts (Exact Duplicates)
        const uniqueAmounts = new Set(amounts);
        if (uniqueAmounts.size < amounts.length) {
          // Check if they are actually exactly the same (to avoid false positives of many small payments)
          // For now, let's flag all rapid-fire same-amount payments
          isIssue = true;
          issueType = "EXACT_DUPLICATE (Bir xil summali ketma-ket to'lovlar)";
        }

        // Pattern 2: Total vs Split (The Olimjon bug)
        if (!isIssue && others.length > 0 && Math.abs(max.amount - othersSum) < 2) { // 2 so'm tolerance
          isIssue = true;
          issueType = "TOTAL_VS_SPLIT (Summa va uning bo'laklari)";
        }

        if (isIssue) {
          totalIssuesFound++;
          const user = currentGroup[0].client;
          console.log(`\n⚠️ TOPILDI: ${user ? `${user.firstName} ${user.lastName || ""}` : "Noma'lum"}`);
          console.log(`   Turi: ${issueType}`);
          console.log(`   Vaqt: ${currentGroup[0].createdAt.toISOString()}`);
          console.log(`   Summalar: ${amounts.join(", ")}`);
        }
      }
      i = j;
    }

    console.log(`\nAudit yakunlandi. Jami ${totalIssuesFound} ta shubhali holat aniqlandi.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Audit error:", error);
  }
}

fastDeepAudit();
