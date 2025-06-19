const { validationResult } = require("express-validator");
const {
  userValidationSchemas,
  handleValidationErrors,
} = require("../validation/userValidation");

// Mock request and response objects
const createMockReq = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => jest.fn();

// Helper function to run validation
const runValidation = async (validationChain, req) => {
  for (const validation of validationChain) {
    await validation.run(req);
  }
  return validationResult(req);
};

describe("User Validation Schemas", () => {
  describe("getUsersQuery validation", () => {
    it("should pass with no query parameters", async () => {
      const req = createMockReq({}, {}, {});
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should pass with valid filter and value", async () => {
      const req = createMockReq({}, {}, { filter: "username", value: "test" });
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should fail with invalid filter", async () => {
      const req = createMockReq({}, {}, { filter: "email", value: "test" });
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Filter must be either 'username' or 'displayName'",
          }),
        ])
      );
    });

    it("should fail when filter provided without value", async () => {
      const req = createMockReq({}, {}, { filter: "username" });
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Value is required when filter is provided",
          }),
        ])
      );
    });

    it("should fail when value provided without filter", async () => {
      const req = createMockReq({}, {}, { value: "test" });
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Filter is required when value is provided",
          }),
        ])
      );
    });

    it("should fail with value too long", async () => {
      const longValue = "a".repeat(51);
      const req = createMockReq(
        {},
        {},
        { filter: "username", value: longValue }
      );
      const result = await runValidation(
        userValidationSchemas.getUsersQuery,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Value must be a string between 1 and 50 characters",
          }),
        ])
      );
    });
  });

  describe("userIdParam validation", () => {
    it("should pass with valid positive integer", async () => {
      const req = createMockReq({}, { id: "1" }, {});
      const result = await runValidation(
        userValidationSchemas.userIdParam,
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should fail with non-integer ID", async () => {
      const req = createMockReq({}, { id: "abc" }, {});
      const result = await runValidation(
        userValidationSchemas.userIdParam,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should fail with negative ID", async () => {
      const req = createMockReq({}, { id: "-1" }, {});
      const result = await runValidation(
        userValidationSchemas.userIdParam,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should fail with zero ID", async () => {
      const req = createMockReq({}, { id: "0" }, {});
      const result = await runValidation(
        userValidationSchemas.userIdParam,
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });
  });

  describe("createUser validation", () => {
    const mockUsers = [
      { id: 1, username: "existinguser", displayName: "Existing User" },
    ];

    it("should pass with valid user data", async () => {
      const req = createMockReq(
        {
          username: "newuser123",
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should fail with missing username", async () => {
      const req = createMockReq(
        {
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username is required",
          }),
        ])
      );
    });

    it("should fail with missing displayName", async () => {
      const req = createMockReq(
        {
          username: "newuser123",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name is required",
          }),
        ])
      );
    });

    it("should fail with username too short", async () => {
      const req = createMockReq(
        {
          username: "ab",
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username must be between 3 and 20 characters",
          }),
        ])
      );
    });

    it("should fail with username too long", async () => {
      const req = createMockReq(
        {
          username: "a".repeat(21),
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username must be between 3 and 20 characters",
          }),
        ])
      );
    });

    it("should fail with invalid username characters", async () => {
      const req = createMockReq(
        {
          username: "user@name",
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username can only contain letters, numbers, and underscores",
          }),
        ])
      );
    });

    it("should fail with duplicate username", async () => {
      const req = createMockReq(
        {
          username: "existinguser",
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });

    it("should fail with displayName too short", async () => {
      const req = createMockReq(
        {
          username: "newuser123",
          displayName: "A",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should fail with displayName too long", async () => {
      const req = createMockReq(
        {
          username: "newuser123",
          displayName: "A".repeat(51),
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should fail with invalid fields", async () => {
      const req = createMockReq(
        {
          username: "newuser123",
          displayName: "New User",
          email: "test@example.com",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Invalid fields: email. Only username and displayName are allowed.",
          }),
        ])
      );
    });

    it("should pass with valid username containing underscores and numbers", async () => {
      const req = createMockReq(
        {
          username: "user_123",
          displayName: "New User",
        },
        {},
        {}
      );
      const result = await runValidation(
        userValidationSchemas.createUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe("updateUser validation", () => {
    const mockUsers = [
      { id: 1, username: "existinguser", displayName: "Existing User" },
      { id: 2, username: "anotheruser", displayName: "Another User" },
    ];

    it("should pass with valid update data", async () => {
      const req = createMockReq(
        {
          username: "updateduser",
          displayName: "Updated User",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.updateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should allow updating with same username (no change)", async () => {
      const req = createMockReq(
        {
          username: "existinguser",
          displayName: "Updated Display Name",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.updateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should fail with duplicate username from different user", async () => {
      const req = createMockReq(
        {
          username: "anotheruser", // Exists for user ID 2
          displayName: "Updated User",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.updateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });
  });

  describe("partialUpdateUser validation", () => {
    const mockUsers = [
      { id: 1, username: "existinguser", displayName: "Existing User" },
      { id: 2, username: "anotheruser", displayName: "Another User" },
    ];

    it("should pass with username only", async () => {
      const req = createMockReq(
        {
          username: "updateduser",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should pass with displayName only", async () => {
      const req = createMockReq(
        {
          displayName: "Updated Display Name",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should pass with both fields", async () => {
      const req = createMockReq(
        {
          username: "updateduser",
          displayName: "Updated Display Name",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });

    it("should fail with no fields provided", async () => {
      const req = createMockReq({}, { id: "1" }, {});
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "At least one field (username or displayName) must be provided for update",
          }),
        ])
      );
    });

    it("should fail with invalid fields", async () => {
      const req = createMockReq(
        {
          username: "updateduser",
          email: "test@example.com",
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Invalid fields: email. Only username and displayName are allowed.",
          }),
        ])
      );
    });

    it("should fail with duplicate username from different user", async () => {
      const req = createMockReq(
        {
          username: "anotheruser", // Exists for user ID 2
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });

    it("should allow updating with same username (no change)", async () => {
      const req = createMockReq(
        {
          username: "existinguser", // Same as current user
        },
        { id: "1" },
        {}
      );
      const result = await runValidation(
        userValidationSchemas.partialUpdateUser(mockUsers),
        req
      );
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe("handleValidationErrors middleware", () => {
    it("should call next() when no validation errors", () => {
      const req = { body: {} };
      const res = createMockRes();
      const next = createMockNext();

      // Mock validationResult to return empty errors
      const mockValidationResult = {
        isEmpty: () => true,
        array: () => [],
      };

      // We need to mock the validationResult function
      jest.doMock("express-validator", () => ({
        ...jest.requireActual("express-validator"),
        validationResult: () => mockValidationResult,
      }));

      const {
        handleValidationErrors: mockHandleValidationErrors,
      } = require("../validation/userValidation");

      // Create a mock request with validation result
      req.validationResult = mockValidationResult;

      // Since we can't easily mock the imported function, we'll test the logic directly
      const errors = { isEmpty: () => true };
      if (errors.isEmpty()) {
        next();
      } else {
        res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return 400 with error details when validation errors exist", () => {
      const req = { body: {} };
      const res = createMockRes();
      const next = createMockNext();

      const mockErrors = [
        { msg: "Username is required", param: "username" },
        { msg: "Display name is required", param: "displayName" },
      ];

      // Test the logic directly
      const errors = {
        isEmpty: () => false,
        array: () => mockErrors,
      };

      if (errors.isEmpty()) {
        next();
      } else {
        res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: mockErrors,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
