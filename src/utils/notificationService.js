const { Telegraf } = require("telegraf");
const { User, Order, Settings } = require("../server/models");

/**
 * Notification Service - Xabar yuborish tizimi (Telegram Guruhga)
 */
class NotificationService {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
    this.requestTimeoutMs =
      Number(process.env.TELEGRAM_REQUEST_TIMEOUT_MS) || 7000;
  }

  async withTimeout(task, label = "telegram request") {
    let timeoutId;
    try {
      return await Promise.race([
        task(),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error(
                `${label} timeout after ${this.requestTimeoutMs}ms`
              )
            );
          }, this.requestTimeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Get Group ID from Settings or Env
   */
  async getGroupId() {
    try {
      const { Settings } = require("../server/models");
      const setting = await Settings.get("notification_group_id");
      return setting || process.env.NOTIFICATION_GROUP_ID;
    } catch (e) {
      return process.env.NOTIFICATION_GROUP_ID;
    }
  }

  /**
   * Get Seller Group ID from Settings or Env
   */
  async getSellerGroupId() {
    try {
      const { Settings } = require("../server/models");
      const setting = await Settings.get("seller_group_id");
      return setting || process.env.SELLER_GROUP_ID;
    } catch (e) {
      return process.env.SELLER_GROUP_ID;
    }
  }

  /**
   * Escape text for MarkdownV2
   */
  escapeMarkdownV2(text) {
    if (!text) return "";
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }

  /**
   * Send notification to Telegram group (Default: Admin Group)
   */
  async sendToGroup(message, options = {}) {
    try {
      const groupId = await this.getGroupId();
      if (!groupId) {
        console.warn("⚠️ NOTIFICATION_GROUP_ID not configured");
        return { success: false, error: "Group ID not configured" };
      }

      await this.withTimeout(
        () =>
          this.bot.telegram.sendMessage(groupId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            ...options,
          }),
        "sendToGroup"
      );

      console.log(`✅ Group notification sent`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send group notification:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to Seller Group
   */
  async sendToSellerGroup(message, options = {}) {
    try {
      const sellerGroupId = await this.getSellerGroupId();
      if (!sellerGroupId) {
        console.warn(
          "⚠️ SELLER_GROUP_ID not configured, falling back to Admin Group"
        );
        return this.sendToGroup(message, options);
      }

      await this.withTimeout(
        () =>
          this.bot.telegram.sendMessage(sellerGroupId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            ...options,
          }),
        "sendToSellerGroup"
      );

      console.log(`✅ Seller Group notification sent`);
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Failed to send seller group notification:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to single user
   */
  async sendToUser(telegramId, message, options = {}) {
    try {
      await this.withTimeout(
        () =>
          this.bot.telegram.sendMessage(telegramId, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...options,
          }),
        "sendToUser"
      );

      console.log(`✅ Notification sent to ${telegramId}`);
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Failed to send notification to ${telegramId}:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(telegramIds, message, options = {}) {
    const results = [];

    for (const telegramId of telegramIds) {
      const result = await this.sendToUser(telegramId, message, options);
      results.push({
        telegramId,
        ...result,
      });

      // Add delay to avoid rate limits
      await this.delay(100);
    }

    return results;
  }

  /**
   * Send debt notification to client
   */
  async sendDebtNotification(clientId, customMessage = null) {
    try {
      const user = await User.findById(clientId);
      if (!user) {
        throw new Error("User not found");
      }

      // Get user's debt with product details (excluding cancelled orders)
      const orders = await Order.find({
        client: clientId,
        status: { $ne: "cancelled" },
        debt: { $gt: 0 },
      }).populate("items.product");

      if (orders.length === 0) {
        throw new Error("No debt found");
      }

      const totalDebt = orders.reduce(
        (sum, order) => sum + (order.debt || 0),
        0
      );

      // Get debt notification message from settings
      const { Settings } = require("../server/models");
      const debtMessageTemplate = await Settings.get(
        "debt_notification_text",
        "Hurmatli mijoz! Sizda {summa} so'm qarzdorlik mavjud. Iltimos, to'lovni amalga oshiring. MUZ BAZAR"
      );

      // Build simple message format
      const formatSum = (num) =>
        (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      const totalSum = orders.reduce(
        (sum, order) => sum + (order.totalSum || 0),
        0
      );
      const totalPaid = orders.reduce(
        (sum, order) => sum + (order.paidSum || 0),
        0
      );

      // Use template message if customMessage provided
      if (customMessage) {
        const finalMessage = customMessage
          .replace("{summa}", formatSum(totalDebt))
          .replace("{ism}", user.firstName);
        return await this.sendToUser(user.telegramId, finalMessage);
      }

      // Simple format message
      let detailedMessage = `${user.firstName} ${user.lastName || ""}.\n\n`;
      detailedMessage += `Boshlang'ich qoldiq: ${formatSum(totalSum)}.\n`;
      detailedMessage += `To'lov summasi: ${formatSum(totalPaid)}.\n`;
      detailedMessage += `Umumiy qoldiq: ${formatSum(totalDebt)}.\n\n`;

      const now = new Date();
      const dateStr = now.toLocaleDateString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      detailedMessage += `Vaqti: ${dateStr} ${timeStr}`;

      const finalMessage = detailedMessage;

      return await this.sendToUser(user.telegramId, finalMessage);
    } catch (error) {
      console.error("❌ Debt notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk debt notifications
   */
  async sendBulkDebtNotifications(clientIds, customMessage = null) {
    const results = [];

    for (const clientId of clientIds) {
      const result = await this.sendDebtNotification(clientId, customMessage);
      results.push({
        clientId,
        ...result,
      });

      // Add delay between notifications
      await this.delay(200);
    }

    return results;
  }

  /**
   * Notify sellers about new order (send to Seller Group)
   */
  async notifyNewOrder(order) {
    try {
      console.log(`📤 Starting notifyNewOrder for order ${order._id}...`);

      // Populate order data
      const populatedOrder = await Order.findById(order._id)
        .populate("client", "firstName lastName username telegramId phone")
        .populate("items.product", "name");

      console.log(
        `📦 Order populated, client: ${populatedOrder.client?.firstName}`
      );

      const client = populatedOrder.client;

      // Build message using HTML format (easier than MarkdownV2)
      const clientName =
        `${client.firstName || ""} ${client.lastName || ""}`.trim();
      const telegramInfo = client.username
        ? `@${client.username}`
        : client.telegramId;
      const clientPhone = client.phone || "Kiritilmagan";
      const totalSum = (populatedOrder.totalSum || 0)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const timeStr = new Date().toLocaleString("uz-UZ", {
        timeZone: "Asia/Tashkent",
      });
      const siteUrl =
        process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orderUrl = `${siteUrl}/admin/orders/${populatedOrder._id}`;

      const productLines = populatedOrder.items
        .map((item) => {
          const price = (item.totalPrice || 0)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
          return `  • ${item.product.name} x${item.quantity} - ${price} so'm`;
        })
        .join("\n");

      const message = `🆕 <b>Yangi buyurtma!</b>

🆔 Buyurtma: <b>${populatedOrder.orderNumber}</b>
👤 Klient: ${clientName}
📞 Tel: <code>${clientPhone}</code>
📱 Telegram: ${telegramInfo}

📦 <b>Mahsulotlar:</b>
${productLines}

💰 <b>Jami summa: ${totalSum} so'm</b>
📅 Vaqt: ${timeStr}

✅ Tasdiqlash uchun admin panelga kiring:
${orderUrl}`;

      console.log(`📝 Message prepared, length: ${message.length} chars`);

      // Send to Seller Group
      const sellerResult = await this.sendToSellerGroup(message, {
        parse_mode: "HTML",
      });

      // Also send to Admin Group (Notification Group) if it's different
      const sellerGroupId = await this.getSellerGroupId();
      const adminGroupId = await this.getGroupId();

      if (adminGroupId && adminGroupId !== sellerGroupId) {
        await this.sendToGroup(message, {
          parse_mode: "HTML",
        });
        console.log(`✅ Order notification also sent to Admin Group`);
      }

      console.log(`✅ Order notification process completed`);
      return sellerResult;
    } catch (error) {
      console.error("❌ New order notification error:", error.message);
      console.error("❌ Full error:", error);
      if (error.response) {
        console.error("❌ Telegram response:", error.response.description);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify about low stock (send to group)
   */
  async notifyLowStock(products) {
    try {
      if (products.length === 0) {
        return { success: true, message: "No products to notify" };
      }

      const productList = products
        .map(
          (product) =>
            `• **${product.name}**: ${product.stock} ta qoldi (min: ${product.minStock})`
        )
        .join("\n");

      const message = [
        "⚠️ **Ombor ogohlantirishvi!**",
        "",
        "Quyidagi mahsulotlar tugab qolmoqda:",
        "",
        productList,
        "",
        "📦 Iltimos, yangi mahsulot kiriting.",
      ].join("\n");

      const result = await this.sendToGroup(message);

      console.log(`📦 Low stock notification sent to group`);
      return result;
    } catch (error) {
      console.error("❌ Low stock notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify client about order status
   */
  async notifyOrderStatus(orderId, status, customMessage = null) {
    try {
      const order = await Order.findById(orderId).populate("client");
      if (!order) {
        throw new Error("Order not found");
      }

      const statusMessages = {
        confirmed: "✅ Buyurtmangiz tasdiqlandi! Tez orada yetkazib beriladi.",
        delivered: "🚚 Buyurtmangiz yetkazib berildi! Xaridingiz uchun rahmat!",
        cancelled:
          "❌ Buyurtmangiz bekor qilindi. Iltimos, admin bilan bog'laning.",
      };

      const defaultMessage =
        statusMessages[status] || "Buyurtmangiz holati yangilandi.";
      const message = customMessage || defaultMessage;

      const fullMessage = [
        "📋 **Buyurtma yangilanishi**",
        "",
        `🆔 Buyurtma: **${order.orderNumber}**`,
        `💰 Summa: **${(order.totalSum || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
        "",
        message,
      ].join("\n");

      return await this.sendToUser(order.client.telegramId, fullMessage);
    } catch (error) {
      console.error("❌ Order status notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment confirmation
   */
  async notifyPaymentReceived(orderId, amount) {
    try {
      const order = await Order.findById(orderId).populate("client");
      if (!order) {
        throw new Error("Order not found");
      }

      const formatSum = (num) =>
        (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      const now = new Date();
      const dateStr = now.toLocaleDateString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const message = [
        `${order.client.firstName} ${order.client.lastName || ""}.`,
        "",
        `Boshlang'ich qoldiq: ${formatSum(order.totalSum)}.`,
        `To'lov summasi: ${formatSum(amount)}.`,
        `Umumiy qoldiq: ${formatSum(order.debt)}.`,
        "",
        `Vaqti: ${dateStr} ${timeStr}`,
      ].join("\n");

      return await this.sendToUser(order.client.telegramId, message);
    } catch (error) {
      console.error("❌ Payment notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome message to new user
   */
  async sendWelcomeMessage(user) {
    const message = [
      `Salom, ${user.firstName}! 👋`,
      "",
      "🛍️ **MUZ BAZAR**ga xush kelibsiz!",
      "",
      "Bizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz.",
      "",
      "📱 Botdan foydalanish uchun quyidagi tugmalardan birini tanlang:",
      "",
      "• 🛍️ Mahsulotlar - Katalogni ko'rish",
      "• 📦 Buyurtmalarim - Buyurtma tarixi",
      "• 💰 Qarzdorlik - To'lov ma'lumotlari",
      "• 📞 Aloqa - Bog'lanish",
      "",
      "❓ Yordam kerak bo'lsa: @muzbazar_admin",
    ].join("\n");

    return await this.sendToUser(user.telegramId, message);
  }

  /**
   * Helper: Add delay
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test notification system
   */
  async testNotification(telegramId) {
    const message = [
      "🧪 **Test xabari**",
      "",
      "Notification tizimi ishlayapti!",
      `⏰ Vaqt: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
      "",
      "✅ MUZ BAZAR Bot",
    ].join("\n");

    return await this.sendToUser(telegramId, message);
  }
}

module.exports = NotificationService;
