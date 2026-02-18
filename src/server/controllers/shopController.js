const { User, Category, Product, Order } = require("../models");

const shopController = {
  // Login page
  async showLogin(req, res) {
    if (req.session.shopAuth) {
      return res.redirect("/shop");
    }
    res.render("shop/login", {
      title: "MuzBazar - Kirish",
      error: req.query.error,
    });
  },

  async login(req, res) {
    try {
      // PROD SECURITY: Disable manual ID login in production
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
          success: false,
          error: "Manual login disabled in production",
        });
      }

      const { telegramId } = req.body;
      const wantsJson =
        req.xhr || (req.headers.accept && req.headers.accept.includes("json"));

      // Find user by telegramId
      const user = await User.findOne({ telegramId });

      if (!user) {
        if (wantsJson)
          return res.json({
            success: false,
            error: "user_not_found",
            message: "Foydalanuvchi topilmadi",
          });
        return res.redirect("/shop/login?error=user_not_found");
      }

      if (!user.isActive) {
        if (wantsJson)
          return res.json({
            success: false,
            error: "account_inactive",
            message: "Hisob faol emas",
          });
        return res.redirect("/shop/login?error=account_inactive");
      }

      if (user.isBlocked) {
        if (wantsJson)
          return res.json({
            success: false,
            error: "account_blocked",
            message: "Sizning hisobingiz bloklangan",
          });
        return res.redirect("/shop/login?error=account_blocked");
      }

      // Set session
      req.session.shopAuth = true;
      req.session.shopUser = user;

      if (wantsJson) {
        return res.json({ success: true });
      }

      res.redirect("/shop");
    } catch (error) {
      console.error("❌ Shop login error:", error);
      if (
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("json"))
      ) {
        return res.status(500).json({ success: false, error: "server_error" });
      }
      res.redirect("/shop/login?error=server_error");
    }
  },

  // Logout
  async logout(req, res) {
    req.session.destroy();
    res.redirect("/shop/login");
  },

  // Shop Home (Categories & Products)
  async index(req, res) {
    try {
      const { category: categoryId, search } = req.query;

      // Fetch categories
      const categories = await Category.find({ isActive: true }).sort({
        sortOrder: 1,
        name: 1,
      });

      // Fetch products
      let filter = { isActive: true };

      if (categoryId) {
        filter.category = categoryId;
      }

      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      const products = await Product.find(filter)
        .populate("category")
        .sort({ sortOrder: 1, createdAt: -1 });

      res.render("shop/index", {
        title: "MuzBazar - Do'kon",
        categories,
        products,
        currentCategory: categoryId,
        searchQuery: search || "",
        user: req.user,
      });
    } catch (error) {
      console.error("❌ Shop index error:", error);
      res.status(500).render("error", {
        title: "Xatolik",
        message: "Ma'lumotlarni yuklashda xatolik yuz berdi",
      });
    }
  },

  // Order History
  async history(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const skip = (page - 1) * limit;

      const orders = await Order.find({ client: req.user._id })
        .populate("items.product")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments({ client: req.user._id });

      res.render("shop/history", {
        title: "MuzBazar - Buyurtmalarim",
        orders,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total,
        },
        user: req.user,
      });
    } catch (error) {
      console.error("❌ Shop history error:", error);
      res.status(500).render("error", {
        title: "Xatolik",
        message: "Buyurtmalar tarixini yuklashda xatolik",
      });
    }
  },

  // Telegram Web App Authentication
  async telegramAuth(req, res) {
    try {
      const { initData } = req.body;

      if (!initData) {
        return res.status(400).json({ error: "No data provided" });
      }

      // Check validation
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get("hash");
      urlParams.delete("hash");

      // Verify hash
      const dataCheckString = Array.from(urlParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => `${key}=${val}`)
        .join("\n");

      const secretKey = require("crypto")
        .createHmac("sha256", "WebAppData")
        .update(process.env.BOT_TOKEN)
        .digest();

      const calculatedHash = require("crypto")
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      if (calculatedHash !== hash) {
        return res.status(403).json({ error: "Invalid integrity signature" });
      }

      // Parse user data
      const userStr = urlParams.get("user");
      const userData = JSON.parse(userStr);

      // Find user
      const user = await User.findOne({ telegramId: userData.id });

      if (!user) {
        return res
          .status(404)
          .json({ error: "User not found. Please start the bot first." });
      }

      if (!user.isActive || user.isBlocked) {
        return res.status(403).json({ error: "Account issues" });
      }

      // Set session
      req.session.shopAuth = true;
      req.session.shopUser = user;

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Telegram auth error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Checkout API (called via AJAX from shop/index)
  async checkout(req, res) {
    try {
      const { items } = req.body;
      const client = req.user._id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Savat bo'sh" });
      }

      let totalSum = 0;
      const orderItems = [];
      const itemDetails = [];

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `${product.name} yetarli emas (omborda: ${product.stock})`,
          });
        }

        const itemTotal = product.sellPrice * item.quantity;
        totalSum += itemTotal;

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          pricePerUnit: product.sellPrice,
          totalPrice: itemTotal,
        });

        itemDetails.push(
          `${product.name} x ${item.quantity} = ${itemTotal.toLocaleString()} so'm`
        );

        // Reduce stock
        product.stock -= item.quantity;
        await product.save();
      }

      // Generate a unique order number
      const date = new Date();
      const dateStr =
        date.getFullYear().toString().slice(-2) +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        date.getDate().toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${dateStr}-${random}`;

      const order = new Order({
        orderNumber,
        client,
        items: orderItems,
        totalSum,
        debt: totalSum,
        status: "pending",
      });

      await order.save();

      // Return success immediately
      res.json({ success: true, orderId: order._id });

      // Notification in background
      setImmediate(async () => {
        try {
          const bot = require("../../bot");
          if (process.env.NOTIFICATION_GROUP_ID) {
            const clientName = (
              req.user.firstName +
              (req.user.lastName ? " " + req.user.lastName : "")
            )
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const clientPhone = req.user.phone || "Kiritilmagan";

            let message = `🆕 <b>Yangi buyurtma!</b>\n\n`;
            message += `🆔 ID: <code>${order._id}</code>\n`;
            message += `👤 Mijoz: <b>${clientName}</b>\n`;
            message += `📞 Tel: <code>${clientPhone}</code>\n\n`;
            message += `🛒 <b>Mahsulotlar:</b>\n`;
            message += itemDetails
              .map((d) => d.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
              .join("\n");
            message += `\n\n💰 <b>Jami: ${totalSum.toLocaleString()} so'm</b>\n`;
            message += `\n📍 <a href="${process.env.SITE_URL}/admin/orders/${order._id}">Admin panelda ko'rish</a>`;

            const sendTask = bot.telegram.sendMessage(
              process.env.NOTIFICATION_GROUP_ID,
              message,
              { parse_mode: "HTML" }
            );
            const timeoutTask = new Promise((_, r) =>
              setTimeout(() => r(new Error("Timeout")), 5000)
            );
            await Promise.race([sendTask, timeoutTask]);
          }
        } catch (err) {
          console.error("⚠️ Background notification warning:", err.message);
        }
      });
    } catch (error) {
      console.error("❌ Checkout error details:", error);
      res
        .status(500)
        .json({ success: false, message: "Server xatosi: " + error.message });
    }
  },
};

module.exports = shopController;
