const { Order, Payment } = require("../../server/models");
const { Markup } = require("telegraf");
const Keyboards = require("../keyboards");

/**
 * Seller handlers - sotuvchi uchun funksiyalar
 */

const sellerHandler = {
  // Show new orders for seller
  async showNewOrders(ctx) {
    try {
      const orders = await Order.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .populate("client", "firstName lastName telegramId phone notes")
        .populate("items.product", "name");

      if (orders.length === 0) {
        return ctx.reply("📭 Yangi buyurtmalar yo'q.");
      }

      let message = `📋 <b>Yangi buyurtmalar:</b>

`;

      for (const order of orders) {
        message += `🆔 <b>${order.orderNumber}</b>
`;
        message += `👤 ${order.client.firstName} ${order.client.lastName}
`;
        if (order.client.notes) {
          message += `📝 <b>Izoh: ${order.client.notes}</b>\n`;
        }
        message += `📱 @${order.client.telegramId}
`;
        message += `📅 ${order.createdAt.toLocaleDateString("uz")} ${order.createdAt.toLocaleTimeString("uz")}
`;
        message += `💰 <b>${sellerHandler.formatSum(order.totalSum)} so'm</b>
`;

        // Show items
        message += `📦 Mahsulotlar:
`;
        for (const item of order.items) {
          message += `   • ${item.product.name} x${item.quantity} - ${sellerHandler.formatSum(item.totalPrice)} so'm
`;
        }

        message += `
`;
      }

      const ordersKeyboard = this.newOrdersKeyboard(orders);
      await ctx.reply(message, {
        parse_mode: "HTML",
        ...ordersKeyboard,
      });
    } catch (error) {
      console.error("❌ Show new orders error:", error);
      await ctx.reply("❌ Buyurtmalarni yuklashda xatolik.");
    }
  },

  // Show confirmed orders
  async showConfirmedOrders(ctx) {
    try {
      const orders = await Order.find({
        status: "confirmed",
        seller: ctx.user._id,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("client", "firstName lastName notes")
        .populate("items.product", "name");

      if (orders.length === 0) {
        return ctx.reply("📭 Tasdiqlangan buyurtmalar yo'q.");
      }

      let message = `✅ <b>Tasdiqlangan buyurtmalar:</b>

`;

      for (const order of orders) {
        message += `🆔 <b>${order.orderNumber}</b>
`;
        message += `👤 ${order.client.firstName} ${order.client.lastName}\n`;
        if (order.client.notes) {
          message += `📝 <b>Izoh: ${order.client.notes}</b>\n`;
        }
        message += `💰 ${order.totalSum} so'm`;
        if (order.debt > 0) {
          message += ` (qarz: ${order.debt} so'm)`;
        }
        message += "\n\n";
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("❌ Show confirmed orders error:", error);
      await ctx.reply("❌ Buyurtmalarni yuklashda xatolik.");
    }
  },

  // Confirm order
  async confirmOrder(ctx) {
    try {
      const orderId = ctx.match[1];

      const order = await Order.findById(orderId)
        .populate("client", "firstName lastName telegramId")
        .populate("items.product", "name stock");

      if (!order) {
        return ctx.answerCbQuery("❌ Buyurtma topilmadi.");
      }

      if (order.status !== "pending") {
        return ctx.answerCbQuery("❌ Bu buyurtma allaqachon ko'rib chiqilgan.");
      }

      // Check stock availability
      for (const item of order.items) {
        if (item.product.stock < item.quantity) {
          return ctx.answerCbQuery(
            `❌ ${item.product.name} yetarli miqdorda yo'q.`
          );
        }
      }

      // Update order status and assign seller
      order.status = "confirmed";
      order.seller = ctx.user._id;
      await order.save();

      // Reduce stock
      for (const item of order.items) {
        item.product.stock -= item.quantity;
        await item.product.save();
      }

      await ctx.answerCbQuery("✅ Buyurtma tasdiqlandi!");

      // Notify client
      try {
        await ctx.telegram.sendMessage(
          order.client.telegramId,
          `✅ <b>Buyurtmangiz tasdiqlandi!</b>\n\n🆔 Buyurtma: ${order.orderNumber}\n💰 Summa: ${sellerHandler.formatSum(order.totalSum)} so'm\n\nTez orada sizga yetkazib beriladi.`,
          { parse_mode: "HTML" }
        );
      } catch (error) {
        console.error("Failed to notify client:", error);
      }

      await ctx.editMessageText(
        `✅ <b>Buyurtma tasdiqlandi: ${order.orderNumber}</b>`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("❌ Confirm order error:", error);
      await ctx.answerCbQuery("❌ Xatolik yuz berdi");
    }
  },

  // Show payment form
  async showPaymentForm(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.awaitingPayment = true;

    const backKeyboard = Keyboards.backToMain();
    await ctx.reply(
      "💰 <b>To'lov qabul qilish</b>\n\nBuyurtma raqamini kiriting:",
      { parse_mode: "HTML", ...backKeyboard }
    );
  },

  // Process payment
  async processPayment(ctx) {
    if (!ctx.session?.awaitingPayment) return;

    const orderNumber = ctx.message.text.trim();

    try {
      const order = await Order.findOne({ orderNumber }).populate(
        "client",
        "firstName lastName notes"
      );

      if (!order) {
        return ctx.reply(
          "❌ Buyurtma topilmadi. Buyurtma raqamini tekshiring."
        );
      }

      if (order.status !== "confirmed") {
        return ctx.reply(
          "❌ Bu buyurtma hali tasdiqlanmagan yoki yakunlangan."
        );
      }

      ctx.session.paymentOrder = order._id;
      ctx.session.awaitingPayment = false;
      ctx.session.awaitingPaymentAmount = true;

      await ctx.reply(
        `💰 <b>To'lov miqdorini kiriting</b>\n\n🆔 Buyurtma: <b>${order.orderNumber}</b>\n👤 Klient: ${order.client.firstName} ${order.client.lastName}\n${order.client.notes ? `📝 <b>Izoh: ${order.client.notes}</b>\n` : ''}💰 Umumiy summa: ${sellerHandler.formatSum(order.totalSum)} so'm\n📉 To'langan: ${sellerHandler.formatSum(order.paidSum)} so'm\n🔴 Qarz: ${sellerHandler.formatSum(order.debt)} so'm\n\n<b>To'lov miqdorini kiriting:</b>`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("❌ Process payment error:", error);
      await ctx.reply("❌ To'lovni qayta ishlashda xatolik.");
    }
  },

  // Process payment amount
  async processPaymentAmount(ctx) {
    if (!ctx.session?.awaitingPaymentAmount) return;

    const amount = parseFloat(ctx.message.text);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("❌ To'g'ri miqdor kiriting (masalan: 50000)");
    }

    try {
      const order = await Order.findById(ctx.session.paymentOrder).populate(
        "client",
        "firstName lastName telegramId"
      );

      if (!order) {
        return ctx.reply("❌ Buyurtma topilmadi.");
      }

      if (amount > order.debt) {
        return ctx.reply(
          `❌ To'lov miqdori qarzdan ko'p bo'lishi mumkin emas. Qarz: ${order.debt} so'm`
        );
      }

      // Add payment
      order.addPayment(amount);
      await order.save();

      // Create payment record
      const payment = new Payment({
        order: order._id,
        client: order.client._id,
        seller: ctx.user._id,
        amount: amount,
      });
      await payment.save();

      // Clear session
      delete ctx.session.paymentOrder;
      delete ctx.session.awaitingPaymentAmount;

      const sellerKeyboard = Keyboards.sellerMenu();
      await ctx.reply(
        `✅ <b>To'lov qabul qilindi!</b>\n\n💰 To'langan: ${sellerHandler.formatSum(amount)} so'm\n🔴 Qolgan qarz: ${sellerHandler.formatSum(order.debt)} so'm`,
        { parse_mode: "HTML", ...sellerKeyboard }
      );

      // Notify client
      try {
        await ctx.telegram.sendMessage(
          order.client.telegramId,
          `💰 <b>To'lovingiz qabul qilindi</b>\n\n🆔 Buyurtma: ${order.orderNumber}\n💰 To'langan: ${sellerHandler.formatSum(amount)} so'm\n🔴 Qolgan qarz: ${sellerHandler.formatSum(order.debt)} so'm`,
          { parse_mode: "HTML" }
        );
      } catch (notifyError) {
        console.error("Failed to notify client about payment:", notifyError);
      }
    } catch (error) {
      console.error("❌ Process payment amount error:", error);
      await ctx.reply("❌ To'lovni saqlashda xatolik.");
    }
  },

  // Helper: Create keyboard for new orders
  newOrdersKeyboard(orders) {
    const buttons = orders
      .slice(0, 5)
      .map((order) => [
        Markup.button.callback(
          `✅ ${order.orderNumber}`,
          `confirm_order_${order._id}`
        ),
      ]);

    return Markup.inlineKeyboard(buttons);
  },

  // Helpers
  formatSum(amount) {
    const num = Number(amount || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  },
};

module.exports = sellerHandler;
