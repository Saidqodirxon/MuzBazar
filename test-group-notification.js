const { Telegraf } = require("telegraf");
require("dotenv").config();

async function testGroupNotification() {
  try {
    const bot = new Telegraf(process.env.BOT_TOKEN);
    const groupId = process.env.NOTIFICATION_GROUP_ID;

    console.log("🤖 Bot Token:", process.env.BOT_TOKEN ? "Set ✓" : "Not set ✗");
    console.log("📢 Group ID:", groupId);

    if (!groupId) {
      console.error("❌ NOTIFICATION_GROUP_ID not configured!");
      return;
    }

    // Test 1: Simple text message
    console.log("\n📤 Test 1: Sending simple text message...");
    try {
      await bot.telegram.sendMessage(groupId, "Test xabari - Simple text");
      console.log("✅ Simple text sent successfully!");
    } catch (error) {
      console.error("❌ Simple text failed:", error.message);
    }

    // Test 2: HTML message
    console.log("\n📤 Test 2: Sending HTML formatted message...");
    try {
      await bot.telegram.sendMessage(
        groupId,
        "<b>Test xabari</b> - HTML format\n<i>Italic text</i>",
        { parse_mode: "HTML" }
      );
      console.log("✅ HTML message sent successfully!");
    } catch (error) {
      console.error("❌ HTML message failed:", error.message);
    }

    // Test 3: MarkdownV2 message
    console.log("\n📤 Test 3: Sending MarkdownV2 formatted message...");
    try {
      await bot.telegram.sendMessage(
        groupId,
        "*Test xabari* \\- MarkdownV2 format\n_Italic text_",
        { parse_mode: "MarkdownV2" }
      );
      console.log("✅ MarkdownV2 message sent successfully!");
    } catch (error) {
      console.error("❌ MarkdownV2 message failed:", error.message);
      if (error.response) {
        console.error("Telegram response:", error.response.description);
      }
    }

    // Test 4: Get bot info and check group membership
    console.log("\n🤖 Checking bot info...");
    try {
      const botInfo = await bot.telegram.getMe();
      console.log("Bot username:", botInfo.username);
      console.log("Bot name:", botInfo.first_name);

      const chatInfo = await bot.telegram.getChat(groupId);
      console.log("\n📢 Group info:");
      console.log("Title:", chatInfo.title);
      console.log("Type:", chatInfo.type);

      const botMember = await bot.telegram.getChatMember(groupId, botInfo.id);
      console.log("\n👤 Bot status in group:", botMember.status);
      console.log(
        "Can send messages:",
        botMember.status === "administrator" || botMember.status === "member"
      );
    } catch (error) {
      console.error("❌ Failed to get chat info:", error.message);
    }

    console.log("\n✅ Test completed!");
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testGroupNotification();
