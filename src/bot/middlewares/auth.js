const { User } = require("../../server/models");
const { Markup } = require("telegraf");

/**
 * Authentication middleware for bot
 */
const authMiddleware = async (ctx, next) => {
  try {
    const telegramId = ctx.from.id.toString();

    // Try to find existing user
    let user = await User.findOne({ telegramId });

    // If user doesn't exist, create new client
    if (!user) {
      user = new User({
        telegramId,
        firstName: ctx.from.first_name || "",
        lastName: ctx.from.last_name || "",
        username: ctx.from.username || "",
        role: "client",
        isBlocked: true, // Default holatda blokli
      });

      await user.save();
      console.log(`🆕 New user registered: ${user.fullName} (${telegramId})`);

      // Guruhga notification yuborish
      try {
        const NotificationService = require("../../utils/notificationService");
        const notificationService = new NotificationService();
        
        const fullName = `${user.firstName} ${user.lastName || ""}`.trim();
        const usernameInfo = user.username ? `@${user.username}` : `ID: ${telegramId}`;
        
        const message = `🆕 <b>Yangi foydalanuvchi!</b>\n\n` +
          `👤 Ism: ${fullName}\n` +
          `📱 Telegram: ${usernameInfo}\n` +
          `🆔 User ID: ${user._id}\n\n` +
          `⚠️ Foydalanuvchi hozir <b>bloklangan</b> holatda.\n` +
          `✅ Admin paneldan ochib qo'ying: ${process.env.SITE_URL || "http://localhost:3000"}/admin/users`;
        
        await notificationService.sendToGroup(message, { parse_mode: "HTML" });
      } catch (notifError) {
        console.error("❌ Failed to send new user notification:", notifError);
      }
    }

    // Check if user needs to provide phone number
    if (!user.phone && !ctx.session?.awaitingPhone) {
      // Check if this is a contact message
      if (ctx.message?.contact) {
        user.phone = ctx.message.contact.phone_number;
        await user.save();
        ctx.user = user;
        return next();
      }

      // Skip phone request for callback queries and certain commands
      if (
        ctx.callbackQuery ||
        ctx.message?.text === "/start" ||
        ctx.message?.text === "/help"
      ) {
        ctx.user = user;
        ctx.session = ctx.session || {};
        ctx.session.needsPhone = true;
        return next();
      }
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return ctx.reply(
        "⛔️ Sizning hisobingiz hozircha bloklangan.\n\n" +
          "✅ Admin sizning hisobingizni ko'rib chiqib, tez orada ochib qo'yadi.\n\n" +
          "📞 Yordam uchun: @muzbazar_admin",
        Markup.removeKeyboard()
      );
    }

    // Check if user is blocked/inactive
    if (!user.isActive) {
      return ctx.reply(
        "❌ Sizning hisobingiz bloklangan. Ma'lumot uchun administratorga murojaat qiling.",
        Markup.removeKeyboard()
      );
    }

    // Update last activity
    user.lastActivity = new Date();
    await user.save();

    // Add user to context
    ctx.user = user;

    return next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    await ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
  }
};

/**
 * Role checking middleware
 */
const roleMiddleware = (allowedRoles) => {
  return async (ctx, next) => {
    if (!ctx.user) {
      return ctx.reply("❌ Avtorizatsiya xatosi.");
    }

    if (!allowedRoles.includes(ctx.user.role)) {
      return ctx.reply("❌ Sizda bu amalni bajarish uchun ruxsat yo'q.");
    }

    return next();
  };
};

/**
 * Admin only middleware
 */
const adminOnly = roleMiddleware(["admin"]);

/**
 * Seller and admin middleware
 */
const sellerOnly = roleMiddleware(["seller", "admin"]);

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminOnly,
  sellerOnly,
};
