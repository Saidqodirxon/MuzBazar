const express = require("express");
const router = express.Router();
const shopController = require("../controllers/shopController");
const shopAuth = require("../middlewares/shopAuth");

// Public routes
router.get("/login", shopController.showLogin);
router.post("/login", shopController.login);
router.post("/auth", shopController.telegramAuth);
router.get("/logout", shopController.logout);

// Protected routes
router.use(shopAuth);

router.get("/", shopController.index);
router.get("/my-orders", shopController.history);
router.post("/checkout", shopController.checkout);

module.exports = router;
