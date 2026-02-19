const { authMiddleware } = require("./src/bot/middlewares/auth");
const { connectDB } = require("./src/utils/config");
const mongoose = require("mongoose");

async function mockStart() {
  try {
    await connectDB();
    console.log("Connected to DB");

    const ctx = {
      from: {
        id: 123456789,
        first_name: "TestUser",
        username: "testuser",
      },
      user: null,
      session: {},
      reply: async (msg, extra) => {
        console.log("BOT REPLIED:", msg);
        return { message_id: 1 };
      },
      telegram: {
        sendMessage: async (id, msg) => {
          console.log("TELEGRAM SENT:", msg);
          return { message_id: 1 };
        },
      },
    };

    const next = async () => {
      console.log("NEXT CALLED. ctx.user is", ctx.user ? "Present" : "Missing");
    };

    console.log("Running authMiddleware...");
    await authMiddleware(ctx, next);
    console.log("Done.");
  } catch (error) {
    console.error("CRASHED:", error);
  } finally {
    process.exit(0);
  }
}

mockStart();
