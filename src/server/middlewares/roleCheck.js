const adminOnly = (req, res, next) => {
  if (req.session.role === "admin") {
    return next();
  }

  // Redirect sellers to orders instead of showing error
  if (req.session.role === "seller") {
    return res.redirect("/admin/orders");
  }

  res.status(403).render("error", {
    title: "Huquq yo'q",
    message:
      "Ushbu sahifaga kirish uchun sizda yetarli huquq yo'q. Faqat administratorlar kirishi mumkin.",
  });
};

module.exports = adminOnly;
