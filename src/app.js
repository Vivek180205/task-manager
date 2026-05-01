require("dotenv").config();
const express = require("express");
const morgan = require("morgan");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const { errorHandler } = require("./middleware/errorHandler");

// ─── Bootstrap ───────────────────────────────────────────────────────────────

// Connect to MongoDB before starting the HTTP server.
// Any error here exits the process (handled inside connectDB).
connectDB();

const app = express();

// ─── Middleware Stack ─────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (useful for tools like Postman's form-data)
app.use(express.urlencoded({ extended: true }));

// HTTP request logger — "dev" format is colorized and concise in development
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health-check endpoint — useful for deployment platforms and load balancers
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Task Manager API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount all task-related routes under /api/tasks
app.use("/api/tasks", taskRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Catches any request that didn't match a defined route above
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.method} ${req.originalUrl}' not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be the LAST middleware registered — Express identifies error handlers
// by their 4-argument signature (err, req, res, next)
app.use(errorHandler);

// ─── Async Error Wrapper ──────────────────────────────────────────────────────
/**
 * Express 4 doesn't automatically catch errors thrown inside async route
 * handlers. We patch the router's `handle` method so that any unhandled
 * promise rejection is forwarded to the global error handler.
 *
 * Express 5 (when stable) handles this natively — this wrapper is the
 * standard workaround for Express 4.
 */
const originalHandle = app.handle.bind(app);
app.handle = (req, res, next) => {
  // Wrap each request in a promise so rejections surface to errorHandler
  Promise.resolve(originalHandle(req, res, next)).catch(next);
};

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Tasks API:    http://localhost:${PORT}/api/tasks`);
});

// Graceful shutdown — close the server cleanly on SIGTERM (e.g. from Docker)
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => process.exit(0));
});

module.exports = app; // Export for testing with Supertest
