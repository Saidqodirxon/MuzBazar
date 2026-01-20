const { Order, Product } = require("../../server/models");
const Keyboards = require("../keyboards");

/**
 * Order management handlers
 */

const orderHandler = {
  // User's cart storage (in real app, use Redis or session)
  userCarts: new Map(),

  // Helper: format sum with spaces (1 000 000)
  formatSum(amount) {
    const num = Number(amount || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  },

  // Add item to cart
  async addToCart(ctx) {
    try {
      const [, productId, quantity] = ctx.match[0].split("_");
      const userId = ctx.user._id.toString();
      const qty = parseInt(quantity);

      const product = await Product.findById(productId);

      if (!product) {
        if (ctx.callbackQuery) {
          return ctx.answerCbQuery("❌ Mahsulot topilmadi.");
        } else {
          return ctx.reply("❌ Mahsulot topilmadi.");
        }
      }

      if (product.stock < qty) {
        const maxMsg = `❌ Kechirasiz, faqat ${product.stock} ta mavjud. Kamroq miqdor kiriting.`;
        if (ctx.callbackQuery) {
          return ctx.answerCbQuery(maxMsg);
        } else {
          return ctx.reply(maxMsg);
        }
      }

      // Get or create user cart
      if (!orderHandler.userCarts.has(userId)) {
        orderHandler.userCarts.set(userId, []);
      }

      const cart = orderHandler.userCarts.get(userId);

      // Check if product already in cart
      const existingItem = cart.find((item) => item.productId === productId);

      if (existingItem) {
        existingItem.quantity = parseInt(quantity);
        existingItem.totalPrice = existingItem.quantity * product.sellPrice;
      } else {
        cart.push({
          productId,
          name: product.name,
          price: product.sellPrice,
          quantity: parseInt(quantity),
          totalPrice: parseInt(quantity) * product.sellPrice,
        });
      }

      const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

      const cartKeyboard = Keyboards.cartActions();

      // Send response based on context type
      if (ctx.callbackQuery) {
        await ctx.editMessageText(
          `✅ <b>${product.name}</b> savatga qo'shildi!\n\n📦 Savat:\n${orderHandler.formatCart(cart)}\n\n💰 <b>Jami: ${orderHandler.formatSum(cartTotal)} so'm</b>`,
          { parse_mode: "HTML", ...cartKeyboard }
        );
        await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi`);
      } else {
        await ctx.reply(
          `✅ <b>${product.name}</b> savatga qo'shildi!\n\n📦 Savat:\n${orderHandler.formatCart(cart)}\n\n💰 <b>Jami: ${orderHandler.formatSum(cartTotal)} so'm</b>`,
          { parse_mode: "HTML", ...cartKeyboard }
        );
      }
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery("❌ Savatga qo'shishda xatolik.");
      } else {
        await ctx.reply("❌ Savatga qo'shishda xatolik.");
      }
    }
  },

  // Custom quantity input
  async handleCustomQuantity(ctx) {
    const match = ctx.match[0].split("_");
    const productId = match[1];

    ctx.session = ctx.session || {};
    ctx.session.awaitingQuantity = productId;

    const cancelKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "❌ Bekor qilish",
              callback_data: `cancel_qty_${productId}`,
            },
          ],
        ],
      },
    };

    // Delete current message (might be photo) and send new text message
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore delete errors
    }

    await ctx.reply("📝 Miqdorni kiriting (raqam ko'rinishida):", {
      parse_mode: "HTML",
      ...cancelKeyboard,
    });

    await ctx.answerCbQuery().catch(() => {});
  },

  // Process custom quantity input
  async processQuantityInput(ctx) {
    if (!ctx.session?.awaitingQuantity) return;

    const productId = ctx.session.awaitingQuantity;
    const quantity = parseInt(ctx.message.text);

    if (isNaN(quantity) || quantity <= 0) {
      const cancelKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "❌ Bekor qilish",
                callback_data: `cancel_qty_${productId}`,
              },
            ],
          ],
        },
      };
      return ctx.reply(
        "❌ Iltimos, to'g'ri miqdor kiriting (masalan: 5)",
        cancelKeyboard
      );
    }

    delete ctx.session.awaitingQuantity;

    // Add to cart with custom quantity
    ctx.match = [
      `qty_${productId}_${quantity}`,
      productId,
      quantity.toString(),
    ];
    await this.addToCart(ctx);
  },

  // Cancel quantity input
  async cancelQuantityInput(ctx) {
    const productId = ctx.match[0].split("_")[2];

    if (ctx.session) {
      delete ctx.session.awaitingQuantity;
    }

    // Return to product details
    const catalogHandler = require("./catalog");
    ctx.match = [`product_${productId}`, productId];
    await catalogHandler.showProductDetails(ctx);
  },

  // Show cart
  async showCart(ctx) {
    const userId = ctx.user._id.toString();
    const cart = orderHandler.userCarts.get(userId) || [];

    if (cart.length === 0) {
      return ctx.reply("📭 Savatingiz bo'sh.");
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const cartKeyboard = Keyboards.cartActions();
    await ctx.reply(
      `🛒 <b>Savatingiz:</b>

${orderHandler.formatCart(cart)}

💰 <b>Jami: ${orderHandler.formatSum(cartTotal)} so'm</b>`,
      { parse_mode: "HTML", ...cartKeyboard }
    );
  },

  // Place order
  async placeOrder(ctx) {
    try {
      const userId = ctx.user._id.toString();
      const cart = orderHandler.userCarts.get(userId) || [];

      if (cart.length === 0) {
        return ctx.answerCbQuery("❌ Savatingiz bo'sh.");
      }

      // Create order items
      const orderItems = [];
      let totalSum = 0;

      for (const item of cart) {
        const product = await Product.findById(item.productId);

        if (!product || product.stock < item.quantity) {
          return ctx.answerCbQuery(
            `❌ ${item.name} yetarli miqdorda mavjud emas.`
          );
        }

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          pricePerUnit: product.sellPrice,
          totalPrice: item.quantity * product.sellPrice,
        });

        // Decrease stock
        product.stock -= item.quantity;
        await product.save();

        totalSum += item.quantity * product.sellPrice;
      }

      // Create order
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 1000
      )}`;

      const order = new Order({
        orderNumber,
        client: ctx.user._id,
        items: orderItems,
        totalSum,
        debt: totalSum, // Initially all is debt
      });

      await order.save();

      // Clear cart
      orderHandler.userCarts.delete(userId);

      await ctx.editMessageText(
        `✅ <b>Buyurtma muvaffaqiyatli yaratildi!</b>

📋 Buyurtma raqami: <b>${order.orderNumber}</b>
💰 Summa: <b>${orderHandler.formatSum(order.totalSum)} so'm</b>

Buyurtmangiz tez orada ko'rib chiqiladi.`,
        { parse_mode: "HTML" }
      );

      // Notify sellers about new order
      await orderHandler.notifySellersAboutNewOrder(ctx, order);

      await ctx.answerCbQuery("✅ Buyurtma yaratildi!");
    } catch (error) {
      console.error("❌ Place order error:", error);
      await ctx.answerCbQuery("❌ Buyurtma yaratishda xatolik.");
    }
  },

  // Show user's orders
  async showMyOrders(ctx) {
    try {
      const orders = await Order.find({ client: ctx.user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("items.product");

      if (orders.length === 0) {
        return ctx.reply("📭 Sizda hali buyurtmalar yo'q.");
      }

      let message = `📦 <b>Buyurtmalaringiz:</b>

`;

      for (const order of orders) {
        const statusEmoji = orderHandler.getStatusEmoji(order.status);
        const statusText = orderHandler.getStatusText(order.status);
        message += `${statusEmoji} <b>${order.orderNumber}</b>
`;
        message += `📊 Holat: <b>${statusText}</b>
`;
        message += `📅 ${order.createdAt.toLocaleDateString("uz")}
`;
        message += `💰 ${orderHandler.formatSum(order.totalSum)} so'm`;
        if (order.debt > 0) {
          message += ` (qarz: ${orderHandler.formatSum(order.debt)} so'm)`;
        }
        message += `

`;
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("❌ Show orders error:", error);
      await ctx.reply("❌ Buyurtmalarni yuklashda xatolik.");
    }
  },

  // Helper: Format cart for display
  formatCart(cart) {
    return cart
      .map(
        (item, index) =>
          `${index + 1}. <b>${item.name}</b>
   ${item.quantity} x ${orderHandler.formatSum(item.price)} = ${orderHandler.formatSum(item.totalPrice)} so'm`
      )
      .join("\\n\\n");
  },

  // Helper: Get status emoji
  getStatusEmoji(status) {
    const emojis = {
      pending: "⏳",
      confirmed: "✅",
      delivered: "🚚",
      cancelled: "❌",
    };
    return emojis[status] || "❓";
  },

  // Helper: Get status text
  getStatusText(status) {
    const texts = {
      pending: "Kutilmoqda",
      confirmed: "Tasdiqlangan",
      delivered: "Yetkazilgan",
      cancelled: "Bekor qilingan",
    };
    return texts[status] || "Noma'lum";
  },

  // Helper: Notify sellers about new order
  async notifySellersAboutNewOrder(ctx, order) {
    try {
      const NotificationService = require("../../utils/notificationService");
      const notificationService = new NotificationService();

      await notificationService.notifyNewOrder(order);
      console.log(
        `📋 New order ${order.orderNumber} notification sent to sellers group`
      );
    } catch (error) {
      console.error("❌ Failed to notify sellers:", error);
    }
  },
};

module.exports = orderHandler;
