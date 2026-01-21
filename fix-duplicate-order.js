const mongoose = require("mongoose");
const Order = require("./src/server/models/Order");

async function fixDuplicateOrder() {
  try {
    await mongoose.connect("mongodb://localhost:27017/test");
    console.log("Connected to MongoDB");

    // Find and delete the duplicate order
    const oldOrder = await Order.findOne({ orderNumber: "MB20260121001" });

    if (oldOrder) {
      console.log("Found old order:", oldOrder.orderNumber);
      await Order.deleteOne({ _id: oldOrder._id });
      console.log("✅ Deleted duplicate order!");
    } else {
      console.log("❌ Order MB20260121001 not found");
    }

    // List all orders with old format (without random suffix)
    const allOrders = await Order.find({}).select("orderNumber createdAt");
    console.log(`\n📋 Total orders in database: ${allOrders.length}`);

    if (allOrders.length > 0) {
      console.log("\nRecent orders:");
      allOrders.slice(-5).forEach((order) => {
        console.log(`  - ${order.orderNumber} (${order.createdAt})`);
      });
    }

    await mongoose.connection.close();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixDuplicateOrder();
