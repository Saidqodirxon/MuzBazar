const { connectDB } = require("./src/utils/config");
const { User } = require("./src/server/models");
(async () => {
  await connectDB();
  const r = await User.updateMany(
    { role: "client" },
    { $set: { isBlocked: true } }
  );
  console.log(r.modifiedCount + " users blocked");
  process.exit(0);
})();
