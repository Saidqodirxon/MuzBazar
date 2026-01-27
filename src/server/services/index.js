const NotificationService = require("../utils/notificationService");

/**
 * Service layer for business logic
 */

class OrderService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Process new order and send notifications
   */
  async processNewOrder(order) {
    try {
      // Populate order for notifications
      const populatedOrder = await order.populate("client items.product");

      // Notify sellers about new order
      await this.notificationService.notifyNewOrder(populatedOrder);

      // Check for low stock items
      const lowStockProducts = [];
      for (const item of populatedOrder.items) {
        if (item.product.isLowStock()) {
          lowStockProducts.push(item.product);
        }
      }

      // Notify about low stock if any
      if (lowStockProducts.length > 0) {
        await this.notificationService.notifyLowStock(lowStockProducts);
      }

      console.log(`📋 Order ${order.orderNumber} processed successfully`);
    } catch (error) {
      console.error("❌ Order processing error:", error);
    }
  }

  /**
   * Process payment and send notifications
   */
  async processPayment(order, amount) {
    try {
      // Update order debt
      order.addPayment(amount);
      await order.save();

      // Notify client about payment
      await this.notificationService.notifyPaymentReceived(order._id, amount);

      console.log(
        `💰 Payment processed for order ${order.orderNumber}: ${amount} som`
      );
    } catch (error) {
      console.error("❌ Payment processing error:", error);
    }
  }

  /**
   * Update order status and notify
   */
  async updateOrderStatus(orderId, newStatus, customMessage = null) {
    try {
      const { Order } = require("../server/models");
      const order = await Order.findByIdAndUpdate(
        orderId,
        { status: newStatus },
        { new: true }
      );

      if (order) {
        await this.notificationService.notifyOrderStatus(
          orderId,
          newStatus,
          customMessage
        );
        console.log(
          `📋 Order ${order.orderNumber} status updated to ${newStatus}`
        );
      }
    } catch (error) {
      console.error("❌ Order status update error:", error);
    }
  }
}

class UserService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Process new user registration
   */
  async processNewUser(user) {
    try {
      // Send welcome message
      await this.notificationService.sendWelcomeMessage(user);

      console.log(
        `👤 New user processed: ${user.fullName} (${user.telegramId})`
      );
    } catch (error) {
      console.error("❌ User processing error:", error);
    }
  }

  /**
   * Calculate user total debt
   */
  async calculateUserDebt(userId) {
    try {
      const { Order } = require("../server/models");

      const result = await Order.aggregate([
        { $match: { client: userId, status: { $ne: "cancelled" }, debt: { $gt: 0 } } },
        { $group: { _id: null, totalDebt: { $sum: "$debt" } } },
      ]);

      return result[0]?.totalDebt || 0;
    } catch (error) {
      console.error("❌ Debt calculation error:", error);
      return 0;
    }
  }
}

class StockService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Check and notify about low stock
   */
  async checkLowStock() {
    try {
      const { Product } = require("../server/models");

      const lowStockProducts = await Product.find({
        $expr: { $lte: ["$stock", "$minStock"] },
        isActive: true,
      });

      if (lowStockProducts.length > 0) {
        await this.notificationService.notifyLowStock(lowStockProducts);
        console.log(`📦 Found ${lowStockProducts.length} low stock products`);
      }

      return lowStockProducts;
    } catch (error) {
      console.error("❌ Stock check error:", error);
      return [];
    }
  }

  /**
   * Reduce product stock after order confirmation
   */
  async reduceStock(orderItems) {
    try {
      const { Product } = require("../server/models");

      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (product && product.reduceStock(item.quantity)) {
          await product.save();
        }
      }
    } catch (error) {
      console.error("❌ Stock reduction error:", error);
    }
  }
}

class ReportService {
  /**
   * Generate sales report
   */
  async getSalesReport(startDate, endDate) {
    try {
      const { Order, Product } = require("../server/models");

      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalSum" },
            totalPaid: { $sum: "$paidSum" },
            totalDebt: { $sum: "$debt" },
          },
        },
      ];

      const salesData = await Order.aggregate(pipeline);

      // Top selling products
      const topProductsPipeline = [
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ];

      const topProducts = await Order.aggregate(topProductsPipeline);

      return {
        summary: salesData[0] || {},
        topProducts,
      };
    } catch (error) {
      console.error("❌ Sales report error:", error);
      return { summary: {}, topProducts: [] };
    }
  }

  /**
   * Generate profit report
   */
  async getProfitReport() {
    try {
      const { Order } = require("../server/models");

      const pipeline = [
        { $match: { status: { $in: ["confirmed", "delivered"] } } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            quantity: "$items.quantity",
            sellPrice: "$items.pricePerUnit",
            costPrice: "$product.costPrice",
            profit: {
              $multiply: [
                "$items.quantity",
                { $subtract: ["$items.pricePerUnit", "$product.costPrice"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalProfit: { $sum: "$profit" },
            totalQuantitySold: { $sum: "$quantity" },
          },
        },
      ];

      const profitData = await Order.aggregate(pipeline);

      return profitData[0] || { totalProfit: 0, totalQuantitySold: 0 };
    } catch (error) {
      console.error("❌ Profit report error:", error);
      return { totalProfit: 0, totalQuantitySold: 0 };
    }
  }
}

module.exports = {
  OrderService,
  UserService,
  StockService,
  ReportService,
  NotificationService,
};
