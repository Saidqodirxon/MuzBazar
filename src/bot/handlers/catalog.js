const { Category, Product } = require("../../server/models");
const Keyboards = require("../keyboards");
const path = require("path");
const fs = require("fs");
const { Input } = require("telegraf");

/**
 * Catalog handlers - mahsulotlarni ko'rish
 */

const catalogHandler = {
  formatSum(amount) {
    const num = Number(amount || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  },

  // Get image source for Telegram
  getImageSource(imagePath) {
    if (!imagePath) return null;

    // If already full URL (http/https), return as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      // Check if it's not localhost (Telegram can't access localhost)
      if (
        !imagePath.includes("localhost") &&
        !imagePath.includes("127.0.0.1")
      ) {
        return imagePath;
      }
    }

    // Convert URL path to file system path
    // /uploads/products/image.jpg -> public/uploads/products/image.jpg
    let filePath;
    if (imagePath.startsWith("/")) {
      filePath = path.join(__dirname, "../../../public", imagePath);
    } else {
      filePath = path.join(
        __dirname,
        "../../../public/uploads/products",
        imagePath
      );
    }

    // Check if file exists
    if (fs.existsSync(filePath)) {
      return Input.fromLocalFile(filePath);
    }

    return null;
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

      // Check if this is from callback query (edit message) or new message
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(
            `🛍️ <b>Mahsulot kategoriyalari:</b>\n\nQuyidagi kategoriyalardan birini tanlang:`,
            { parse_mode: "HTML", ...categoriesKeyboard }
          );
          try {
            await ctx.answerCbQuery();
          } catch (cbErr) {
            // Ignore callback query errors
          }
        } catch (e) {
          // If edit fails (e.g., message with photo), delete and send new
          await ctx.deleteMessage().catch(() => {});
          await ctx.reply(
            `🛍️ <b>Mahsulot kategoriyalari:</b>\n\nQuyidagi kategoriyalardan birini tanlang:`,
            { parse_mode: "HTML", ...categoriesKeyboard }
          );
        }
      } else {
        await ctx.reply(
          `🛍️ <b>Mahsulot kategoriyalari:</b>\n\nQuyidagi kategoriyalardan birini tanlang:`,
          { parse_mode: "HTML", ...categoriesKeyboard }
        );
      }
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
        try {
          return await ctx.answerCbQuery("❌ Kategoriya topilmadi.");
        } catch (e) {
          return;
        }
      }

      const products = await Product.find({
        category: categoryId,
        isActive: true,
        stock: { $gt: 0 },
      }).sort({ sortOrder: 1 });

      if (products.length === 0) {
        const backKeyboard = await Keyboards.categoriesInline([category]);
        await ctx.editMessageText(
          `📦 <b>${category.name}</b> kategoriyasida mahsulotlar mavjud emas yoki sotilgan.`,
          { parse_mode: "HTML", ...backKeyboard }
        );
        try {
          await ctx.answerCbQuery();
        } catch (e) {}
        return;
      }

      const productList = products
        .map(
          (p) =>
            `• <b>${p.name}</b> - ${catalogHandler.formatSum(p.sellPrice)} so'm`
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

      try {
        await ctx.answerCbQuery();
      } catch (e) {
        // Ignore callback query errors
      }
    } catch (error) {
      console.error("❌ Products error:", error);
      try {
        await ctx.answerCbQuery("❌ Mahsulotlarni yuklashda xatolik.");
      } catch (e) {
        // Ignore callback query errors
      }
    }
  },

  // Show product details
  async showProductDetails(ctx) {
    try {
      const productId = ctx.match[1];

      const product = await Product.findById(productId).populate("category");
      if (!product) {
        try {
          return await ctx.answerCbQuery("❌ Mahsulot topilmadi.");
        } catch (e) {
          return;
        }
      }

      if (product.stock <= 0) {
        try {
          return await ctx.answerCbQuery("❌ Bu mahsulot sotilgan.");
        } catch (e) {
          return;
        }
      }

      const details = [
        `🛍️ <b>${product.name}</b>`,
        `📁 Kategoriya: ${product.category.name}`,
        `💰 Narxi: ${catalogHandler.formatSum(product.sellPrice)} so'm`,
        `\n${product.description || ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      const quantityKeyboard = Keyboards.quantityInline(
        productId,
        product.category?._id?.toString()
      );

      // Send image if available
      if (product.image) {
        const imageSource = catalogHandler.getImageSource(product.image);
        await ctx.deleteMessage().catch(() => {});

        if (imageSource) {
          try {
            await ctx.replyWithPhoto(imageSource, {
              caption: details + "\n\n<b>Miqdorni tanlang:</b>",
              parse_mode: "HTML",
              ...quantityKeyboard,
            });
          } catch (imgError) {
            console.error("Image send error:", imgError.message);
            // If image fails, send text only
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
        await ctx.editMessageText(`${details}\n\n<b>Miqdorni tanlang:</b>`, {
          parse_mode: "HTML",
          ...quantityKeyboard,
        });
      }

      try {
        await ctx.answerCbQuery();
      } catch (e) {
        // Ignore callback query errors
      }
    } catch (error) {
      console.error("❌ Product details error:", error);
      try {
        await ctx.answerCbQuery(
          "❌ Mahsulot ma'lumotlarini yuklashda xatolik."
        );
      } catch (e) {
        // Ignore callback query errors
      }
    }
  },
};

module.exports = catalogHandler;
