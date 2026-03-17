const mongoose = require("mongoose");
require("dotenv").config();
const { User, Payment } = require("../src/server/models");

async function auditMahamadjon() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ firstName: /Mahamadjon/i });
    if (user) {
      console.log(`\n📋 Klient: ${user.firstName} ${user.lastName}`);
      const payments = await Payment.find({ client: user._id }).sort({ createdAt: 1 });
      payments.forEach(p => {
        console.log(`${p.createdAt.toISOString()} | ${p.amount.toLocaleString().padEnd(10)} | ${p.notes}`);
      });
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}
auditMahamadjon();
