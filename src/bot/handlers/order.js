const { Order, Product } = require("../../server/models");
const Keyboards = require("../keyboards");

/**
 * Order management handlers
 */

const orderHandler = {
  // Helper: Get cart from session
  getCart(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.cart = ctx.session.cart || [];
    return ctx.session.cart;
  },

  // Helper: Save cart to session
  saveCart(ctx, cart) {
    ctx.session = ctx.session || {};
    ctx.session.cart = cart;
  },

  // Helper: Clear cart from session
  clearCart(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.cart = [];
  },

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
        await ctx
          .answerCbQuery(`❌ Faqat ${product.stock} ta mavjud`)
          .catch(() => {});

        // Re-show product details with error message
        const catalogHandler = require("./catalog");
        const populatedProduct =
          await Product.findById(productId).populate("category");

        const details = [
          `⚠️ <b>Omborda yetarli mahsulot yo'q!</b>`,
          ``,
          `📋 Siz buyurtma qildingiz: <b>${qty} ta</b>`,
          `📦 Omborda mavjud: <b>${product.stock} ta</b>`,
          ``,
          `💡 Iltimos, kamroq miqdor tanlang yoki kiriting.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `🛍️ <b>${populatedProduct.name}</b>`,
          `📁 Kategoriya: ${populatedProduct.category.name}`,
          `💰 Narxi: ${orderHandler.formatSum(populatedProduct.sellPrice)} so'm`,
          `📦 Mavjud: ${populatedProduct.stock} ${populatedProduct.type}`,
          `\n${populatedProduct.description || ""}`,
        ]
          .filter(Boolean)
          .join("\n");

        const Keyboards = require("../keyboards");
        const quantityKeyboard = Keyboards.quantityInline(productId);

        // Delete previous message and send with image
        try {
          await ctx.deleteMessage();
        } catch (delErr) {}

        if (populatedProduct.image) {
          const imageSource = catalogHandler.getImageSource(
            populatedProduct.image
          );
          if (imageSource) {
            try {
              await ctx.replyWithPhoto(imageSource, {
                caption: details + "\n\n<b>Miqdorni tanlang:</b>",
                parse_mode: "HTML",
                ...quantityKeyboard,
              });
            } catch (imgError) {
              console.error("Image send error:", imgError.message);
              await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
                parse_mode: "HTML",
                ...quantityKeyboard,
              });
            }
          } else {
            await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
              parse_mode: "HTML",
              ...quantityKeyboard,
            });
          }
        } else {
          await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
            parse_mode: "HTML",
            ...quantityKeyboard,
          });
        }

        return;
      }

      // Get cart from session
      const cart = orderHandler.getCart(ctx);

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

      // Save cart to session
      orderHandler.saveCart(ctx, cart);

      const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

      const cartKeyboard = Keyboards.cartActions();

      // Send response based on context type
      const cartMessage = `✅ <b>${product.name}</b> savatga qo'shildi!\n\n📦 Savat:\n${orderHandler.formatCart(cart)}\n\n💰 <b>Jami: ${orderHandler.formatSum(cartTotal)} so'm</b>`;

      if (ctx.callbackQuery) {
        // Answer callback query first to avoid timeout
        try {
          await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi`);
        } catch (cbErr) {
          // Ignore callback query timeout errors
          if (!cbErr.description?.includes("query is too old")) {
            console.error("⚠️ Callback query error:", cbErr.message);
          }
        }

        try {
          // Try to edit message text
          await ctx.editMessageText(cartMessage, {
            parse_mode: "HTML",
            ...cartKeyboard,
          });
        } catch (error) {
          // If can't edit (e.g., message is photo), delete and send new message
          if (
            error.description &&
            error.description.includes("no text in the message")
          ) {
            try {
              await ctx.deleteMessage();
            } catch (delErr) {
              // Ignore delete errors
            }
            await ctx.reply(cartMessage, {
              parse_mode: "HTML",
              ...cartKeyboard,
            });
          } else {
            throw error;
          }
        }
      } else {
        await ctx.reply(cartMessage, { parse_mode: "HTML", ...cartKeyboard });
      }
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery("❌ Savatga qo'shishda xatolik.");
        } catch (cbErr) {
          // Ignore callback query errors
        }
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

    // Check stock before proceeding
    const product = await Product.findById(productId).populate("category");
    if (!product) {
      delete ctx.session.awaitingQuantity;
      return ctx.reply("❌ Mahsulot topilmadi.");
    }

    if (product.stock < quantity) {
      // Show error with product image and quantity buttons
      const catalogHandler = require("./catalog");
      const details = [
        `⚠️ <b>Omborda yetarli mahsulot yo'q!</b>`,
        ``,
        `📋 Siz buyurtma qildingiz: <b>${quantity} ta</b>`,
        `📦 Omborda mavjud: <b>${product.stock} ta</b>`,
        ``,
        `💡 Iltimos, kamroq miqdor tanlang yoki kiriting.`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `🛍️ <b>${product.name}</b>`,
        `📁 Kategoriya: ${product.category.name}`,
        `💰 Narxi: ${orderHandler.formatSum(product.sellPrice)} so'm`,
        `📦 Mavjud: ${product.stock} ${product.type}`,
        `\n${product.description || ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      const Keyboards = require("../keyboards");
      const quantityKeyboard = Keyboards.quantityInline(productId);

      if (product.image) {
        const imageSource = catalogHandler.getImageSource(product.image);
        if (imageSource) {
          try {
            await ctx.replyWithPhoto(imageSource, {
              caption: details + "\n\n<b>Miqdorni tanlang:</b>",
              parse_mode: "HTML",
              ...quantityKeyboard,
            });
          } catch (imgError) {
            console.error("Image send error:", imgError.message);
            await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
              parse_mode: "HTML",
              ...quantityKeyboard,
            });
          }
        } else {
          await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
            parse_mode: "HTML",
            ...quantityKeyboard,
          });
        }
      } else {
        await ctx.reply(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
          parse_mode: "HTML",
          ...quantityKeyboard,
        });
      }

      delete ctx.session.awaitingQuantity;
      return;
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
    const cart = orderHandler.getCart(ctx);

    if (cart.length === 0) {
      const Keyboards = require("../keyboards");
      const emptyCartKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛍️ Mahsulotlarni ko'rish",
                callback_data: "back_to_categories",
              },
            ],
          ],
        },
      };

      return ctx.reply(
        "📝 <b>Savatingiz bo'sh.</b>\n\n🛍️ Mahsulotlarni ko'rish uchun quyidagi tugmani bosing:",
        { parse_mode: "HTML", ...emptyCartKeyboard }
      );
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const cartKeyboard = Keyboards.cartActions();

    const message = `🛍️ <b>Savatingiz:</b>\n\n${orderHandler.formatCart(cart)}\n\n💰 <b>Jami: ${orderHandler.formatSum(cartTotal)} so'm</b>`;

    await ctx.reply(message, { parse_mode: "HTML", ...cartKeyboard });
  },

  // Place order
  async placeOrder(ctx) {
    try {
      const cart = orderHandler.getCart(ctx);

      if (cart.length === 0) {
        try {
          return await ctx.answerCbQuery("❌ Savatingiz bo'sh.");
        } catch (e) {
          return;
        }
      }

      // Check if user has phone number
      if (!ctx.user.phone) {
        ctx.session.pendingOrderPlacement = true;
        return await ctx.editMessageText(
          `📱 <b>Telefon raqamingizni kiriting:</b>\n\n` +
            `Buyurtmani rasmiylashtirish uchun telefon raqamingiz kerak.\n\n` +
            `Misol: +998901234567`,
          { parse_mode: "HTML" }
        );
      }

      // Check minimum order amount
      const { Settings } = require("../../server/models");
      const minOrderAmount = await Settings.get("min_order_amount", 0);
      const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

      if (minOrderAmount > 0 && cartTotal < minOrderAmount) {
        try {
          return await ctx.answerCbQuery(
            `❌ Minimal buyurtma summasi: ${orderHandler.formatSum(minOrderAmount)} so'm`,
            { show_alert: true }
          );
        } catch (e) {
          return;
        }
      }

      // Create order items
      const orderItems = [];
      let totalSum = 0;

      return await orderHandler.confirmOrderCreation(ctx);
    } catch (error) {
      console.error("❌ Place order error:", error);
      try {
        await ctx.answerCbQuery("❌ Buyurtma yaratishda xatolik.");
      } catch (e) {
        // Ignore callback query errors
      }
    }
  },

  // Confirm and create order
  async confirmOrderCreation(ctx) {
    try {
      const cart = orderHandler.getCart(ctx);

      if (cart.length === 0) {
        return await ctx.reply("❌ Savatingiz bo'sh.");
      }

      // Create order items
      const orderItems = [];
      let totalSum = 0;

      for (const item of cart) {
        const product = await Product.findById(item.productId);

        if (!product || product.stock < item.quantity) {
          const errorMsg = `❌ ${item.name} yetarli miqdorda mavjud emas.`;
          try {
            if (ctx.callbackQuery) {
              await ctx.answerCbQuery(errorMsg);
            } else {
              await ctx.reply(errorMsg);
            }
          } catch (e) {
            // Ignore errors
          }
          return;
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

      // Generate unique order number with retry logic and timestamp
      let orderNumber;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

        // Use timestamp seconds + random for uniqueness
        const timestamp = Math.floor(now.getTime() / 1000) % 10000; // Last 4 digits of timestamp
        const randomSuffix = Math.floor(Math.random() * 100);
        orderNumber = `MB${dateStr}${String(timestamp).padStart(4, "0")}${String(randomSuffix).padStart(2, "0")}`;

        // Check if order number already exists
        const existing = await Order.findOne({ orderNumber });
        if (!existing) {
          break;
        }

        attempts++;
        // Small delay to ensure different timestamp on retry
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (attempts >= maxAttempts) {
        throw new Error("Could not generate unique order number");
      }

      // Create order
      const order = new Order({
        orderNumber,
        client: ctx.user._id,
        items: orderItems,
        totalSum,
        debt: totalSum, // Initially all is debt
      });

      await order.save();

      // Clear cart
      orderHandler.clearCart(ctx);

      const responseMessage = `✅ <b>Buyurtma muvaffaqiyatli yaratildi!</b>

📋 Buyurtma raqami: <b>${order.orderNumber}</b>
💰 Summa: <b>${orderHandler.formatSum(order.totalSum)} so'm</b>

Buyurtmangiz tez orada ko'rib chiqiladi.`;

      // Try to edit message if coming from callback, otherwise reply
      try {
        if (ctx.callbackQuery) {
          await ctx.editMessageText(responseMessage, { parse_mode: "HTML" });
        } else {
          await ctx.reply(responseMessage, { parse_mode: "HTML" });
        }
      } catch (e) {
        // If edit fails, send as new message
        await ctx.reply(responseMessage, { parse_mode: "HTML" });
      }

      // Notify sellers about new order
      await orderHandler.notifySellersAboutNewOrder(ctx, order);

      try {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery("✅ Buyurtma yaratildi!");
        }
      } catch (e) {
        // Ignore callback query errors
      }
    } catch (error) {
      console.error("❌ Confirm order creation error:", error);
      const errorMsg = "❌ Buyurtma yaratishda xatolik yuz berdi.";
      try {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery(errorMsg);
        } else {
          await ctx.reply(errorMsg);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  },

  // Show user's orders
  async showMyOrders(ctx) {
    try {
      console.log(
        `📦 Loading orders for user: ${ctx.user?._id || "UNDEFINED"}`
      );

      if (!ctx.user || !ctx.user._id) {
        console.error("❌ User not found in context");
        return ctx.reply(
          "❌ Foydalanuvchi ma'lumotlari topilmadi. /start buyrug'ini qayta kiriting."
        );
      }

      const orders = await Order.find({ client: ctx.user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("items.product");

      console.log(`📦 Found ${orders.length} orders for user ${ctx.user._id}`);

      if (orders.length === 0) {
        return ctx.reply("📭 Sizda hali buyurtmalar yo'q.", {
          reply_markup: Keyboards.mainMenu(),
        });
      }

      let message = `📦 <b>Buyurtmalaringiz:</b>\n\n`;

      for (const order of orders) {
        const statusEmoji = orderHandler.getStatusEmoji(order.status);
        const statusText = orderHandler.getStatusText(order.status);
        message += `${statusEmoji} <b>${order.orderNumber}</b>\n`;
        message += `📊 Holat: <b>${statusText}</b>\n`;
        message += `📅 ${order.createdAt.toLocaleDateString("uz")}\n`;
        message += `💰 ${orderHandler.formatSum(order.totalSum)} so'm`;
        if (order.debt > 0) {
          message += ` (qarz: ${orderHandler.formatSum(order.debt)} so'm)`;
        }
        message += `\n\n`;
      }

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: Keyboards.mainMenu(),
      });
    } catch (error) {
      console.error("❌ Show orders error:", error);
      console.error("❌ Error stack:", error.stack);
      await ctx.reply("❌ Buyurtmalarni yuklashda xatolik.", {
        reply_markup: Keyboards.mainMenu(),
      });
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
      .join("\n\n");
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

      console.log(
        `📋 Attempting to send order ${order.orderNumber} notification...`
      );
      const result = await notificationService.notifyNewOrder(order);

      if (result && result.success) {
        console.log(
          `✅ Order ${order.orderNumber} notification sent to sellers group`
        );
      } else {
        console.error(
          `❌ Notification failed for order ${order.orderNumber}:`,
          result
        );
      }
    } catch (error) {
      console.error("❌ Failed to notify sellers:", error.message);
      console.error("Full error:", error);
    }
  },
};

module.exports = orderHandler;
