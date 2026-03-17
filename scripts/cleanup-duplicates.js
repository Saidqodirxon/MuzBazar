const mongoose = require("mongoose");
require("dotenv").config();
const { User, Order, Payment } = require("../src/server/models");

async function cleanupDuplicates(dryRun = true) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB (Dry Run: ${dryRun})...`);

    const allPayments = await Payment.find().sort({ client: 1, createdAt: 1 });
    const groups = [];
    let currentGroup = [];

    for (let i = 0; i < allPayments.length; i++) {
      const p = allPayments[i];
      if (currentGroup.length === 0) {
        currentGroup.push(p);
      } else {
        const last = currentGroup[currentGroup.length - 1];
        const sameClient = last.client.toString() === p.client.toString();
        const sameTime = Math.abs(p.createdAt - last.createdAt) < 5000;

        if (sameClient && sameTime) {
          currentGroup.push(p);
        } else {
          if (currentGroup.length > 1) groups.push([...currentGroup]);
          currentGroup = [p];
        }
      }
    }
    if (currentGroup.length > 1) groups.push(currentGroup);

    console.log(`Found ${groups.length} suspicious payment groups.`);

    let fixedCount = 0;
    let deletedAmount = 0;

    for (const group of groups) {
      const amounts = group.map(p => p.amount);
      const sorted = [...group].sort((a, b) => b.amount - a.amount);
      const maxPayment = sorted[0];
      const others = sorted.slice(1);
      const othersSum = others.reduce((sum, p) => sum + p.amount, 0);

      // Check for the "Total vs Split" duplicate pattern
      if (Math.abs(maxPayment.amount - othersSum) < 1) {
        console.log(`\n🚨 Confirmed Duplicate Set Found:`);
        const user = await User.findById(group[0].client);
        console.log(`👤 User: ${user ? user.firstName : "Unknown"} | Date: ${maxPayment.createdAt.toISOString()}`);
        console.log(`💰 Duplicate to REMOVE: ${maxPayment.amount.toLocaleString()} (on Order: ${maxPayment.order})`);
        console.log(`✅ To KEEP (the split): ${others.map(o => o.amount.toLocaleString()).join(" + ")} = ${othersSum.toLocaleString()}`);

        if (!dryRun) {
          // 1. Delete the duplicate payment
          await Payment.findByIdAndDelete(maxPayment._id);

          // 2. Fix the order it was incorrectly applied to
          const order = await Order.findById(maxPayment.order);
          if (order) {
            console.log(`   🛠 Fixing Order ${order.orderNumber}: paidSum ${order.paidSum} -> ${order.paidSum - maxPayment.amount}`);
            order.paidSum = Math.max(0, (order.paidSum || 0) - maxPayment.amount);
            order.debt = Math.max(0, (order.totalSum || 0) - order.paidSum);
            // Also need to check if there was a surplus (negative debt) hidden in model.pre('save')
            // Actually Order.js pre-save caps paidSum at totalSum.
            // So if surplus happened, the paidSum is exactly totalSum.
            // When we deduct 898k, we might need a more precise calculation if it was capped.
            
            // Re-fetch all valid payments for this order to be 100% sure
            const validPayments = await Payment.find({ order: order._id });
            order.paidSum = validPayments.reduce((sum, p) => sum + p.amount, 0);
            if (order.paidSum > order.totalSum) order.paidSum = order.totalSum;
            order.debt = Math.max(0, order.totalSum - order.paidSum);
            
            await order.save();
          }
          fixedCount++;
          deletedAmount += maxPayment.amount;
        } else {
          fixedCount++;
        }
      }
    }

    if (!dryRun && fixedCount > 0) {
        // Update all users' debt just in case
        console.log("\n🔄 Updating all users' total debt...");
        const users = await User.find();
        for (const u of users) {
            await User.updateUserTotalDebt(u._id);
        }
    }

    console.log(`\n--- Summary ---`);
    console.log(`${dryRun ? "[DRY RUN] Would fix" : "[LIVE] Fixed"} ${fixedCount} duplicate sets.`);
    console.log(`Total amount ${dryRun ? "to be removed" : "removed"}: ${deletedAmount.toLocaleString()} so'm`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Set to false to actually apply changes
cleanupDuplicates(false);
