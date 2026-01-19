const { Product, Category, Order } = require("../models");

const apiController = {
  // Get all products
  async getProducts(req, res) {
    try {
      const { category, active = true } = req.query;

      let filter = {};
      if (active === "true") filter.isActive = true;
      if (category) filter.category = category;

      const products = await Product.find(filter)
        .populate("category", "name")
        .sort({ sortOrder: 1, createdAt: -1 });

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("❌ API get products error:", error);
      res.status(500).json({
        success: false,
        message: "Mahsulotlarni yuklashda xatolik",
      });
    }
  },

  // Get single product
  async getProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id).populate(
        "category",
        "name description"
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Mahsulot topilmadi",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("❌ API get product error:", error);
      res.status(500).json({
        success: false,
        message: "Mahsulot ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Get all categories
  async getCategories(req, res) {
    try {
      const categories = await Category.find({ isActive: true }).sort({
        sortOrder: 1,
        name: 1,
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("❌ API get categories error:", error);
      res.status(500).json({
        success: false,
        message: "Kategoriyalarni yuklashda xatolik",
      });
    }
  },

  // Get orders
  async getOrders(req, res) {
    try {
      const { status, client, limit = 20, page = 1 } = req.query;

      let filter = {};
      if (status) filter.status = status;
      if (client) filter.client = client;

      const skip = (page - 1) * limit;

      const orders = await Order.find(filter)
        .populate("client", "firstName lastName telegramId")
        .populate("seller", "firstName lastName")
        .populate("items.product", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Order.countDocuments(filter);

      res.json({
        success: true,
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ API get orders error:", error);
      res.status(500).json({
        success: false,
        message: "Buyurtmalarni yuklashda xatolik",
      });
    }
  },

  // Create order
  async createOrder(req, res) {
    try {
      const { client, items, notes } = req.body;

      if (!client || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Noto'g'ri ma'lumot",
        });
      }

      // Calculate total and validate products
      const orderItems = [];
      let totalSum = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId);

        if (!product || product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `${product?.name || "Mahsulot"} yetarli miqdorda mavjud emas`,
          });
        }

        const itemTotal = item.quantity * product.sellPrice;
        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          pricePerUnit: product.sellPrice,
          totalPrice: itemTotal,
        });

        totalSum += itemTotal;
      }

      // Create order
      const order = new Order({
        client,
        items: orderItems,
        totalSum,
        debt: totalSum,
        notes,
      });

      await order.save();

      res.status(201).json({
        success: true,
        data: order,
        message: "Buyurtma yaratildi",
      });
    } catch (error) {
      console.error("❌ API create order error:", error);
      res.status(500).json({
        success: false,
        message: "Buyurtma yaratishda xatolik",
      });
    }
  },

  // Get single order
  async getOrder(req, res) {
    try {
      const order = await Order.findById(req.params.id)
        .populate("client")
        .populate("seller")
        .populate("items.product");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Buyurtma topilmadi",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("❌ API get order error:", error);
      res.status(500).json({
        success: false,
        message: "Buyurtma ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Get statistics
  async getStats(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalOrders, todayOrders, totalRevenue, totalDebt, pendingOrders] =
        await Promise.all([
          Order.countDocuments(),
          Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
          Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalSum" } } },
          ]),
          Order.aggregate([
            { $group: { _id: null, total: { $sum: "$debt" } } },
          ]),
          Order.countDocuments({ status: "pending" }),
        ]);

      res.json({
        success: true,
        data: {
          totalOrders,
          todayOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalDebt: totalDebt[0]?.total || 0,
          pendingOrders,
        },
      });
    } catch (error) {
      console.error("❌ API get stats error:", error);
      res.status(500).json({
        success: false,
        message: "Statistika ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Get sales statistics
  async getSalesStats(req, res) {
    try {
      const { period = "week" } = req.query;

      let groupBy;
      let matchDate = {};

      switch (period) {
        case "day":
          groupBy = {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          };
          matchDate = {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          };
          break;
        case "week":
          groupBy = { $dateToString: { format: "%Y-W%V", date: "$createdAt" } };
          matchDate = {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          };
          break;
        case "month":
          groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
          matchDate = {
            createdAt: {
              $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          };
          break;
      }

      const salesData = await Order.aggregate([
        { $match: matchDate },
        {
          $group: {
            _id: groupBy,
            totalSales: { $sum: "$totalSum" },
            totalOrders: { $sum: 1 },
            totalDebt: { $sum: "$debt" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        data: salesData,
      });
    } catch (error) {
      console.error("❌ API get sales stats error:", error);
      res.status(500).json({
        success: false,
        message: "Savdo statistikasini yuklashda xatolik",
      });
    }
  },

  // Get debt statistics
  async getDebtStats(req, res) {
    try {
      const debtStats = await Order.aggregate([
        { $match: { debt: { $gt: 0 } } },
        {
          $group: {
            _id: "$client",
            totalDebt: { $sum: "$debt" },
            orderCount: { $sum: 1 },
            lastOrder: { $max: "$createdAt" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            client: {
              _id: "$client._id",
              firstName: "$client.firstName",
              lastName: "$client.lastName",
              telegramId: "$client.telegramId",
            },
            totalDebt: 1,
            orderCount: 1,
            lastOrder: 1,
          },
        },
        { $sort: { totalDebt: -1 } },
      ]);

      res.json({
        success: true,
        data: debtStats,
      });
    } catch (error) {
      console.error("❌ API get debt stats error:", error);
      res.status(500).json({
        success: false,
        message: "Qarzdorlik statistikasini yuklashda xatolik",
      });
    }
  },

  // Test notification
  async testNotification(req, res) {
    try {
      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      const testMessage = [
        "🧪 **Test xabari**",
        "",
        "Notification tizimi ishlayapti!",
        `⏰ Vaqt: ${new Date().toLocaleString("uz-UZ")}`,
        "",
        "✅ MUZ BAZAR Bot",
      ].join("\\n");

      const result = await notificationService.sendToGroup(testMessage);

      if (result.success) {
        res.json({
          success: true,
          message: "Test xabari muvaffaqiyatli yuborildi",
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || "Xabar yuborishda xatolik",
        });
      }
    } catch (error) {
      console.error("❌ Test notification error:", error);
      res.status(500).json({
        success: false,
        message: "Test xabari yuborishda xatolik",
      });
    }
  },
};

module.exports = apiController;
