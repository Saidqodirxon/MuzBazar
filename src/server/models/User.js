const mongoose = require("mongoose");

/**
 * User Schema - Foydalanuvchilar (Admin, Sotuvchi, Klient)
 */
const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      default: "",
    },
    username: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "seller", "client"],
      default: "client",
    },
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalDebt: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

// Method to check if user is seller
userSchema.methods.isSeller = function () {
  return this.role === "seller" || this.role === "admin";
};

module.exports = mongoose.model("User", userSchema);
