/**
 * Telegram Bot Keyboards
 */

const { Markup } = require("telegraf");

class Keyboards {
  // Main menu for clients
  static mainMenu() {
    return Markup.keyboard([
      ["🛍️ Mahsulotlar", "🛒 Savat"],
      ["📦 Buyurtmalarim", "💰 Qarzdorlik"],
      ["ℹ️ Biz haqimizda", "📞 Aloqa"],
    ]).resize();
  }

  // Seller menu
  static sellerMenu() {
    return Markup.keyboard([
      ["📋 Yangi buyurtmalar", "✅ Tasdiqlangan"],
      ["💰 To'lov qabul qilish", "📊 Hisobot"],
      ["👤 Klient ma'lumotlari"],
    ]).resize();
  }

  // Admin menu
  static adminMenu() {
    return Markup.keyboard([
      ["📦 Mahsulotlar", "👥 Foydalanuvchilar"],
      ["📊 Statistika", "💰 Qarzdorlik"],
      ["📢 Xabarlar", "⚙️ Sozlamalar"],
    ]).resize();
  }

  // Category selection inline keyboard
  static async categoriesInline(categories) {
    const buttons = categories.map((cat) => [
      Markup.button.callback(cat.name, `category_${cat._id}`),
    ]);

    return Markup.inlineKeyboard([
      ...buttons,
      [Markup.button.callback("🔙 Orqaga", "back_to_main")],
    ]);
  }

  // Products inline keyboard
  static async productsInline(products, categoryId) {
    const buttons = products.map((product) => [
      Markup.button.callback(
        `${product.name} - ${product.sellPrice} so'm`,
        `product_${product._id}`
      ),
    ]);

    return Markup.inlineKeyboard([
      ...buttons,
      [Markup.button.callback("🔙 Kategoriyalar", "back_to_categories")],
    ]);
  }

  // Quantity selection
  static quantityInline(productId, categoryId) {
    const backAction = categoryId
      ? `category_${categoryId}`
      : "back_to_categories";

    return Markup.inlineKeyboard([
      [
        Markup.button.callback("1", `qty_${productId}_1`),
        Markup.button.callback("2", `qty_${productId}_2`),
        Markup.button.callback("3", `qty_${productId}_3`),
        Markup.button.callback("4", `qty_${productId}_4`),
        Markup.button.callback("5", `qty_${productId}_5`),
      ],
      [Markup.button.callback("➕ Boshqa", `qty_${productId}_custom`)],
      // [
      //   Markup.button.callback("10", `qty_${productId}_10`),
      //   Markup.button.callback("20", `qty_${productId}_20`),
      //   Markup.button.callback("30", `qty_${productId}_30`),
      // ],
      // [
      //   Markup.button.callback("40", `qty_${productId}_40`),
      //   Markup.button.callback("50", `qty_${productId}_50`),
      // ],
      [Markup.button.callback("🔙 Orqaga", backAction)],
    ]);
  }

  // Cart actions
  static cartActions() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Buyurtma berish", "place_order"),
        Markup.button.callback("🗑️ Tozalash", "clear_cart"),
      ],
      [Markup.button.callback("➕ Davom etish", "continue_shopping")],
    ]);
  }

  // Order confirmation
  static orderConfirmation(orderId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Tasdiqlash", `confirm_order_${orderId}`),
        Markup.button.callback("❌ Bekor qilish", `cancel_order_${orderId}`),
      ],
    ]);
  }

  // Payment options
  static paymentOptions(orderId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("💵 Naqd", `payment_cash_${orderId}`),
        Markup.button.callback("💳 Karta", `payment_card_${orderId}`),
      ],
      [
        Markup.button.callback("🏦 O'tkazma", `payment_transfer_${orderId}`),
        Markup.button.callback("📝 Qarz", `payment_debt_${orderId}`),
      ],
    ]);
  }

  // Back to main menu
  static backToMain() {
    return Markup.keyboard([["🏠 Bosh menu"]]).resize();
  }

  // Remove keyboard
  static remove() {
    return Markup.removeKeyboard();
  }
}

module.exports = Keyboards;
