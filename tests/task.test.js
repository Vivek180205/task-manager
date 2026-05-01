/**
 * Task API Integration Tests
 *
 * We use Supertest to send real HTTP requests to our Express app without
 * spinning up an actual server, and mongodb-memory-server to run an
 * in-memory MongoDB instance so tests are isolated from production data.
 *
 * Test structure follows the AAA pattern: Arrange → Act → Assert.
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const Task = require("../src/models/Task");

let mongoServer;

// ─── Lifecycle Hooks ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Start a fresh in-memory MongoDB before any tests run
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Wipe all collections after each test to prevent bleed-through
  await Task.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Creates a task directly in the DB — useful for tests that need pre-existing data */
const seedTask = (overrides = {}) =>
  Task.create({ title: "Default Task", description: "Default desc", ...overrides });

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

describe("POST /api/tasks", () => {
  it("creates a task with valid title and description", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "Buy groceries", description: "Milk, eggs, bread" });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Buy groceries");
    expect(res.body.data.status).toBe("pending"); // default status
  });

  it("rejects a task with an empty title", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].field).toBe("title");
  });

  it("rejects a task when title is missing entirely", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ description: "No title provided" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("creates a task with optional dueDate and category (bonus fields)", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "File taxes", dueDate: "2099-04-15", category: "Finance" });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.category).toBe("Finance");
    expect(res.body.data.dueDate).not.toBeNull();
  });
});

// ─── GET /api/tasks ───────────────────────────────────────────────────────────

describe("GET /api/tasks", () => {
  it("returns an empty array when no tasks exist", async () => {
    const res = await request(app).get("/api/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it("returns all seeded tasks", async () => {
    await seedTask({ title: "Task A" });
    await seedTask({ title: "Task B" });

    const res = await request(app).get("/api/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it("filters tasks by status=pending", async () => {
    await seedTask({ title: "Pending Task", status: "pending" });
    await seedTask({ title: "Done Task", status: "completed" });

    const res = await request(app).get("/api/tasks?status=pending");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe("Pending Task");
  });

  it("filters tasks by category", async () => {
    await seedTask({ title: "Work Task", category: "Work" });
    await seedTask({ title: "Home Task", category: "Home" });

    const res = await request(app).get("/api/tasks?category=work");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
  });
});

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────

describe("GET /api/tasks/:id", () => {
  it("retrieves a task by valid id", async () => {
    const task = await seedTask({ title: "Read a book" });

    const res = await request(app).get(`/api/tasks/${task._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe("Read a book");
  });

  it("returns 404 for a non-existent valid id", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/tasks/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid id format", async () => {
    const res = await request(app).get("/api/tasks/not-a-valid-id");

    expect(res.statusCode).toBe(400);
  });
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

describe("PATCH /api/tasks/:id", () => {
  it("marks a pending task as completed", async () => {
    const task = await seedTask({ status: "pending" });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ status: "completed" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("completed");
  });

  it("prevents marking an already-completed task as completed again", async () => {
    const task = await seedTask({ status: "completed" });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ status: "completed" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already marked as completed/i);
  });

  it("updates task title and description", async () => {
    const task = await seedTask({ title: "Old title" });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ title: "New title", description: "Updated" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe("New title");
  });

  it("returns 400 when trying to set title to empty string", async () => {
    const task = await seedTask();

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ title: "" });

    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for a non-existent task", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/tasks/${fakeId}`)
      .send({ title: "Updated" });

    expect(res.statusCode).toBe(404);
  });
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

describe("DELETE /api/tasks/:id", () => {
  it("deletes an existing task", async () => {
    const task = await seedTask({ title: "To be deleted" });

    const res = await request(app).delete(`/api/tasks/${task._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it's truly gone from the DB
    const deleted = await Task.findById(task._id);
    expect(deleted).toBeNull();
  });

  it("returns 404 when deleting a non-existent task", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/tasks/${fakeId}`);

    expect(res.statusCode).toBe(404);
  });
});
