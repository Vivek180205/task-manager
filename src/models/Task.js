const mongoose = require("mongoose");

/**
 * Task Schema
 *
 * Design decisions:
 * - `status` uses an enum instead of a boolean `isCompleted`, giving room
 *   to expand states (e.g. "in-progress", "archived") without schema migrations.
 * - `dueDate` and `category` are included as bonus features — both are optional
 *   so they don't break existing CRUD flows.
 * - Timestamps (createdAt, updatedAt) are auto-managed by Mongoose.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    // Using a string enum for status allows future expansion beyond just done/not-done
    status: {
      type: String,
      enum: {
        values: ["pending", "completed"],
        message: "Status must be either 'pending' or 'completed'",
      },
      default: "pending",
    },

    // BONUS: optional due date for task deadlines
    dueDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          // Allow null (no due date set), but reject past dates on creation
          if (!value) return true;
          return value >= new Date(new Date().setHours(0, 0, 0, 0));
        },
        message: "Due date cannot be in the past",
      },
    },

    // BONUS: optional category to group tasks
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
      default: null,
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,

    // Removes the internal __v version key from API responses
    versionKey: false,
  }
);

// Index on status for efficient filtering queries (e.g., "show all pending tasks")
taskSchema.index({ status: 1 });

// Index on category for grouping queries
taskSchema.index({ category: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
