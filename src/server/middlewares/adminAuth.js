/**
 * Admin authentication middleware
 */

const { User } = require("../models");

const adminAuth = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.session.adminAuth) {
      return res.redirect("/admin?error=login_required");
    }

    // Attach minimal admin info for views
    const admin = req.session.adminUser || {
      name: "Admin",
      username: process.env.ADMIN_USERNAME,
    };

    req.admin = admin;
    res.locals.admin = admin;

    next();
  } catch (error) {
    console.error("❌ Admin auth error:", error);
    res.redirect("/admin?error=auth_error");
  }
};

module.exports = adminAuth;
