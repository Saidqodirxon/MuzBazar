const { User } = require("../models");

const shopAuth = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.session.shopAuth) {
      return res.redirect("/shop/login");
    }

    // Attach user info for views
    const user = await User.findById(req.session.shopUser._id);

    if (!user || !user.isActive || user.isBlocked) {
      req.session.destroy();
      return res.redirect("/shop/login?error=account_issue");
    }

    req.user = user;
    res.locals.user = user;

    next();
  } catch (error) {
    console.error("❌ Shop auth error:", error);
    res.redirect("/shop/login?error=auth_error");
  }
};

module.exports = shopAuth;
