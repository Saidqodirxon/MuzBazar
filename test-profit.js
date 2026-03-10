const mongoose = require('mongoose');
require('dotenv').config();
const { Order, Product } = require('./src/server/models');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/muzbazar').then(async () => {
    const orders = await Order.find({ status: { $ne: 'cancelled' } }).limit(5);
    console.log(JSON.stringify(orders[0], null, 2));
    
    const profitAgg = await Order.aggregate([
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          {
            $unwind: {
              path: "$productInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
                totalPrice: "$items.totalPrice",
                pricePerUnit: "$items.pricePerUnit",
                quantity: "$items.quantity",
                costPrice: "$productInfo.costPrice",
                itemProfit: {
                  $subtract: [
                    { $ifNull: ["$items.totalPrice", { $multiply: [{ $ifNull: ["$items.pricePerUnit", { $ifNull: ["$productInfo.sellPrice", 0] }] }, "$items.quantity"] }] },
                    { $multiply: [{ $ifNull: ["$productInfo.costPrice", 0] }, "$items.quantity"] }
                  ]
                }
            }
          },
          { $sort: { itemProfit: 1 } },
          { $limit: 5 }
    ]);
    console.log("\nTop 5 Most Negative Profits:");
    console.log(JSON.stringify(profitAgg, null, 2));

    process.exit(0);
}).catch(console.error);
