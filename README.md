<<<<<<< HEAD
# task-manager
=======
# Task Manager API

A RESTful Task Management API built with **Node.js**, **Express**, and **MongoDB (Mongoose)**. It supports full CRUD operations on tasks, input validation, structured error handling, query filtering, and optional bonus features (due dates, categories, and unit tests).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [Error Handling](#error-handling)
6. [Bonus Features](#bonus-features)
7. [Running Tests](#running-tests)
8. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB via Mongoose |
| Validation | express-validator |
| Logging | morgan |
| Testing | Jest + Supertest + mongodb-memory-server |

---

## Project Structure

```
task-manager/
├── src/
│   ├── app.js                   # Express app setup and server bootstrap
│   ├── config/
│   │   └── db.js                # MongoDB connection logic
│   ├── controllers/
│   │   └── taskController.js    # Route handler functions (business logic)
│   ├── middleware/
│   │   └── errorHandler.js      # Global error handler, validate middleware, createError helper
│   ├── models/
│   │   └── Task.js              # Mongoose schema and model
│   ├── routes/
│   │   └── taskRoutes.js        # Express router wiring routes to controllers
│   └── validators/
│       └── taskValidators.js    # express-validator rule chains
├── tests/
│   └── task.test.js             # Integration tests (Jest + Supertest)
├── .env.example                 # Environment variable template
├── .gitignore
├── jest.config.js
├── package.json
└── README.md
```

The architecture follows a layered approach: Routes declare the URL contract → Validators sanitize and verify input → Controllers execute business logic → Models talk to the database. Each layer has a single responsibility, making the code easy to read, test, and extend.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher ([download](https://nodejs.org/))
- **MongoDB** running locally on port 27017, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/task-manager-api.git
cd task-manager-api
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/task_manager
```

If using MongoDB Atlas, replace `MONGODB_URI` with your connection string from the Atlas dashboard.

**4. Start the development server**

```bash
npm run dev
```

The server will start at `http://localhost:3000`. You should see:

```
✅ MongoDB connected: localhost
🚀 Server running on http://localhost:3000 [development]
```

**5. Verify the server is running**

```bash
curl http://localhost:3000/health
```

---

## API Reference

All endpoints are prefixed with `/api/tasks`. Request and response bodies use JSON.

### Task Object Shape

```json
{
  "_id": "64f3a2...",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "status": "pending",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "category": "Personal",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

All responses follow the envelope: `{ success: Boolean, message: String, data: Object | Array }`.

---

### GET /api/tasks

Returns all tasks, sorted newest-first. Supports optional query filters.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `"pending"` \| `"completed"` | Filter by task status |
| `category` | `string` | Case-insensitive partial match on category |

**Example Requests**

```bash
# All tasks
GET /api/tasks

# Only pending tasks
GET /api/tasks?status=pending

# Tasks in the "Work" category
GET /api/tasks?category=work
```

**Response 200**

```json
{
  "success": true,
  "message": "2 task(s) found",
  "count": 2,
  "data": [ { ...task }, { ...task } ]
}
```

---

### GET /api/tasks/:id

Returns a single task by its MongoDB ObjectId.

**Response 200**

```json
{
  "success": true,
  "message": "Task retrieved successfully",
  "data": { ...task }
}
```

**Response 404** — task not found  
**Response 400** — id is not a valid MongoDB ObjectId

---

### POST /api/tasks

Creates a new task. `title` is required; all other fields are optional.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✅ Yes | 1–150 characters |
| `description` | string | No | Max 1000 characters |
| `dueDate` | ISO 8601 date | No | Cannot be in the past |
| `category` | string | No | Max 50 characters |

**Example**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Finish the report", "description": "Q3 financials", "dueDate": "2099-12-31", "category": "Work"}'
```

**Response 201**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": { ...newTask }
}
```

---

### PATCH /api/tasks/:id

Partially updates a task. Only include the fields you want to change. Marking an already-completed task as `"completed"` again will return an error.

**Request Body** (all fields optional)

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | 1–150 characters |
| `description` | string | Max 1000 characters |
| `status` | `"pending"` \| `"completed"` | Cannot re-complete an already-completed task |
| `dueDate` | ISO 8601 date | Set to `null` to clear |
| `category` | string | Set to `null` to clear |

**Example — mark task as done**

```bash
curl -X PATCH http://localhost:3000/api/tasks/64f3a2... \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

**Response 200**

```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": { ...updatedTask }
}
```

---

### DELETE /api/tasks/:id

Permanently deletes a task. Returns the deleted task in the response so the client knows what was removed.

**Example**

```bash
curl -X DELETE http://localhost:3000/api/tasks/64f3a2...
```

**Response 200**

```json
{
  "success": true,
  "message": "Task deleted successfully",
  "data": { ...deletedTask }
}
```

---

## Error Handling

The API returns structured error responses in a consistent shape:

```json
{
  "success": false,
  "message": "Human-readable summary",
  "errors": [
    { "field": "title", "message": "Title is required" }
  ]
}
```

Validation errors always include the `errors` array pointing to the offending fields. Other errors return just `success` and `message`.

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Validation failed, bad input format, or business rule violation |
| 404 | Task not found |
| 500 | Unexpected server error (details hidden in production) |

---

## Bonus Features

**Due Dates** — Pass an ISO 8601 date string in `dueDate` when creating or updating a task. Dates in the past are rejected. Set to `null` to clear.

**Categories** — Pass a `category` string to group tasks. Use `GET /api/tasks?category=work` to filter by category (case-insensitive partial match).

**Unit Tests** — See [Running Tests](#running-tests) below.

---

## Running Tests

The test suite uses **Jest** for the test runner and **Supertest** to fire real HTTP requests against the Express app. An in-memory MongoDB instance (`mongodb-memory-server`) is used so tests are fully isolated and don't touch your development database.

```bash
# Run tests once
npm test

# Run tests and generate a coverage report
npm test -- --coverage
```

The coverage report is written to `./coverage/` and shows line, branch, function, and statement coverage for all source files.

---

## Key Design Decisions

**PATCH over PUT for updates.** PUT semantics require sending the complete resource, which is unnecessary and fragile for a to-do app where clients typically change just one field at a time. PATCH lets the client send only what changed.

**Enum for `status` instead of a boolean `isCompleted`.** A boolean is limiting — it only has two states. An enum (`"pending"`, `"completed"`) opens the door to adding `"in-progress"` or `"archived"` states later without a schema migration.

**Centralized error handling.** All errors flow through a single `errorHandler` middleware at the bottom of `app.js`. Controllers simply `throw createError(404, "...")` and the handler translates it to the right HTTP response. This keeps controllers clean and ensures error responses are consistent across the whole API.

**Separation of validation and business logic.** express-validator middleware collects and checks input errors before the controller even runs. The `validate` middleware then short-circuits with a 400 if anything is wrong. Controllers can therefore assume their inputs are clean and focus purely on the task at hand.

**Mongoose indexes on `status` and `category`.** Without indexes, filtering by these fields would require a full collection scan. The indexes make filtering queries efficient even as the number of tasks grows.
>>>>>>> cc2c5bc (made task-manager using node js)
