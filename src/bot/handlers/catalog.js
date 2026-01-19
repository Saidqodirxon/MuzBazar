const { Category, Product } = require("../../server/models");
const Keyboards = require("../keyboards");

/**
 * Catalog handlers - mahsulotlarni ko'rish
 */

const catalogHandler = {
  formatSum(amount) {
    const num = Number(amount || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ", ");
  },
  // Show all categories
  async showCategories(ctx) {
    try {
      const categories = await Category.find({ isActive: true }).sort({
        sortOrder: 1,
      });

      if (categories.length === 0) {
        return ctx.reply("📦 Hozircha kategoriyalar mavjud emas.");
      }

      const categoriesKeyboard = await Keyboards.categoriesInline(categories);
      await ctx.reply(
        `🛍️ <b>Mahsulot kategoriyalari:</b>

Quyidagi kategoriyalardan birini tanlang:`,
        { parse_mode: "HTML", ...categoriesKeyboard }
      );
    } catch (error) {
      console.error("❌ Categories error:", error);
      await ctx.reply("❌ Kategoriyalarni yuklashda xatolik yuz berdi.");
    }
  },

  // Show products by category
  async showProducts(ctx) {
    try {
      const categoryId = ctx.match[1];

      const category = await Category.findById(categoryId);
      if (!category) {
        return ctx.answerCbQuery("❌ Kategoriya topilmadi.");
      }

      const products = await Product.find({
        category: categoryId,
        isActive: true,
        stock: { $gt: 0 },
      }).sort({ sortOrder: 1 });

      if (products.length === 0) {
        const backKeyboard = await Keyboards.categoriesInline([category]);
        return ctx.editMessageText(
          `📦 <b>${category.name}</b> kategoriyasida mahsulotlar mavjud emas yoki sotilgan.`,
          { parse_mode: "HTML", ...backKeyboard }
        );
      }

      const productList = products
        .map(
          (p) =>
            `• <b>${p.name}</b> - ${catalogHandler.formatSum(p.sellPrice)} so'm (${p.stock} ta)`
        )
        .join("\n");

      const productsKeyboard = await Keyboards.productsInline(
        products,
        categoryId
      );
      await ctx.editMessageText(
        `🛍️ <b>${category.name}</b>\n\n${productList}\n\nMahsulotni tanlang:`,
        { parse_mode: "HTML", ...productsKeyboard }
      );

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("❌ Products error:", error);
      await ctx.answerCbQuery("❌ Mahsulotlarni yuklashda xatolik.");
    }
  },

  // Show product details
  async showProductDetails(ctx) {
    try {
      const productId = ctx.match[1];

      const product = await Product.findById(productId).populate("category");
      if (!product) {
        return ctx.answerCbQuery("❌ Mahsulot topilmadi.");
      }

      if (product.stock <= 0) {
        return ctx.answerCbQuery("❌ Bu mahsulot sotilgan.");
      }

      const details = [
        `🛍️ <b>${product.name}</b>`,
        `📁 Kategoriya: ${product.category.name}`,
        `💰 Narxi: ${catalogHandler.formatSum(product.sellPrice)} so'm`,
        `📦 Mavjud: ${product.stock} ${product.type}`,
        `\n${product.description || ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      const quantityKeyboard = Keyboards.quantityInline(productId);

      // Send image if available
      if (product.image) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(product.image, {
          caption: details + "\n\n<b>Miqdorni tanlang:</b>",
          parse_mode: "HTML",
          ...quantityKeyboard,
        });
      } else {
        await ctx.editMessageText(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
          parse_mode: "HTML",
          ...quantityKeyboard,
        });
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("❌ Product details error:", error);
      await ctx.answerCbQuery("❌ Mahsulot ma'lumotlarini yuklashda xatolik.");
    }
  },
};

module.exports = catalogHandler;
