const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "muzbazar-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Static files
app.use(express.static(path.join(__dirname, "../../public")));

// Routes
app.use("/", require("./routes/index"));
app.use("/api", require("./routes/api"));
app.use("/admin", require("./routes/admin"));
app.use("/shop", require("./routes/shop"));

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", {
    title: "404 - Sahifa topilmadi",
    message: "Kechirasiz, siz qidirayotgan sahifa mavjud emas.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).render("error", {
    title: "500 - Server xatosi",
    message: "Serverda xatolik yuz berdi.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Server started on http://localhost:${PORT}`);
});

module.exports = app;
