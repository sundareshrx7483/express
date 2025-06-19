module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  collectCoverageFrom: [
    "**/*.js",
    "!node_modules/**",
    "!coverage/**",
    "!jest.config.js",
    "!**/*.test.js",
  ],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
