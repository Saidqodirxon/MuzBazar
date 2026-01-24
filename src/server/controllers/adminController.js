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

      // Recent orders with payment calculations
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("client", "firstName lastName")
        .populate("items.product", "name");

      // Calculate balance for each order
      for (const order of recentOrders) {
        const payments = await Payment.find({ order: order._id });
        order.totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        order.debt = (order.totalSum || 0) - order.totalPaid;
      }

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

      // Get image from uploaded file
      let imageValue = "";
      if (req.file) {
        imageValue = `/uploads/products/${req.file.filename}`;
      }

      const product = new Product({
        name,
        category,
        description,
        image: imageValue,
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

      // Get existing product
      const existingProduct = await Product.findById(req.params.id);
      if (!existingProduct) {
        return res.redirect("/admin/products?error=not_found");
      }

      // Keep existing image or update with new file
      let imageValue = existingProduct.image;
      if (req.file) {
        imageValue = `/uploads/products/${req.file.filename}`;

        // Delete old image file
        if (
          existingProduct.image &&
          existingProduct.image.startsWith("/uploads/")
        ) {
          const fs = require("fs");
          const path = require("path");
          const oldImagePath = path.join(
            __dirname,
            "../../../public",
            existingProduct.image
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      await Product.findByIdAndUpdate(req.params.id, {
        name,
        category,
        description,
        image: imageValue,
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

  // Export products to Excel
  async exportProducts(req, res) {
    try {
      const ExcelJS = require("exceljs");

      console.log("📊 Starting products export...");

      const products = await Product.find()
        .populate("category")
        .sort({ name: 1 });

      console.log(`📊 Found ${products.length} products`);

      if (products.length === 0) {
        return res.redirect("/admin/products?error=no_products");
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Mahsulotlar");

      worksheet.columns = [
        { header: "Nomi", key: "name", width: 30 },
        { header: "Kategoriya", key: "category", width: 20 },
        { header: "O'lchov", key: "type", width: 15 },
        { header: "Tannarx", key: "costPrice", width: 15 },
        { header: "Sotish narxi", key: "sellPrice", width: 15 },
        { header: "Qolgan", key: "stock", width: 10 },
        { header: "Min. qolgan", key: "minStock", width: 12 },
        { header: "Status", key: "status", width: 10 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      const typeLabels = {
        piece: "Dona",
        kg: "Kilogram",
        liter: "Litr",
        box: "Quti",
      };

      products.forEach((product) => {
        worksheet.addRow({
          name: product.name,
          category: product.category?.name || "-",
          type: typeLabels[product.type] || product.type,
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          stock: product.stock,
          minStock: product.minStock,
          status: product.isActive ? "Faol" : "Nofaol",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=mahsulotlar-${Date.now()}.xlsx`
      );

      // Write to buffer first to avoid server memory issues
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);

      console.log("✅ Products export completed successfully");
    } catch (error) {
      console.error("❌ Export products error:", error);
      console.error("❌ Error stack:", error.stack);
      if (!res.headersSent) {
        res.redirect("/admin/products?error=export_failed");
      }
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

  // Export orders to Excel
  async exportOrders(req, res) {
    try {
      const ExcelJS = require("exceljs");
      const { status } = req.query;

      console.log("📊 Starting orders export...");

      let filter = {};
      if (status) filter.status = status;

      const orders = await Order.find(filter)
        .populate("client", "firstName lastName phone")
        .populate("items.product", "name")
        .sort({ createdAt: -1 });

      console.log(`📊 Found ${orders.length} orders`);

      if (orders.length === 0) {
        return res.redirect("/admin/orders?error=no_orders");
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Buyurtmalar");

      worksheet.columns = [
        { header: "Buyurtma №", key: "orderNumber", width: 15 },
        { header: "Klient", key: "client", width: 25 },
        { header: "Telefon", key: "phone", width: 15 },
        { header: "Boshlang'ich qoldiq", key: "totalSum", width: 20 },
        { header: "To'lov summasi", key: "paid", width: 20 },
        { header: "Umumiy qoldiq", key: "debt", width: 20 },
        { header: "Mahsulotlar", key: "products", width: 40 },
        { header: "Status", key: "status", width: 15 },
        { header: "Sana", key: "date", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      const statusLabels = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
      };

      let totalSum = 0;
      let totalPaid = 0;
      let totalDebt = 0;

      orders.forEach((order) => {
        const products = order.items
          .map((item) => `${item.product?.name || "?"} x${item.quantity}`)
          .join(", ");

        worksheet.addRow({
          orderNumber: order.orderNumber,
          client: order.client
            ? `${order.client.firstName} ${order.client.lastName || ""}`
            : "Noma'lum",
          phone: order.client?.phone || "-",
          totalSum: order.totalSum || 0,
          paid: order.paidSum || 0,
          debt: order.debt || 0,
          products,
          status: statusLabels[order.status] || order.status,
          date: new Date(order.createdAt).toLocaleDateString("uz-UZ"),
        });

        totalSum += order.totalSum || 0;
        totalPaid += order.paidSum || 0;
        totalDebt += order.debt || 0;
      });

      worksheet.addRow({});
      const totalRow = worksheet.addRow({
        orderNumber: "JAMI",
        totalSum,
        paid: totalPaid,
        debt: totalDebt,
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=buyurtmalar-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();

      console.log("✅ Orders export completed successfully");
    } catch (error) {
      console.error("❌ Export orders error:", error);
      console.error("❌ Error stack:", error.stack);
      if (!res.headersSent) {
        res.redirect("/admin/orders?error=export_failed");
      }
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
      const order = await Order.findById(req.params.id).populate("client");

      if (!order) {
        return res.redirect("/admin/orders?error=not_found");
      }

      const oldStatus = order.status;
      order.status = status;
      await order.save();

      // Send notification to client if status changed
      if (oldStatus !== status && order.client?.telegramId) {
        const NotificationService = require("../../utils/notificationService");
        const notificationService = new NotificationService();
        const { Settings } = require("../models");

        // Get custom message for confirmed status
        let statusText = "";
        if (status === "confirmed") {
          statusText = await Settings.get(
            "order_confirmed_message",
            "✅ Buyurtmangiz tasdiqlandi! Tez orada yetkazib beriladi."
          );
        } else {
          const statusMessages = {
            pending: "⏳ Sizning buyurtmangiz qabul qilindi va kutilmoqda.",
            delivered: "🎉 Buyurtmangiz yetkazildi! Xaridingiz uchun rahmat!",
            cancelled:
              "❌ Buyurtmangiz bekor qilindi. Batafsil ma'lumot uchun bog'laning.",
          };
          statusText = statusMessages[status] || status;
        }

        const totalSum = (order.totalSum || 0)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

        const message = `📋 <b>Buyurtma yangilanishi</b>

🆔 Buyurtma: <b>${order.orderNumber}</b>
📊 Yangi holat: ${statusText}
💰 Summa: <b>${totalSum} so'm</b>

📞 Savollar uchun: @muzbazar_admin`;

        await notificationService.sendToUser(order.client.telegramId, message, {
          parse_mode: "HTML",
        });

        console.log(
          `📬 Status notification sent to user ${order.client.telegramId} for order ${order.orderNumber}`
        );
      }

      res.redirect(`/admin/orders/${req.params.id}?success=status_updated`);
    } catch (error) {
      console.error("❌ Update order status error:", error);
      res.redirect(`/admin/orders/${req.params.id}?error=update_failed`);
    }
  },

  // Send order notification/reminder
  async sendOrderNotification(req, res) {
    try {
      const { message } = req.body;
      const order = await Order.findById(req.params.id).populate("client");

      if (!order) {
        return res.redirect("/admin/orders?error=not_found");
      }

      if (!order.client?.telegramId) {
        return res.redirect(`/admin/orders/${req.params.id}?error=no_telegram`);
      }

      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      const result = await notificationService.sendToUser(
        order.client.telegramId,
        message,
        { parse_mode: "HTML" }
      );

      if (result.success) {
        console.log(
          `📬 Notification sent to user ${order.client.telegramId} for order ${order.orderNumber}`
        );
        res.redirect(
          `/admin/orders/${req.params.id}?success=notification_sent`
        );
      } else {
        console.error("Failed to send notification:", result.error);
        res.redirect(`/admin/orders/${req.params.id}?error=send_failed`);
      }
    } catch (error) {
      console.error("❌ Send order notification error:", error);
      res.redirect(`/admin/orders/${req.params.id}?error=send_failed`);
    }
  },

  // Add Payment
  async addPayment(req, res) {
    try {
      const { amount, type } = req.body; // type: 'add' yoki 'subtract'
      const order = await Order.findById(req.params.id).populate("client");

      if (!order) return res.redirect("/admin/orders?error=not_found");

      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.redirect(
          `/admin/orders/${req.params.id}?error=invalid_amount`
        );
      }

      console.log(`💰 Processing payment: ${type}, Amount: ${paymentAmount}`);
      console.log(
        `📊 Current state - Total: ${order.totalSum}, Paid: ${order.paidSum}, Debt: ${order.debt}`
      );

      // Add payment to order
      if (type === "subtract") {
        // Qarzdan ayirish (to'lov qabul qilish)
        if (paymentAmount > order.debt) {
          return res.redirect(
            `/admin/orders/${req.params.id}?error=amount_exceeds_debt`
          );
        }

        order.paidSum = (order.paidSum || 0) + paymentAmount;
        order.debt = order.totalSum - order.paidSum;

        console.log(
          `✅ After payment - Total: ${order.totalSum}, Paid: ${order.paidSum}, Debt: ${order.debt}`
        );

        // Save order first
        await order.save();

        // Create Payment record
        const payment = new Payment({
          order: order._id,
          client: order.client._id,
          amount: paymentAmount,
          paymentMethod: "cash",
          notes: "Admin panel orqali to'lov qabul qilindi",
        });

        if (req.session.role === "seller") {
          payment.seller = req.session.sellerId;
        }

        await payment.save();

        // Send payment notification to client
        if (order.client?.telegramId) {
          const NotificationService = require("../../utils/notificationService");
          const notificationService = new NotificationService();

          await notificationService.notifyPaymentReceived(
            order._id,
            paymentAmount
          );
        }
      } else {
        // Qarzga qo'shish (narx berish)
        order.totalSum = (order.totalSum || 0) + paymentAmount;
        order.debt = order.totalSum - order.paidSum;

        console.log(
          `✅ After debt increase - Total: ${order.totalSum}, Paid: ${order.paidSum}, Debt: ${order.debt}`
        );

        // Save order
        await order.save();

        // Send notification about debt increase
        if (order.client?.telegramId) {
          const NotificationService = require("../../utils/notificationService");
          const notificationService = new NotificationService();

          try {
            await notificationService.sendToUser(
              order.client.telegramId,
              `📋 Buyurtma: <b>${order.orderNumber}</b>\n\n💰 Qarz yangilandi: +${paymentAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm\n🔴 Jami qarz: <b>${order.debt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm</b>`,
              { parse_mode: "HTML" }
            );
          } catch (err) {
            console.error("Failed to notify about debt increase:", err);
          }
        }
      }

      res.redirect(`/admin/orders/${req.params.id}?success=payment_added`);
    } catch (error) {
      console.error("❌ Add payment error:", error);
      res.redirect(`/admin/orders/${req.params.id}?error=payment_failed`);
    }
  },

  async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        return res.redirect("/admin/orders?error=payment_not_found");
      }

      const order = await Order.findById(payment.order);
      if (!order) {
        return res.redirect("/admin/orders?error=order_not_found");
      }

      // Update order payment info
      order.paidSum = Math.max(0, (order.paidSum || 0) - payment.amount);
      order.debt = order.totalSum - order.paidSum;
      await order.save();

      // Delete payment
      await Payment.findByIdAndDelete(paymentId);

      res.redirect(`/admin/orders/${order._id}?success=payment_deleted`);
    } catch (error) {
      console.error("❌ Delete payment error:", error);
      res.redirect("/admin/orders?error=delete_failed");
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

      // Calculate balance information for each user
      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          const userObj = user.toObject();
          const orders = await Order.find({ client: user._id });
          userObj.orderCount = orders.length;
          userObj.totalSpent = orders.reduce(
            (sum, order) => sum + (order.totalSum || 0),
            0
          );
          userObj.totalPaid = orders.reduce(
            (sum, order) => sum + (order.paidSum || 0),
            0
          );
          userObj.totalDebt = orders.reduce(
            (sum, order) => sum + (order.debt || 0),
            0
          );
          return userObj;
        })
      );

      res.render("admin/users", {
        title: "Foydalanuvchilar",
        users: usersWithBalances,
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

      res.redirect("/admin/users?success=status_updated");
    } catch (error) {
      console.error("❌ Toggle user status error:", error);
      res.redirect("/admin/users?error=update_failed");
    }
  },

  // Toggle user block status (for new users)
  async toggleUserBlock(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.redirect("/admin/users?error=user_not_found");
      }

      user.isBlocked = !user.isBlocked;
      await user.save();

      // Send notification to user if unblocked
      if (!user.isBlocked && user.telegramId) {
        try {
          const NotificationService = require("../../utils/notificationService");
          const notificationService = new NotificationService();
          const { Settings } = require("../models");

          // Get message from settings
          let message = await Settings.get(
            "user_unblocked_message",
            "✅ <b>Hisobingiz faollashtirildi!</b>\n\n" +
              "🎉 Salom, {ism}! Sizning hisobingiz admin tomonidan tasdiqlandi.\n\n" +
              "🛍️ Endi botdan to'liq foydalanishingiz mumkin!\n\n" +
              "📱 /start buyrug'ini bosing va xarid qilishni boshlang!"
          );

          // Replace {ism} with user's first name
          message = message.replace(/{ism}/g, user.firstName);

          await notificationService.sendToUser(user.telegramId, message, {
            parse_mode: "HTML",
          });
        } catch (notifError) {
          console.error("❌ Failed to send unblock notification:", notifError);
        }
      }

      res.redirect("/admin/users?success=block_status_updated");
    } catch (error) {
      console.error("❌ Toggle user block error:", error);
      res.redirect("/admin/users?error=update_failed");
    }
  },

  // Send notification to single user
  async sendUserNotification(req, res) {
    try {
      const { message } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.redirect("/admin/users?error=not_found");
      }

      if (!user.telegramId) {
        return res.redirect("/admin/users?error=no_telegram");
      }

      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      const result = await notificationService.sendToUser(
        user.telegramId,
        message
      );

      if (result.success) {
        res.redirect("/admin/users?success=notification_sent");
      } else {
        res.redirect("/admin/users?error=send_failed");
      }
    } catch (error) {
      console.error("❌ Send user notification error:", error);
      res.redirect("/admin/users?error=send_failed");
    }
  },

  // Export user debt details to Excel
  async exportUserDebt(req, res) {
    try {
      const ExcelJS = require("exceljs");
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.redirect("/admin/users?error=not_found");
      }

      const orders = await Order.find({ client: user._id, debt: { $gt: 0 } })
        .populate("items.product")
        .sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Qarzdorlik");

      worksheet.columns = [
        { header: "Buyurtma №", key: "orderNumber", width: 15 },
        { header: "Sana", key: "date", width: 15 },
        { header: "Mahsulot", key: "product", width: 30 },
        { header: "Miqdor", key: "quantity", width: 10 },
        { header: "Narx", key: "price", width: 15 },
        { header: "Jami summa", key: "totalSum", width: 15 },
        { header: "To'landi", key: "paid", width: 15 },
        { header: "Qarz", key: "debt", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font.color = { argb: "FFFFFFFF" };

      const statusLabels = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
      };

      orders.forEach((order) => {
        order.items.forEach((item, index) => {
          worksheet.addRow({
            orderNumber: index === 0 ? order.orderNumber : "",
            date:
              index === 0
                ? new Date(order.createdAt).toLocaleDateString("uz-UZ")
                : "",
            product: item.product?.name || "Mahsulot",
            quantity: item.quantity,
            price: item.price,
            totalSum: index === 0 ? order.totalSum : "",
            paid: index === 0 ? order.paidSum || 0 : "",
            debt: index === 0 ? order.debt : "",
            status:
              index === 0 ? statusLabels[order.status] || order.status : "",
          });
        });
      });

      const totalDebt = orders.reduce((sum, order) => sum + order.debt, 0);
      worksheet.addRow({});
      const totalRow = worksheet.addRow({
        orderNumber: "JAMI",
        debt: totalDebt,
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${user.firstName}-qarzdorlik-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ Export user debt error:", error);
      res.redirect(`/admin/users/${req.params.id}?error=export_failed`);
    }
  },

  // Export all user orders to Excel
  async exportUserOrders(req, res) {
    try {
      const ExcelJS = require("exceljs");
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.redirect("/admin/users?error=not_found");
      }

      const orders = await Order.find({ client: user._id })
        .populate("items.product")
        .sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Buyurtmalar");

      worksheet.columns = [
        { header: "Buyurtma №", key: "orderNumber", width: 15 },
        { header: "Sana", key: "date", width: 15 },
        { header: "Mahsulot", key: "product", width: 30 },
        { header: "Miqdor", key: "quantity", width: 10 },
        { header: "Narx", key: "price", width: 15 },
        { header: "Jami summa", key: "totalSum", width: 15 },
        { header: "To'landi", key: "paid", width: 15 },
        { header: "Qarz", key: "debt", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      const statusLabels = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
      };

      let grandTotal = 0;
      let grandPaid = 0;
      let grandDebt = 0;

      orders.forEach((order) => {
        order.items.forEach((item, index) => {
          worksheet.addRow({
            orderNumber: index === 0 ? order.orderNumber : "",
            date:
              index === 0
                ? new Date(order.createdAt).toLocaleDateString("uz-UZ")
                : "",
            product: item.product?.name || "Mahsulot",
            quantity: item.quantity,
            price: item.price,
            totalSum: index === 0 ? order.totalSum : "",
            paid: index === 0 ? order.paidSum || 0 : "",
            debt: index === 0 ? order.debt : "",
            status:
              index === 0 ? statusLabels[order.status] || order.status : "",
          });
        });
        grandTotal += order.totalSum || 0;
        grandPaid += order.paidSum || 0;
        grandDebt += order.debt || 0;
      });

      worksheet.addRow({});
      const totalRow = worksheet.addRow({
        orderNumber: "JAMI",
        totalSum: grandTotal,
        paid: grandPaid,
        debt: grandDebt,
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${user.firstName}-buyurtmalar-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ Export user orders error:", error);
      res.redirect(`/admin/users/${req.params.id}?error=export_failed`);
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
            totalSum: { $sum: "$totalSum" },
            totalPaid: { $sum: "$paidSum" },
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
          // Check if client has telegramId
          if (!debt.client.telegramId) {
            console.log(`Skipping ${debt.client.firstName}: no telegramId`);
            failCount++;
            continue;
          }

          // Replace {summa} with actual debt amount
          const personalMessage = message.replace(
            /{summa}/g,
            (debt.totalDebt || 0)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
          );

          const result = await notificationService.sendToUser(
            debt.client.telegramId,
            `💰 ${personalMessage}`,
            { parse_mode: "HTML" }
          );

          if (result.success) {
            successCount++;
          } else {
            console.error(
              `Failed to send to ${debt.client.firstName}:`,
              result.error
            );
            failCount++;
          }
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

  // Export debts to Excel
  async exportDebts(req, res) {
    try {
      const ExcelJS = require("exceljs");

      console.log("📊 Starting debts export...");

      // Get debts data
      const debts = await Order.aggregate([
        { $match: { debt: { $gt: 0 } } },
        {
          $group: {
            _id: "$client",
            totalDebt: { $sum: "$debt" },
            totalSum: { $sum: "$totalSum" },
            totalPaid: { $sum: "$paidSum" },
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

      console.log(`📊 Found ${debts.length} clients with debts`);

      if (debts.length === 0) {
        return res.redirect("/admin/debts?error=no_debts");
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Qarzdorlik");

      // Add headers
      worksheet.columns = [
        { header: "Ism", key: "firstName", width: 20 },
        { header: "Familiya", key: "lastName", width: 20 },
        { header: "Telefon", key: "phone", width: 15 },
        { header: "Buyurtmalar", key: "orderCount", width: 15 },
        { header: "Boshlang'ich qoldiq (so'm)", key: "totalSum", width: 25 },
        { header: "To'lov summasi (so'm)", key: "totalPaid", width: 25 },
        { header: "Umumiy qoldiq (so'm)", key: "debt", width: 25 },
        { header: "Oxirgi buyurtma", key: "lastOrder", width: 20 },
      ];

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data
      debts.forEach((debt) => {
        worksheet.addRow({
          firstName: debt.client.firstName || "",
          lastName: debt.client.lastName || "",
          phone: debt.client.phone || "",
          orderCount: debt.orderCount || 0,
          totalSum: debt.totalSum || 0,
          totalPaid: debt.totalPaid || 0,
          debt: debt.totalDebt || 0,
          lastOrder: debt.lastOrder
            ? new Date(debt.lastOrder).toLocaleDateString("uz-UZ")
            : "",
        });
      });

      // Add total row
      const totalDebt = debts.reduce(
        (sum, debt) => sum + (debt.totalDebt || 0),
        0
      );
      const totalSum = debts.reduce(
        (sum, debt) => sum + (debt.totalSum || 0),
        0
      );
      const totalPaid = debts.reduce(
        (sum, debt) => sum + (debt.totalPaid || 0),
        0
      );
      worksheet.addRow({});
      const totalRow = worksheet.addRow({
        firstName: "JAMI",
        orderCount: debts.length,
        totalSum: totalSum,
        totalPaid: totalPaid,
        debt: totalDebt,
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=qarzdorlik-${Date.now()}.xlsx`
      );

      // Write to buffer first to avoid server memory issues
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);

      console.log("✅ Debts export completed successfully");
    } catch (error) {
      console.error("❌ Export debts error:", error);
      console.error("❌ Error stack:", error.stack);
      if (!res.headersSent) {
        res.redirect("/admin/debts?error=export_failed");
      }
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

  // Export reports to Excel
  async exportReports(req, res) {
    try {
      const ExcelJS = require("exceljs");
      const stats = await adminController.getDetailedStatistics();

      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Umumiy statistika
      const summarySheet = workbook.addWorksheet("Umumiy statistika");
      summarySheet.columns = [
        { header: "Ko'rsatkich", key: "label", width: 30 },
        { header: "Qiymat", key: "value", width: 25 },
      ];

      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      summarySheet.addRow({
        label: "Umumiy daromad",
        value: `${stats.totalRevenue || 0} so'm`,
      });
      summarySheet.addRow({
        label: "Jami buyurtmalar",
        value: stats.totalOrders || 0,
      });
      summarySheet.addRow({
        label: "O'rtacha buyurtma",
        value: `${stats.averageOrder || 0} so'm`,
      });
      summarySheet.addRow({
        label: "Foydalanuvchilar soni",
        value: stats.totalCustomers || 0,
      });
      summarySheet.addRow({
        label: "Bugungi buyurtmalar",
        value: stats.todayOrders || 0,
      });
      summarySheet.addRow({
        label: "Bugungi daromad",
        value: `${stats.todayRevenue || 0} so'm`,
      });
      summarySheet.addRow({
        label: "Oylik buyurtmalar",
        value: stats.monthlyOrders || 0,
      });
      summarySheet.addRow({
        label: "Oylik daromad",
        value: `${stats.monthlyRevenue || 0} so'm`,
      });
      summarySheet.addRow({
        label: "Umumiy qarzdorlik",
        value: `${stats.totalDebt || 0} so'm`,
      });
      summarySheet.addRow({
        label: "Umumiy foyda",
        value: `${stats.totalProfit || 0} so'm`,
      });

      // Sheet 2: Buyurtmalar (agar mavjud bo'lsa)
      const ordersSheet = workbook.addWorksheet("Buyurtmalar");
      ordersSheet.columns = [
        { header: "Buyurtma №", key: "orderNumber", width: 15 },
        { header: "Klient", key: "client", width: 25 },
        { header: "Jami summa", key: "totalSum", width: 15 },
        { header: "To'landi", key: "paid", width: 15 },
        { header: "Qarz", key: "debt", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Sana", key: "date", width: 15 },
      ];

      ordersSheet.getRow(1).font = { bold: true };
      ordersSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      ordersSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      const orders = await Order.find()
        .populate("client", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(100);

      const statusLabels = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
      };

      orders.forEach((order) => {
        ordersSheet.addRow({
          orderNumber: order.orderNumber,
          client: order.client
            ? `${order.client.firstName} ${order.client.lastName || ""}`
            : "Noma'lum",
          totalSum: order.totalSum || 0,
          paid: order.paidSum || 0,
          debt: order.debt || 0,
          status: statusLabels[order.status] || order.status,
          date: new Date(order.createdAt).toLocaleDateString("uz-UZ"),
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=hisobot-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ Export reports error:", error);
      res.redirect("/admin/reports?error=export_failed");
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

        // Find the setting
        const setting = await Settings.findOne({ key });
        if (!setting) continue;

        // Convert value based on type
        let convertedValue = value;
        if (setting.type === "number") {
          convertedValue = parseFloat(value) || 0;
        } else if (setting.type === "boolean") {
          convertedValue = value === "on" || value === "true";
        }

        // Update the setting
        await Settings.findOneAndUpdate(
          { key },
          { value: convertedValue, updatedAt: new Date() },
          { upsert: false }
        );
      }

      // Handle checkboxes that weren't sent (unchecked)
      const allSettings = await Settings.find({ type: "boolean" });
      for (const setting of allSettings) {
        if (!(setting.key in updates)) {
          await Settings.findOneAndUpdate(
            { key: setting.key },
            { value: false, updatedAt: new Date() }
          );
        }
      }

      res.redirect("/admin/settings?success=settings_updated");
    } catch (error) {
      console.error("❌ Update settings error:", error);
      res.redirect("/admin/settings?error=update_failed");
    }
  },

  async testDebtReminders(req, res) {
    try {
      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();
      const { Order } = require("../models");

      // Find clients with debt
      const debts = await Order.aggregate([
        { $match: { debt: { $gt: 0 } } },
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

      if (debts.length === 0) {
        return res.redirect("/admin/settings?error=no_debts_found");
      }

      // Send reminders
      let sentCount = 0;
      for (const debt of debts) {
        const result = await notificationService.sendDebtNotification(debt._id);
        if (result.success) sentCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(
        `💰 Test debt reminders sent to ${sentCount}/${debts.length} clients`
      );

      res.redirect(
        `/admin/settings?success=debt_reminders_sent&sent=${sentCount}&total=${debts.length}`
      );
    } catch (error) {
      console.error("❌ Test debt reminders error:", error);
      res.redirect("/admin/settings?error=test_failed");
    }
  },

  async testGroupNotification(req, res) {
    try {
      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      const testMessage = [
        "🧪 *Test Xabari*",
        "",
        `Vaqt: ${new Date().toLocaleString("uz-UZ")}`,
        "",
        "✅ Agar bu xabarni ko'rayotgan bo'lsangiz, guruh xabarlari ishlayapti\\!",
      ].join("\n");

      const result = await notificationService.sendToGroup(testMessage, {
        parse_mode: "MarkdownV2",
      });

      if (result.success) {
        res.redirect("/admin/settings?success=group_notification_sent");
      } else {
        res.redirect(
          `/admin/settings?error=group_notification_failed&message=${encodeURIComponent(result.error)}`
        );
      }
    } catch (error) {
      console.error("❌ Test group notification error:", error);
      res.redirect("/admin/settings?error=test_failed");
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
