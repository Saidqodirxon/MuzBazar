const {
  User,
  Seller,
  Category,
  Product,
  Order,
  Payment,
} = require("../models");
const moment = require("moment");
const bcrypt = require("bcrypt");

const adminController = {
  // Show login page
  async showLogin(req, res) {
    const error = req.query.error;
    let errorMessage = "";

    switch (error) {
      case "login_required":
        errorMessage = "Iltimos, tizimga kiring";
        break;
      case "access_denied":
        errorMessage = "Sizda admin huquqi yo'q";
        break;
      case "invalid_credentials":
        errorMessage = "Noto'g'ri login yoki parol";
        break;
      case "auth_error":
        errorMessage = "Avtorizatsiya xatosi";
        break;
    }

    res.render("admin/login", {
      title: "Admin Panel - Kirish",
      error: errorMessage,
    });
  },

  // Handle login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // 1. Check if Admin (Env variables)
      if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
      ) {
        req.session.adminAuth = true;
        req.session.role = "admin";
        req.session.adminUser = {
          name: "Admin",
          username: process.env.ADMIN_USERNAME,
          role: "admin",
        };
        return res.redirect("/admin/dashboard");
      }

      // 2. Check if Seller
      const seller = await Seller.findOne({ username });
      if (seller && seller.isActive) {
        const isMatch = await seller.comparePassword(password);
        if (isMatch) {
          req.session.adminAuth = true;
          req.session.role = "seller";
          req.session.sellerId = seller._id;
          req.session.adminUser = {
            name: `${seller.firstName} ${seller.lastName || ""}`,
            username: seller.username,
            role: "seller",
            id: seller._id,
          };

          // Update last login
          seller.lastLogin = new Date();
          await seller.save();

          return res.redirect("/admin/orders"); // Sellers go directly to orders
        }
      }

      return res.redirect("/admin?error=invalid_credentials");
    } catch (error) {
      console.error("❌ Admin login error:", error);
      res.redirect("/admin?error=auth_error");
    }
  },

  // Logout
  async logout(req, res) {
    req.session.destroy();
    res.redirect("/admin");
  },

  // Dashboard
  async dashboard(req, res) {
    try {
      // Get statistics
      const stats = await adminController.getStatistics();

      // Recent orders
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("client", "firstName lastName")
        .populate("items.product", "name");

      // Low stock products
      const lowStockProducts = await Product.find({
        $expr: { $lte: ["$stock", "$minStock"] },
      }).limit(5);

      res.render("admin/dashboard", {
        title: "Admin Dashboard",
        stats,
        recentOrders,
        lowStockProducts,
        moment,
      });
    } catch (error) {
      console.error("❌ Dashboard error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Dashboard ma'lumotlarini yuklashda xatolik",
      });
    }
  },

  // Categories
  async categories(req, res) {
    try {
      const categories = await Category.find().sort({
        sortOrder: 1,
        createdAt: -1,
      });

      res.render("admin/categories", {
        title: "Kategoriyalar",
        categories,
      });
    } catch (error) {
      console.error("❌ Categories error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Kategoriyalar ma'lumotini yuklashda xatolik",
      });
    }
  },

  // New category form
  async newCategory(req, res) {
    res.render("admin/category-form", {
      title: "Yangi Kategoriya",
      category: null,
    });
  },

  // Create category
  async createCategory(req, res) {
    try {
      const { name, description, sortOrder } = req.body;

      const category = new Category({
        name,
        description,
        sortOrder: parseInt(sortOrder) || 0,
      });

      await category.save();

      res.redirect("/admin/categories?success=created");
    } catch (error) {
      console.error("❌ Create category error:", error);
      res.redirect("/admin/categories?error=create_failed");
    }
  },

  // Edit category form
  async editCategory(req, res) {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.redirect("/admin/categories?error=not_found");
      }

      res.render("admin/category-form", {
        title: "Kategoriya tahrirlash",
        category,
      });
    } catch (error) {
      console.error("❌ Edit category error:", error);
      res.redirect("/admin/categories?error=load_failed");
    }
  },

  // Update category
  async updateCategory(req, res) {
    try {
      const { name, description, sortOrder, isActive } = req.body;

      await Category.findByIdAndUpdate(req.params.id, {
        name,
        description,
        sortOrder: parseInt(sortOrder) || 0,
        isActive: isActive === "on",
      });

      res.redirect("/admin/categories?success=updated");
    } catch (error) {
      console.error("❌ Update category error:", error);
      res.redirect("/admin/categories?error=update_failed");
    }
  },

  // Delete category
  async deleteCategory(req, res) {
    try {
      await Category.findByIdAndDelete(req.params.id);
      res.redirect("/admin/categories?success=deleted");
    } catch (error) {
      console.error("❌ Delete category error:", error);
      res.redirect("/admin/categories?error=delete_failed");
    }
  },

  // Products
  async products(req, res) {
    try {
      const { search } = req.query;
      let filter = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const products = await Product.find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 });

      res.render("admin/products", {
        title: "Mahsulotlar",
        products,
        search,
      });
    } catch (error) {
      console.error("❌ Products error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Mahsulotlar ma'lumotini yuklashda xatolik",
      });
    }
  },

  // New product form
  async newProduct(req, res) {
    try {
      const categories = await Category.find({ isActive: true }).sort({
        name: 1,
      });

      res.render("admin/product-form", {
        title: "Yangi Mahsulot",
        product: null,
        categories,
      });
    } catch (error) {
      console.error("❌ New product error:", error);
      res.redirect("/admin/products?error=load_failed");
    }
  },

  // Create product
  async createProduct(req, res) {
    try {
      const {
        name,
        category,
        description,
        type,
        costPrice,
        sellPrice,
        stock,
        minStock,
      } = req.body;

      const product = new Product({
        name,
        category,
        description,
        type,
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        stock: parseInt(stock),
        minStock: parseInt(minStock) || 5,
      });

      await product.save();

      res.redirect("/admin/products?success=created");
    } catch (error) {
      console.error("❌ Create product error:", error);
      res.redirect("/admin/products?error=create_failed");
    }
  },

  // Edit product form
  async editProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      const categories = await Category.find({ isActive: true }).sort({
        name: 1,
      });

      if (!product) {
        return res.redirect("/admin/products?error=not_found");
      }

      res.render("admin/product-form", {
        title: "Mahsulot tahrirlash",
        product,
        categories,
      });
    } catch (error) {
      console.error("❌ Edit product error:", error);
      res.redirect("/admin/products?error=load_failed");
    }
  },

  // Update product
  async updateProduct(req, res) {
    try {
      const {
        name,
        category,
        description,
        type,
        costPrice,
        sellPrice,
        stock,
        minStock,
        isActive,
      } = req.body;

      await Product.findByIdAndUpdate(req.params.id, {
        name,
        category,
        description,
        type,
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        stock: parseInt(stock),
        minStock: parseInt(minStock) || 5,
        isActive: isActive === "on",
      });

      res.redirect("/admin/products?success=updated");
    } catch (error) {
      console.error("❌ Update product error:", error);
      res.redirect("/admin/products?error=update_failed");
    }
  },

  // Delete product
  async deleteProduct(req, res) {
    try {
      await Product.findByIdAndDelete(req.params.id);
      res.redirect("/admin/products?success=deleted");
    } catch (error) {
      console.error("❌ Delete product error:", error);
      res.redirect("/admin/products?error=delete_failed");
    }
  },

  // Orders
  async orders(req, res) {
    try {
      const { status, page = 1, search } = req.query;
      const limit = 20;
      const skip = (page - 1) * limit;

      let filter = {};
      if (status) filter.status = status;

      if (search) {
        // Find users matching search first
        const users = await User.find({
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }).select("_id");

        const userIds = users.map((u) => u._id);

        filter.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          { client: { $in: userIds } },
        ];
      }

      const orders = await Order.find(filter)
        .populate("client", "firstName lastName telegramId")
        .populate("seller", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);

      res.render("admin/orders", {
        title: "Buyurtmalar",
        orders,
        currentStatus: status,
        search,
        pagination: {
          current: parseInt(page),
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        moment,
      });
    } catch (error) {
      console.error("❌ Orders error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Buyurtmalar ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Order details
  async orderDetails(req, res) {
    try {
      const order = await Order.findById(req.params.id)
        .populate("client")
        .populate("seller")
        .populate("items.product");

      if (!order) {
        return res.redirect("/admin/orders?error=not_found");
      }

      const payments = await Payment.find({ order: order._id })
        .populate("seller", "firstName lastName")
        .sort({ createdAt: -1 });

      res.render("admin/order-details", {
        title: `Buyurtma ${order.orderNumber}`,
        order,
        payments,
        moment,
      });
    } catch (error) {
      console.error("❌ Order details error:", error);
      res.redirect("/admin/orders?error=load_failed");
    }
  },

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      await Order.findByIdAndUpdate(req.params.id, { status });
      res.redirect(`/admin/orders/${req.params.id}?success=status_updated`);
    } catch (error) {
      console.error("❌ Update order status error:", error);
      res.redirect(`/admin/orders/${req.params.id}?error=update_failed`);
    }
  },

  // Add Payment
  async addPayment(req, res) {
    try {
      const { amount } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) return res.redirect("/admin/orders?error=not_found");

      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.redirect(
          `/admin/orders/${req.params.id}?error=invalid_amount`
        );
      }

      // Add payment to order (using method on Order model if exists, or manual)
      // Inspecting Order.js logic from memory/context: It likely has methods or just fields.
      // I'll manually update to be safe and simple.

      order.paidSum = (order.paidSum || 0) + paymentAmount;
      order.debt = Math.max(0, order.totalSum - order.paidSum);

      // If fully paid, maybe update status? Optional.
      await order.save();

      // Create Payment record
      const payment = new Payment({
        order: order._id,
        client: order.client, // Assuming populated or just ID? order.client is Ref.
        // If order.client is not populated, it is ID. If populated, it is object.
        // Order.findById(id) without populate returns ID. Safe.
        amount: paymentAmount,
        paymentMethod: "cash", // Default for Admin
        notes: "Admin panel orqali",
      });

      if (req.session.role === "seller") {
        payment.seller = req.session.sellerId;
      }
      // If admin, seller field is left empty (null)

      await payment.save();

      res.redirect(`/admin/orders/${req.params.id}?success=payment_added`);
    } catch (error) {
      console.error("❌ Add payment error:", error);
      res.redirect(`/admin/orders/${req.params.id}?error=payment_failed`);
    }
  },

  // Users
  async users(req, res) {
    try {
      const { search } = req.query;
      let filter = {};

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { telegramId: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(filter).sort({ createdAt: -1 });

      res.render("admin/users", {
        title: "Foydalanuvchilar",
        users,
        moment,
        search,
      });
    } catch (error) {
      console.error("❌ Users error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Foydalanuvchilar ma'lumotini yuklashda xatolik",
      });
    }
  },

  // User details
  async userDetails(req, res) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.redirect("/admin/users?error=not_found");
      }

      const orders = await Order.find({ client: user._id })
        .populate("items.product", "name")
        .sort({ createdAt: -1 })
        .limit(20);

      const totalDebt = orders.reduce((sum, order) => sum + order.debt, 0);
      const totalPaid = orders.reduce((sum, order) => sum + order.paidSum, 0);
      const totalSpent = orders.reduce((sum, order) => sum + order.totalSum, 0);

      // Add orders and stats to user object for template
      user.orders = orders;
      user.orderCount = orders.length;
      user.totalSpent = totalSpent;

      res.render("admin/user-details", {
        title: `Foydalanuvchi: ${user.fullName}`,
        user,
        stats: {
          totalDebt,
          totalPaid,
          totalOrders: orders.length,
        },
        moment,
      });
    } catch (error) {
      console.error("❌ User details error:", error);
      res.redirect("/admin/users?error=load_failed");
    }
  },

  // Update user role
  async updateUserRole(req, res) {
    try {
      const { role } = req.body;
      await User.findByIdAndUpdate(req.params.id, { role });
      res.redirect(`/admin/users/${req.params.id}?success=role_updated`);
    } catch (error) {
      console.error("❌ Update user role error:", error);
      res.redirect(`/admin/users/${req.params.id}?error=update_failed`);
    }
  },

  // Toggle user status
  async toggleUserStatus(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.redirect("/admin/users?error=user_not_found");
      }

      user.isActive = !user.isActive;
      await user.save();

      res.redirect(`/admin/users/${req.params.id}?success=status_updated`);
    } catch (error) {
      console.error("❌ Toggle user status error:", error);
      res.redirect(`/admin/users/${req.params.id}?error=update_failed`);
    }
  },

  // Sellers management
  async sellers(req, res) {
    try {
      const sellers = await Seller.find().sort({
        createdAt: -1,
      });

      res.render("admin/sellers", {
        title: "Sotuvchilar",
        sellers,
        moment,
      });
    } catch (error) {
      console.error("❌ Sellers error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Sotuvchilar maʼlumotini yuklashda xatolik",
      });
    }
  },

  // Add seller
  async addSeller(req, res) {
    try {
      const { firstName, lastName, username, password, phone } = req.body;

      const existingSeller = await Seller.findOne({ username });
      if (existingSeller) {
        return res.redirect("/admin/sellers?error=username_exists");
      }

      const seller = new Seller({
        firstName,
        lastName,
        username,
        password,
        phone,
      });

      await seller.save();

      res.redirect("/admin/sellers?success=seller_added");
    } catch (error) {
      console.error("❌ Add seller error:", error);
      res.redirect("/admin/sellers?error=add_failed");
    }
  },

  // Toggle seller status
  async toggleSellerStatus(req, res) {
    try {
      const seller = await Seller.findById(req.params.id);
      if (!seller) {
        return res.redirect("/admin/sellers?error=not_found");
      }

      seller.isActive = !seller.isActive;
      await seller.save();

      res.redirect("/admin/sellers?success=status_updated");
    } catch (error) {
      console.error("❌ Toggle seller status error:", error);
      res.redirect("/admin/sellers?error=update_failed");
    }
  },

  // Remove seller (permanently delete)
  async removeSeller(req, res) {
    try {
      await Seller.findByIdAndDelete(req.params.id);
      res.redirect("/admin/sellers?success=seller_removed");
    } catch (error) {
      console.error("❌ Remove seller error:", error);
      res.redirect("/admin/sellers?error=remove_failed");
    }
  },

  // Debts management
  async debts(req, res) {
    try {
      const debts = await Order.aggregate([
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
        { $sort: { totalDebt: -1 } },
      ]);

      res.render("admin/debts", {
        title: "Qarzdorlik boshqaruvi",
        debts,
        moment,
      });
    } catch (error) {
      console.error("❌ Debts error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Qarzdorlik ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Send debt notification
  async sendDebtNotification(req, res) {
    try {
      let { clientIds, message } = req.body;
      const mongoose = require("mongoose");

      // Convert to array if string
      if (typeof clientIds === "string") {
        clientIds = [clientIds];
      }

      if (!clientIds || clientIds.length === 0) {
        return res.redirect("/admin/debts?error=no_clients_selected");
      }

      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      // Convert string IDs to ObjectId
      const objectIds = clientIds
        .map((id) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (e) {
            return null;
          }
        })
        .filter((id) => id !== null);

      // Get clients and their debts
      const debts = await Order.aggregate([
        {
          $match: {
            client: { $in: objectIds },
            debt: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$client",
            totalDebt: { $sum: "$debt" },
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
      ]);

      let successCount = 0;
      let failCount = 0;

      for (const debt of debts) {
        try {
          // Replace {summa} with actual debt amount
          const personalMessage = message.replace(
            /{summa}/g,
            new Intl.NumberFormat("uz-UZ").format(debt.totalDebt)
          );

          await notificationService.sendToUser(
            debt.client.telegramId,
            `💰 ${personalMessage}`
          );
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${debt.client.telegramId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        res.redirect(`/admin/debts?success=sent_${successCount}`);
      } else {
        res.redirect("/admin/debts?error=send_failed");
      }
    } catch (error) {
      console.error("❌ Send notification error:", error);
      res.redirect("/admin/debts?error=send_failed");
    }
  },

  // Reports
  async reports(req, res) {
    try {
      const stats = await adminController.getDetailedStatistics();

      res.render("admin/reports", {
        title: "Hisobotlar",
        stats,
        moment,
      });
    } catch (error) {
      console.error("❌ Reports error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Hisobotlar ma'lumotini yuklashda xatolik",
      });
    }
  },

  // Export reports
  async exportReports(req, res) {
    try {
      const { format = "json" } = req.query;
      const stats = await this.getDetailedStatistics();

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=report-${Date.now()}.json`
        );
        res.json(stats);
      } else {
        res.status(400).json({ error: "Unsupported format" });
      }
    } catch (error) {
      console.error("❌ Export reports error:", error);
      res.status(500).json({ error: "Export xatolik" });
    }
  },

  // Settings
  async settings(req, res) {
    try {
      const { Settings } = require("../models");

      // Get all editable settings
      const settings = await Settings.find({ isEditable: true });

      // Convert to object for easier access in template
      const settingsObj = {};
      for (const setting of settings) {
        settingsObj[setting.key] = setting.value;
      }

      res.render("admin/settings", {
        title: "Sozlamalar",
        settings: settingsObj,
        allSettings: settings,
      });
    } catch (error) {
      console.error("❌ Settings error:", error);
      res.render("error", {
        title: "Xatolik",
        message: "Sozlamalarni yuklashda xatolik",
      });
    }
  },

  // Update settings
  async updateSettings(req, res) {
    try {
      const { Settings } = require("../models");
      const updates = req.body;

      // Update each setting
      for (const [key, value] of Object.entries(updates)) {
        // Skip _csrf and other non-setting fields
        if (key.startsWith("_")) continue;

        // Update the setting
        await Settings.findOneAndUpdate(
          { key },
          { value, updatedAt: new Date() },
          { upsert: false }
        );
      }

      res.redirect("/admin/settings?success=settings_updated");
    } catch (error) {
      console.error("❌ Update settings error:", error);
      res.redirect("/admin/settings?error=update_failed");
    }
  },

  // Profile
  async profile(req, res) {
    try {
      res.render("admin/profile", {
        title: "Profil",
        adminUser: req.session.adminUser,
      });
    } catch (error) {
      console.error("❌ Profile error:", error);
      res.redirect("/admin/dashboard?error=profile_failed");
    }
  },

  // Update password
  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validate current password
      if (currentPassword !== process.env.ADMIN_PASSWORD) {
        return res.redirect("/admin/profile?error=wrong_password");
      }

      // Validate new password
      if (newPassword !== confirmPassword) {
        return res.redirect("/admin/profile?error=password_mismatch");
      }

      if (newPassword.length < 6) {
        return res.redirect("/admin/profile?error=password_too_short");
      }

      // Note: In production, you would update .env file or use database
      // For now, just show success message
      res.redirect("/admin/profile?success=password_updated_note");
    } catch (error) {
      console.error("❌ Update password error:", error);
      res.redirect("/admin/profile?error=update_failed");
    }
  },

  // Helper: Get basic statistics
  async getStatistics() {
    const [
      totalProducts,
      totalCategories,
      totalOrders,
      totalUsers,
      totalDebt,
      todayOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$debt" } } }]),
      Order.countDocuments({
        createdAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999),
        },
      }),
    ]);

    return {
      totalProducts,
      totalCategories,
      totalOrders,
      totalUsers,
      totalDebt: totalDebt[0]?.total || 0,
      todayOrders,
    };
  },

  // Helper: Get detailed statistics
  async getDetailedStatistics() {
    try {
      const [
        totalRevenue,
        totalOrders,
        totalCustomers,
        todayOrders,
        todayRevenue,
        monthlyOrders,
        monthlyRevenue,
        totalDebt,
        totalProfit,
      ] = await Promise.all([
        // Total revenue (paid amount)
        Order.aggregate([
          { $group: { _id: null, total: { $sum: "$paidSum" } } },
        ]),
        // Total orders
        Order.countDocuments(),
        // Total customers
        User.countDocuments({ role: "client" }),
        // Today orders
        Order.countDocuments({
          createdAt: {
            $gte: new Date().setHours(0, 0, 0, 0),
          },
        }),
        // Today revenue
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          },
          { $group: { _id: null, total: { $sum: "$paidSum" } } },
        ]),
        // Monthly orders
        Order.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        }),
        // Monthly revenue
        Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1
                ),
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$paidSum" } } },
        ]),
        // Total debt
        Order.aggregate([{ $group: { _id: null, total: { $sum: "$debt" } } }]),
        // Total profit (sellPrice - costPrice)
        Order.aggregate([
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          { $unwind: "$productInfo" },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: [
                    {
                      $subtract: [
                        "$productInfo.sellPrice",
                        "$productInfo.costPrice",
                      ],
                    },
                    "$items.quantity",
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const averageOrder =
        totalOrders > 0
          ? Math.round((totalRevenue[0]?.total || 0) / totalOrders)
          : 0;

      return {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        totalCustomers,
        averageOrder,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthlyOrders,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        totalDebt: totalDebt[0]?.total || 0,
        totalProfit: totalProfit[0]?.total || 0,
      };
    } catch (error) {
      console.error("❌ Get detailed statistics error:", error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrder: 0,
        todayOrders: 0,
        todayRevenue: 0,
        monthlyOrders: 0,
        monthlyRevenue: 0,
        totalDebt: 0,
        totalProfit: 0,
      };
    }
  },
};

module.exports = adminController;
