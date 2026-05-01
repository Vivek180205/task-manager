const { body, param } = require("express-validator");

/**
 * Validators for task creation.
 * We use express-validator's chain API — each rule is a middleware that
 * attaches validation errors to the request object. The actual check and
 * response happens in the `validate` middleware (see errorHandler.js).
 */
const createTaskValidators = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("dueDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date (e.g. 2024-12-31)")
    .toDate(),

  body("category")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters"),
];

/**
 * Validators for task updates.
 * All fields are optional here — a PATCH request only needs to include
 * the fields being changed. We still enforce format rules on whatever is sent.
 */
const updateTaskValidators = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be set to empty")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("status")
    .optional()
    .isIn(["pending", "completed"])
    .withMessage("Status must be 'pending' or 'completed'"),

  body("dueDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date")
    .toDate(),

  body("category")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters"),
];

/**
 * Validates that a MongoDB ObjectId in the URL param is well-formed.
 * A malformed ID would cause Mongoose to throw a CastError, so we catch
 * it here and return a clean 400 instead of a confusing 500.
 */
const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid task ID format"),
];

module.exports = { createTaskValidators, updateTaskValidators, mongoIdValidator };
