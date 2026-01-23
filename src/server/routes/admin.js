const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/adminAuth");
const adminOnly = require("../middlewares/roleCheck");
const upload = require("../middlewares/upload");

// Admin login
router.get("/", adminController.showLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// Protected routes
router.use(authMiddleware);

// Dashboard
router.get("/dashboard", adminController.dashboard);

// Orders (Available to Seller & Admin)
router.get("/orders", adminController.orders);
router.get("/orders/export", adminController.exportOrders);
router.get("/orders/:id", adminController.orderDetails);
router.post("/orders/:id/status", adminController.updateOrderStatus);
router.post("/orders/:id/notify", adminController.sendOrderNotification);
router.post("/orders/:id/payment", adminController.addPayment);
router.post("/payments/:paymentId/delete", adminController.deletePayment);

// Admin Only Routes
router.use(adminOnly);

// Categories
router.get("/categories", adminController.categories);
router.get("/categories/new", adminController.newCategory);
router.post("/categories", adminController.createCategory);
router.get("/categories/:id/edit", adminController.editCategory);
router.post("/categories/:id", adminController.updateCategory);
router.post("/categories/:id/delete", adminController.deleteCategory);

// Products
router.get("/products", adminController.products);
router.get("/products/new", adminController.newProduct);
router.post("/products", upload.single("image"), adminController.createProduct);
router.get("/products/export", adminController.exportProducts);
router.get("/products/:id/edit", adminController.editProduct);
router.post(
  "/products/:id",
  upload.single("image"),
  adminController.updateProduct
);
router.post("/products/:id/delete", adminController.deleteProduct);

// Users
router.get("/users", adminController.users);
router.get("/users/:id", adminController.userDetails);
router.get("/users/:id/export", adminController.exportUserDebt);
router.get("/users/:id/export-orders", adminController.exportUserOrders);
router.post("/users/:id/notify", adminController.sendUserNotification);
router.post("/users/:id/role", adminController.updateUserRole);
router.post("/users/:id/toggle-status", adminController.toggleUserStatus);

// Sellers Management
router.get("/sellers", adminController.sellers);
router.post("/sellers/add", adminController.addSeller);
router.post("/sellers/:id/toggle", adminController.toggleSellerStatus);
router.post("/sellers/:id/remove", adminController.removeSeller);

// Debts
router.get("/debts", adminController.debts);
router.post("/debts/notify", adminController.sendDebtNotification);
router.get("/debts/export", adminController.exportDebts);

// Reports
router.get("/reports", adminController.reports);
router.get("/reports/export", adminController.exportReports);

// Settings
router.get("/settings", adminController.settings);
router.post("/settings", adminController.updateSettings);
router.post("/settings/test-debt-reminders", adminController.testDebtReminders);
router.post(
  "/settings/test-group-notification",
  adminController.testGroupNotification
);

// Profile
router.get("/profile", adminController.profile);
router.post("/profile/password", adminController.updatePassword);

module.exports = router;
