const express = require("express");
const router = express.Router();
const apiController = require("../controllers/apiController");

// Products API
router.get("/products", apiController.getProducts);
router.get("/products/:id", apiController.getProduct);

// Categories API
router.get("/categories", apiController.getCategories);

// Orders API
router.get("/orders", apiController.getOrders);
router.post("/orders", apiController.createOrder);
router.get("/orders/:id", apiController.getOrder);

// Statistics API
router.get("/stats", apiController.getStats);
router.get("/stats/sales", apiController.getSalesStats);
router.get("/stats/debts", apiController.getDebtStats);
// Test notification
router.post("/test-notification", apiController.testNotification);
module.exports = router;
