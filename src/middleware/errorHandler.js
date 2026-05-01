const { validationResult } = require("express-validator");

/**
 * Middleware that reads the validation errors collected by express-validator
 * and sends a structured 400 response if any exist.
 *
 * Place this immediately after your validators in a route definition:
 *   router.post("/", createTaskValidators, validate, taskController.create)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      // Map each error to a clean { field, message } pair
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Global error handler — Express recognises this as an error-handling
 * middleware because it accepts four arguments (err, req, res, next).
 *
 * We distinguish between several known error types so we can return
 * the right HTTP status code and a helpful message rather than
 * exposing raw stack traces to the client.
 */
const errorHandler = (err, req, res, next) => {
  // Log the full error on the server side for debugging
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  // Mongoose validation error (e.g. schema-level required/enum checks)
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: "Validation error", errors });
  }

  // Mongoose CastError — a provided ID doesn't match MongoDB's ObjectId format
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}': ${err.value}`,
    });
  }

  // MongoDB duplicate key error (e.g. unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists`,
    });
  }

  // Custom application errors thrown with a specific HTTP status
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Fallback: something unexpected went wrong
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : err.message, // Reveal details only in development
  });
};

/**
 * Creates a structured application error with an HTTP status code attached.
 * Use this to throw meaningful errors from controllers:
 *   throw createError(404, "Task not found")
 */
const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { validate, errorHandler, createError };
