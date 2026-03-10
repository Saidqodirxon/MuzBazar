const mongoose = require('mongoose');
require('dotenv').config();
const { Order, Product } = require('./src/server/models');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/muzbazar').then(async () => {
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
            $group: {
              _id: null,
              total: {
                $sum: {
                  $subtract: [
                    {
                      $ifNull: [
                        "$items.totalPrice",
                        {
                          $multiply: [
                            {
                              $ifNull: [
                                "$items.pricePerUnit",
                                { $ifNull: ["$productInfo.sellPrice", 0] },
                              ],
                            },
                            "$items.quantity",
                          ],
                        },
                      ],
                    },
                    {
                      $multiply: [
                        {
                          $cond: [
                            {
                              $gt: [
                                { $ifNull: ["$productInfo.costPrice", 0] },
                                {
                                  $ifNull: [
                                    "$items.pricePerUnit",
                                    { $ifNull: ["$productInfo.sellPrice", 0] },
                                  ],
                                },
                              ],
                            },
                            {
                              $ifNull: [
                                "$items.pricePerUnit",
                                { $ifNull: ["$productInfo.sellPrice", 0] },
                              ],
                            },
                            { $ifNull: ["$productInfo.costPrice", 0] },
                          ],
                        },
                        "$items.quantity",
                      ],
                    },
                  ],
                },
              },
            },
          }
    ]);
    console.log("\nFixed Total Profit:");
    console.log(JSON.stringify(profitAgg, null, 2));

    process.exit(0);
}).catch(console.error);
