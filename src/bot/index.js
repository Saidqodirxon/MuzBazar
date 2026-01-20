const { Telegraf, session, Markup } = require("telegraf");
const { authMiddleware, adminOnly, sellerOnly } = require("./middlewares/auth");
const catalogHandler = require("./handlers/catalog");
const orderHandler = require("./handlers/order");
const sellerHandler = require("./handlers/seller");
const Keyboards = require("./keyboards");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware
bot.use(session());
bot.use(authMiddleware);

/**
 * Request phone number keyboard - faqat ulashish tugmasi
 */
const phoneKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Telefon raqamni ulashish")],
])
  .resize()
  .oneTime();

/**
 * Normalize phone number - har xil formatlarni standartlashtirish
 */
const normalizePhone = (phone) => {
  if (!phone) return null;

  // Faqat raqamlarni qoldirish
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Agar + bilan boshlanmasa va 998 bilan boshlanmasa
  if (!cleaned.startsWith("+") && !cleaned.startsWith("998")) {
    // Agar 9 bilan boshlansa (90, 91, 93...)
    if (cleaned.startsWith("9") && cleaned.length === 9) {
      cleaned = "+998" + cleaned;
    }
    // Agar 8 bilan boshlansa (890...)
    else if (cleaned.startsWith("8") && cleaned.length === 10) {
      cleaned = "+998" + cleaned.substring(1);
    } else {
      cleaned = "+998" + cleaned;
    }
  }
  // Agar 998 bilan boshlansa
  else if (cleaned.startsWith("998")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
};

/**
 * Bot command handlers
 */

// Handle contact (phone number) message
bot.on("contact", async (ctx) => {
  const user = ctx.user;

  if (ctx.message.contact && ctx.message.contact.user_id === ctx.from.id) {
    // Telefon raqamni normalize qilish
    user.phone = normalizePhone(ctx.message.contact.phone_number);
    await user.save();

    ctx.session = ctx.session || {};
    ctx.session.awaitingPhone = false;

    let keyboard;
    if (user.isAdmin()) {
      keyboard = Keyboards.adminMenu();
    } else if (user.isSeller()) {
      keyboard = Keyboards.sellerMenu();
    } else {
      keyboard = Keyboards.mainMenu();
    }

    return ctx.reply(
      `✅ Rahmat! Telefon raqamingiz saqlandi: ${user.phone}\n\n🛍️ Quyidagi menyudan foydalaning:`,
      { parse_mode: "Markdown", ...keyboard }
    );
  }
});

// Start command
bot.start(async (ctx) => {
  const user = ctx.user;

  // Reset session
  ctx.session = ctx.session || {};
  ctx.session.awaitingQuantity = false;
  ctx.session.awaitingPayment = false;
  ctx.session.awaitingPaymentAmount = false;

  // Check if user needs to provide phone
  if (!user.phone) {
    const { Settings } = require("../server/models");
    const welcomeMsg = await Settings.get(
      "welcome_message",
      "Salom! 🛍️ MUZ BAZARga xush kelibsiz!\n\nBizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz."
    );

    const welcomeMessage = `${welcomeMsg}\n\n📱 *Davom etish uchun telefon raqamingizni yuboring:*\n\nTugmani bosing yoki raqamni yozing:\nMasalan: \`901234567\` yoki \`+998901234567\``;

    ctx.session.awaitingPhone = true;

    return ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      ...phoneKeyboard,
    });
  }

  let welcomeMessage = `Salom, *${user.firstName}*! 👋\n\n`;

  if (user.isAdmin()) {
    welcomeMessage += "👑 Siz admin sifatida kirdingiz.";
    return ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      ...Keyboards.adminMenu(),
    });
  }

  if (user.isSeller()) {
    welcomeMessage += "🧑‍💼 Siz sotuvchi sifatida kirdingiz.";
    return ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      ...Keyboards.sellerMenu(),
    });
  }

  const { Settings } = require("../server/models");
  const welcomeText = await Settings.get(
    "welcome_message",
    "🛍️ *MUZ BAZAR*ga xush kelibsiz!\n\nBizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz."
  );

  welcomeMessage += welcomeText;

  await ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
    ...Keyboards.mainMenu(),
  });
});

