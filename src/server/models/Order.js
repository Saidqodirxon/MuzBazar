const mongoose = require("mongoose");

/**
 * Order Schema - Buyurtmalar
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: false, // Will be generated before save
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        pricePerUnit: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalSum: {
      type: Number,
      required: true,
      min: 0,
    },
    paidSum: {
      type: Number,
      default: 0,
      min: 0,
    },
    debt: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      type: String,
      default: "",
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate debt and generate order number (fallback)
orderSchema.pre("save", function (next) {
  // Fallback: Generate order number if somehow missing
  if (!this.orderNumber) {
    const date = new Date(this.createdAt || Date.now());
    const dateStr =
      date.getFullYear().toString().slice(-2) +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD-${dateStr}-${random}`;
  }

  // Calculate debt
  this.debt = Math.max(0, this.totalSum - this.paidSum);
  if (this.paidSum > this.totalSum) {
    this.paidSum = this.totalSum;
    this.debt = 0;
  }

  next();
});

// Method to add payment
orderSchema.methods.addPayment = function (amount) {
  // Calculate new paidSum
  const newPaidSum = this.paidSum + amount;

  // Limit paidSum to totalSum (can't pay more than the total)
  if (newPaidSum > this.totalSum) {
    const actualPayment = this.totalSum - this.paidSum;
    this.paidSum = this.totalSum;
    this.debt = 0;
    return {
      accepted: actualPayment,
      rejected: amount - actualPayment,
      remaining: 0,
    };
  }

  this.paidSum = newPaidSum;
  this.debt = this.totalSum - this.paidSum;
  return {
    accepted: amount,
    rejected: 0,
    remaining: this.debt,
  };
};

// Method to check if order is fully paid
orderSchema.methods.isFullyPaid = function () {
  return this.debt <= 0;
};

// Post-save middleware to update user's total debt
orderSchema.post("save", async function (doc) {
  try {
    const User = mongoose.model("User");
    await User.updateUserTotalDebt(doc.client);
  } catch (error) {
    console.error("❌ Error updating user total debt:", error);
  }
});

// Post-remove middleware to update user's total debt
orderSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (doc && doc.client) {
      const User = mongoose.model("User");
      await User.updateUserTotalDebt(doc.client);
    }
  } catch (error) {
    console.error("❌ Error updating user total debt after delete:", error);
  }
});

module.exports = mongoose.model("Order", orderSchema);
