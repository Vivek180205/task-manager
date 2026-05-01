/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js"],
  // Give async tests enough time to spin up mongodb-memory-server
  testTimeout: 30000,
};
