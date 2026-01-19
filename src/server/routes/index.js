const express = require("express");
const router = express.Router();

// Home page - redirect to admin
router.get("/", (req, res) => {
  res.redirect("/admin");
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
