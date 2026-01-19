const { Telegraf } = require("telegraf");
const { User, Order, Settings } = require("../server/models");

/**
 * Notification Service - Xabar yuborish tizimi (Telegram Guruhga)
 */
class NotificationService {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
    this.groupId = process.env.NOTIFICATION_GROUP_ID;
  }

  /**
   * Send notification to Telegram group
   */
  async sendToGroup(message, options = {}) {
    try {
      if (!this.groupId) {
        console.warn("⚠️ NOTIFICATION_GROUP_ID not configured");
        return { success: false, error: "Group ID not configured" };
      }

      await this.bot.telegram.sendMessage(this.groupId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...options,
      });

      console.log(`✅ Group notification sent`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send group notification:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to single user
   */
  async sendToUser(telegramId, message, options = {}) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...options,
      });

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

      // Get user's debt
      const orders = await Order.find({
        client: clientId,
        debt: { $gt: 0 },
      });

      if (orders.length === 0) {
        throw new Error("No debt found");
      }

      const totalDebt = orders.reduce((sum, order) => sum + order.debt, 0);

      // Get message template from settings or use default
      const defaultMessage = await Settings.get(
        "debt_notification_template",
        "Sizning qarzdorligingiz: {amount} so'm. Iltimos, to'lovni amalga oshiring."
      );

      const message = customMessage || defaultMessage;
      const finalMessage = message.replace(
        "{amount}",
        new Intl.NumberFormat("uz-UZ").format(totalDebt)
      );

      const fullMessage = `🔔 **Qarzdorlik eslatmasi**

${finalMessage}

📞 Aloqa: @muzbazar_admin`;

      return await this.sendToUser(user.telegramId, fullMessage);
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
   * Notify sellers about new order (send to group)
   */
  async notifyNewOrder(order) {
    try {
      // Populate order data
      const populatedOrder = await Order.findById(order._id)
        .populate("client", "firstName lastName username telegramId")
        .populate("items.product", "name");

      const client = populatedOrder.client;

      // Build message
      const message = [
        "🆕 **Yangi buyurtma!**",
        "",
        `🆔 Buyurtma: **${populatedOrder.orderNumber}**`,
        `👤 Klient: ${client.firstName} ${client.lastName}`,
        `📱 Telegram: @${client.username || client.telegramId}`,
        "",
        "📦 **Mahsulotlar:**",
        ...populatedOrder.items.map(
          (item) =>
            `  • ${item.product.name} x${item.quantity} - ${new Intl.NumberFormat("uz-UZ").format(item.totalPrice)} so'm`
        ),
        "",
        `💰 **Jami summa: ${new Intl.NumberFormat("uz-UZ").format(populatedOrder.totalSum)} so'm**`,
        `📅 Vaqt: ${new Date().toLocaleString("uz-UZ")}`,
        "",
        "✅ Tasdiqlash uchun admin panelga kiring:",
        `http://localhost:${process.env.PORT || 3000}/admin/orders/${populatedOrder._id}`,
      ].join("\n");

      // Send to group
      const result = await this.sendToGroup(message);

      console.log(`📋 New order notification sent to group`);
      return result;
    } catch (error) {
      console.error("❌ New order notification error:", error);
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
        `💰 Summa: **${new Intl.NumberFormat("uz-UZ").format(order.totalSum)} so'm**`,
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

      const message = [
        "💰 **To'lov qabul qilindi!**",
        "",
        `🆔 Buyurtma: **${order.orderNumber}**`,
        `💵 To\'langan: **${new Intl.NumberFormat("uz-UZ").format(amount)} so'm**`,
        `🔴 Qolgan qarz: **${new Intl.NumberFormat("uz-UZ").format(order.debt)} so'm**`,
        "",
        order.debt > 0
          ? "Qolgan qarzni ham to'lash uchun aloqaga chiqing."
          : "✅ Barcha to'lov amalga oshirildi!",
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
      `⏰ Vaqt: ${new Date().toLocaleString("uz-UZ")}`,
      "",
      "✅ MUZ BAZAR Bot",
    ].join("\n");

    return await this.sendToUser(telegramId, message);
  }
}

module.exports = NotificationService;
