const express = require("express");
const router = express.Router();

const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const {
  createTaskValidators,
  updateTaskValidators,
  mongoIdValidator,
} = require("../validators/taskValidators");

const { validate } = require("../middleware/errorHandler");

/**
 * Route Definitions
 *
 * Each route follows the pattern:
 *   METHOD path → [...validators] → validate → controller
 *
 * The validators collect errors, `validate` checks them and short-circuits
 * with a 400 if any exist, and only then does the controller run.
 * This keeps controllers lean — they never need to worry about raw input.
 */

// GET    /api/tasks          → list all tasks (supports ?status= and ?category= filters)
// POST   /api/tasks          → create a new task
router
  .route("/")
  .get(getAllTasks)
  .post(createTaskValidators, validate, createTask);

// GET    /api/tasks/:id      → get one task
// PATCH  /api/tasks/:id      → partial update of a task
// DELETE /api/tasks/:id      → delete a task
router
  .route("/:id")
  .get(mongoIdValidator, validate, getTaskById)
  .patch(mongoIdValidator, updateTaskValidators, validate, updateTask)
  .delete(mongoIdValidator, validate, deleteTask);

module.exports = router;
