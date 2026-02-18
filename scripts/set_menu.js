const { Telegraf } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

async function setMenu() {
  try {
    const url = process.env.SITE_URL + "/shop";
    console.log("Setting menu button for:", url);
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: "web_app",
        text: "🌐 Web Do'kon",
        web_app: { url: url },
      },
    });
    console.log("✅ Menu button set successfully");
  } catch (error) {
    console.error("❌ Error setting menu button:", error);
  }
}

setMenu();