// Help command
bot.help(async (ctx) => {
  try {
    const { Settings } = require("../server/models");
    const aboutText = await Settings.get(
      "about_text",
      "🤖 **MUZ BAZAR BOT YORDAMCHI**\n\n📱 **Asosiy buyruqlar:**\n• /start - Botni qayta ishga tushirish\n• /help - Yordam\n\n🛍️ **Klientlar uchun:**\n• Mahsulotlarni ko'rish\n• Buyurtma berish\n• Buyurtma holati\n• Qarzdorlik ma'lumotlari"
    );

    ctx.reply(aboutText, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("❌ Help error:", error);
    ctx.reply("🤖 Yordam uchun /start bosing", { parse_mode: "Markdown" });
  }
});

// Get Chat ID command (for group setup)
bot.command("chatid", (ctx) => {
  const chatId = ctx.chat.id;
  const chatType = ctx.chat.type;

  if (chatType === "group" || chatType === "supergroup") {
    ctx.reply(
      `📋 **Guruh ma'lumotlari:**

` +
        `🆔 Chat ID: \`${chatId}\`
` +
        `📝 Type: ${chatType}

` +
        `Bu ID ni .env faylida NOTIFICATION_GROUP_ID ga qo'shing.`,
      { parse_mode: "Markdown" }
    );
  } else {
    ctx.reply("⚠️ Bu buyruq faqat guruhlarda ishlaydi.");
  }
});

/**
 * Client handlers
 */

// Main menu buttons
bot.hears("🛍️ Mahsulotlar", catalogHandler.showCategories);
bot.hears("📦 Buyurtmalarim", orderHandler.showMyOrders);

bot.hears("💰 Qarzdorlik", async (ctx) => {
  try {
    const { Order } = require("../server/models");

    const orders = await Order.find({
      client: ctx.user._id,
      debt: { $gt: 0 },
    });

    if (orders.length === 0) {
      return ctx.reply("✅ Sizda qarzdorlik yo'q!");
    }

    const totalDebt = orders.reduce((sum, order) => sum + order.debt, 0);

    let message = `💰 **Qarzdorlik ma'lumoti:**\n\n`;
    message += `🔴 **Umumiy qarz: ${totalDebt} so'm**\n\n`;

    for (const order of orders) {
      message += `🆔 ${order.orderNumber}: ${order.debt} so'm\n`;
    }

    message += `\n📞 To'lov uchun sotuvchi bilan bog'laning.`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("❌ Debt check error:", error);
    await ctx.reply("❌ Qarzdorlik ma'lumotini yuklashda xatolik.");
  }
});

bot.hears("📞 Aloqa", async (ctx) => {
  try {
    const { Settings } = require("../server/models");
    const contactText = await Settings.get(
      "contact_text",
      "📞 Biz bilan bog'laning:\n\n🏢 MUZ BAZAR\n📱 Telefon: +998 90 123 45 67\n📍 Manzil: Toshkent shahar\n⏰ Ish vaqti: 08:00 - 20:00"
    );

    ctx.reply(contactText);
  } catch (error) {
    console.error("❌ Contact error:", error);
    ctx.reply("📞 Aloqa uchun: +998 90 123 45 67");
  }
});

/**
 * Seller handlers (with role check)
 */

bot.hears("📋 Yangi buyurtmalar", sellerOnly, sellerHandler.showNewOrders);
bot.hears("✅ Tasdiqlangan", sellerOnly, sellerHandler.showConfirmedOrders);
bot.hears("💰 To'lov qabul qilish", sellerOnly, sellerHandler.showPaymentForm);

// Note: Seller menusi faqat admin paneldan seller roli berilgan foydalanuvchilar uchun

/**
 * Inline button handlers
 */

// Category selection
bot.action(/^category_(.+)$/, catalogHandler.showProducts);

// Product selection
bot.action(/^product_(.+)$/, catalogHandler.showProductDetails);

// Cancel quantity input
bot.action(/^cancel_qty_(.+)$/, orderHandler.cancelQuantityInput);

// Quantity selection
bot.action(/^qty_(.+)_(.+)$/, (ctx) => {
  const quantity = ctx.match[2];
  if (quantity === "custom") {
    return orderHandler.handleCustomQuantity(ctx);
  }
  return orderHandler.addToCart(ctx);
});

// Cart actions
bot.action("place_order", orderHandler.placeOrder);
bot.action("clear_cart", (ctx) => {
  const userId = ctx.user._id.toString();
  orderHandler.userCarts.delete(userId);
  ctx.editMessageText("🗑️ Savat tozalandi.", {
    ...Keyboards.remove(),
  });
  ctx.answerCbQuery("Savat tozalandi");
});

bot.action("continue_shopping", (ctx) => {
  ctx.editMessageText("🛍️ Xaridni davom eting!");
  catalogHandler.showCategories(ctx);
});

// Order confirmation (seller)
bot.action(/^confirm_order_(.+)$/, sellerOnly, sellerHandler.confirmOrder);

// Back buttons
bot.action("back_to_main", (ctx) => {
  ctx.editMessageText("🏠 Bosh menu");
  ctx.answerCbQuery();
});

bot.action("back_to_categories", catalogHandler.showCategories);

/**
 * Text message handlers
 */

// Handle custom quantity input
bot.on("text", async (ctx, next) => {
  const text = ctx.message.text;
  const user = ctx.user;

  // Agar telefon raqam kutilayotgan bo'lsa yoki user ning telefoni yo'q bo'lsa
  if (ctx.session?.awaitingPhone || !user.phone) {
    // Telefon raqamga o'xshash matnni tekshirish (faqat raqamlar)
    const phonePattern = /^[\d+\s\-()]+$/;

    if (phonePattern.test(text.trim())) {
      const phone = normalizePhone(text);

      // Telefon raqam formatini tekshirish
      if (phone && phone.length >= 12 && phone.match(/^\+998\d{9}$/)) {
        user.phone = phone;
        await user.save();

        ctx.session = ctx.session || {};
        ctx.session.awaitingPhone = false;

        let keyboard;
        if (user.isAdmin()) {
          keyboard = Keyboards.adminMenu();
        } else if (user.isSeller()) {
          keyboard = Keyboards.sellerMenu();
        } else {
          keyboard = Keyboards.mainMenu();
        }

        return ctx.reply(
          `✅ Rahmat! Telefon raqamingiz saqlandi: ${phone}\n\n🛍️ Quyidagi menyudan foydalaning:`,
          { parse_mode: "Markdown", ...keyboard }
        );
      } else {
        return ctx.reply(
          `❌ Noto'g'ri format!\n\nTo'g'ri formatda kiriting:\n• 901234567\n• +998901234567\n• 998901234567`,
          { parse_mode: "Markdown" }
        );
      }
    }

    // Agar raqam emas bo'lsa va telefon talab qilinsa
    if (!user.phone) {
      return ctx.reply(
        `📱 Avval telefon raqamingizni yuboring!\n\nTugmani bosing yoki raqamni yozing:\nMasalan: 901234567`,
        { parse_mode: "Markdown", ...phoneKeyboard }
      );
    }
  }

  // Check if user is inputting custom quantity
  if (ctx.session?.awaitingQuantity) {
    return orderHandler.processQuantityInput(ctx);
  }

  // Check if seller is inputting order number for payment
  if (ctx.session?.awaitingPayment) {
    return sellerHandler.processPayment(ctx);
  }

  // Check if seller is inputting payment amount
  if (ctx.session?.awaitingPaymentAmount) {
    return sellerHandler.processPaymentAmount(ctx);
  }

  return next();
});

// Back to main menu
bot.hears("🏠 Bosh menu", (ctx) => {
  const user = ctx.user;

  let keyboard;
  if (user.isAdmin()) {
    keyboard = Keyboards.adminMenu();
  } else if (user.isSeller()) {
    keyboard = Keyboards.sellerMenu();
  } else {
    keyboard = Keyboards.mainMenu();
  }

  ctx.reply("🏠 Bosh menu", { ...keyboard });
});

/**
 * Error handling
 */

bot.catch((err, ctx) => {
  console.error(`❌ Bot error for ${ctx.updateType}:`, err);
  ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
});

/**
 * Start bot
 */

console.log("🤖 Starting Telegram bot...");
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("✅ Telegram bot started successfully!");

module.exports = bot;
