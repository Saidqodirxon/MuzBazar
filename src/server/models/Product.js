const mongoose = require("mongoose");

/**
 * Product Schema - Mahsulotlar
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["piece", "kg", "liter", "box"],
      default: "piece",
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for profit per unit
productSchema.virtual("profitPerUnit").get(function () {
  return this.sellPrice - this.costPrice;
});

// Virtual field for price (alias for sellPrice for backward compatibility)
productSchema.virtual("price").get(function () {
  return this.sellPrice;
});

// Virtual field for profit percentage
productSchema.virtual("profitPercentage").get(function () {
  return this.costPrice > 0
    ? ((this.sellPrice - this.costPrice) / this.costPrice) * 100
    : 0;
});

// Method to check if product is low in stock
productSchema.methods.isLowStock = function () {
  return this.stock <= this.minStock;
};

// Method to reduce stock
productSchema.methods.reduceStock = function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    return true;
  }
  return false;
};

module.exports = mongoose.model("Product", productSchema);
