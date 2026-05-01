const Task = require("../models/Task");
const { createError } = require("../middleware/errorHandler");

/**
 * TaskController
 *
 * Each method follows the same pattern:
 *   1. Parse & validate inputs (validation is largely done by express-validator
 *      middleware before we even reach here)
 *   2. Perform the database operation
 *   3. Return a consistent JSON envelope: { success, message, data }
 *
 * We use async/await throughout and let the asyncHandler (app.js) forward
 * any thrown errors to the global error handler middleware.
 */

// ─── GET /api/tasks ──────────────────────────────────────────────────────────
/**
 * Retrieves all tasks.
 * Supports optional query filters: ?status=pending, ?category=Work
 * Results are sorted newest-first by default.
 */
const getAllTasks = async (req, res) => {
  const filter = {};

  // Apply status filter if provided
  if (req.query.status) {
    if (!["pending", "completed"].includes(req.query.status)) {
      throw createError(400, "status query must be 'pending' or 'completed'");
    }
    filter.status = req.query.status;
  }

  // Apply category filter if provided
  if (req.query.category) {
    // Case-insensitive partial match, so "work" matches "Work"
    filter.category = { $regex: req.query.category, $options: "i" };
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: `${tasks.length} task(s) found`,
    count: tasks.length,
    data: tasks,
  });
};

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
/**
 * Retrieves a single task by its MongoDB _id.
 */
const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    // Throw so the global error handler sends a 404 response
    throw createError(404, `Task with id '${req.params.id}' not found`);
  }

  res.status(200).json({
    success: true,
    message: "Task retrieved successfully",
    data: task,
  });
};

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
/**
 * Creates a new task.
 * The title is required; description, dueDate, and category are optional.
 */
const createTask = async (req, res) => {
  const { title, description, dueDate, category } = req.body;

  const task = await Task.create({ title, description, dueDate, category });

  // 201 Created is semantically more correct than 200 for resource creation
  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
};

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
/**
 * Updates an existing task.
 *
 * Why PATCH instead of PUT?
 *   PUT semantics require replacing the *entire* resource. PATCH is for
 *   partial updates — the client only sends the fields it wants to change.
 *   For a to-do app, partial updates are the common case (e.g. just toggling
 *   status or fixing a typo in the title).
 *
 * Business rule: a task that is already 'completed' cannot be completed again.
 */
const updateTask = async (req, res) => {
  // First, fetch the current state of the task
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw createError(404, `Task with id '${req.params.id}' not found`);
  }

  // Business rule: prevent re-completing an already-completed task
  if (task.status === "completed" && req.body.status === "completed") {
    throw createError(400, "Task is already marked as completed");
  }

  // Build the update object from only the fields that were sent
  const allowedFields = ["title", "description", "status", "dueDate", "category"];
  const updates = {};
  allowedFields.forEach((field) => {
    // Check for undefined explicitly — a field set to null is a valid update (clearing it)
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // runValidators: true ensures Mongoose schema rules run on the updated values too
  const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
    new: true,           // Return the document *after* the update
    runValidators: true, // Re-run schema validators on the new values
  });

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: updatedTask,
  });
};

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
/**
 * Permanently deletes a task by its id.
 */
const deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    throw createError(404, `Task with id '${req.params.id}' not found`);
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: task, // Return the deleted task so the client knows what was removed
  });
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
