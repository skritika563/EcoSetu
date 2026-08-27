const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// ─── Create Express Application ────────────────────────────────────────────
const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Request Logging ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Cookie Parsing ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Eco Setu API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const pickupRoutes = require("./routes/pickupRoutes");
const addressRoutes = require("./routes/addressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const scrapRateRoutes = require("./routes/scrapRateRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const userRoutes = require("./routes/userRoutes");
// const organizationRoutes = require("./routes/organizationRoutes");
// const materialRoutes = require("./routes/materialRoutes");
// const requestRoutes = require("./routes/requestRoutes");
const aiRoutes = require("./routes/aiRoutes");
// const reviewRoutes = require("./routes/reviewRoutes");
// const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/pickups", pickupRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/scrap-rates", scrapRateRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/users", userRoutes);
// app.use("/api/organizations", organizationRoutes);
// app.use("/api/materials", materialRoutes);
// app.use("/api/requests", requestRoutes);
app.use("/api/ai", aiRoutes);
// app.use("/api/reviews", reviewRoutes);
// app.use("/api/admin", adminRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: { code: "NOT_FOUND" },
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

module.exports = app;
