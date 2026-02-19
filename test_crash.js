const { authMiddleware } = require("./src/bot/middlewares/auth");
const { connectDB } = require("./src/utils/config");
const mongoose = require("mongoose");
const { Telegraf } = require("telegraf");

async function testMarkdownCrash() {
  try {
    await connectDB();
    console.log("Connected to DB");

    const ctx = {
      from: {
        id: 999,
        first_name: "Test_User_With_Underscores", // This will break Markdown V1 if not escaped
      },
      user: null,
      session: {},
      reply: async (msg, extra) => {
        console.log("BOT REPLIED:", msg);
        if (extra && extra.parse_mode === "Markdown") {
          // Simulate Telegram's strict parsing
          const stack = [];
          for (const char of msg) {
            if (char === "*") stack.push("*");
            if (char === "_") stack.push("_");
          }
          if (stack.length % 2 !== 0) {
            throw new Error(
              "400: Bad Request: can't parse entities: Can't find end of italic entity at byte offset 20"
            );
          }
        }
        return { message_id: 1 };
      },
    };

    // Simulate auth
    await authMiddleware(ctx, async () => {
      // Logic from bot.start
      const user = ctx.user;
      let welcomeMessage = `Salom, *${user.firstName}*! 👋\n\n`;

      console.log("Attempting to reply with Markdown...");
      try {
        await ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
        console.log("✅ Reply sent!");
      } catch (err) {
        console.error("❌ CRASHED DURING REPLY:", err.message);
      }
    });
  } catch (error) {
    console.error("GLOBAL CRASH:", error);
  } finally {
    process.exit(0);
  }
}

testMarkdownCrash();
