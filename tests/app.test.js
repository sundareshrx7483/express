const request = require("supertest");
const express = require("express");
const {
  userValidationSchemas,
  handleValidationErrors,
} = require("../validation/userValidation");

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test data - reset for each test
  const mockedUsers = [
    { id: 1, username: "johndoe", displayName: "John Doe" },
    { id: 2, username: "janedoe", displayName: "Jane Doe" },
    { id: 3, username: "sundar2025", displayName: "Sundaresh" },
    { id: 4, username: "coolcoder", displayName: "Code Master" },
    { id: 5, username: "techqueen", displayName: "Tech Queen" },
  ];

  const resolvedFindUserMiddleware = (req, res, next) => {
    const {
      params: { id },
    } = req;
    const parsedId = parseInt(id);
    const findUserIndex = mockedUsers.findIndex((user) => user.id === parsedId);
    if (findUserIndex === -1) return res.sendStatus(404);
    req.findUserIndex = findUserIndex;
    req.parsedId = parsedId;
    next();
  };

  // Routes
  app.get(
    "/api/users",
    userValidationSchemas.getUsersQuery,
    handleValidationErrors,
    (req, res) => {
      const {
        query: { filter, value },
      } = req;
      if (!filter && !value) return res.send(mockedUsers);
      if (filter && value)
        return res.send(
          mockedUsers.filter((user) => user[filter]?.includes(value))
        );
      return res.send(mockedUsers);
    }
  );

  app.get(
    "/api/users/:id",
    userValidationSchemas.userIdParam,
    handleValidationErrors,
    resolvedFindUserMiddleware,
    (req, res) => {
      const user = mockedUsers[req.findUserIndex];
      return res.send(user);
    }
  );

  app.put(
    "/api/users/:id",
    [
      ...userValidationSchemas.userIdParam,
      ...userValidationSchemas.updateUser(mockedUsers),
    ],
    handleValidationErrors,
    resolvedFindUserMiddleware,
    (req, res) => {
      const { body, findUserIndex } = req;
      mockedUsers[findUserIndex] = {
        id: mockedUsers[findUserIndex].id,
        ...body,
      };
      return res.sendStatus(200);
    }
  );

  app.patch(
    "/api/users/:id",
    [
      ...userValidationSchemas.userIdParam,
      ...userValidationSchemas.partialUpdateUser(mockedUsers),
    ],
    handleValidationErrors,
    resolvedFindUserMiddleware,
    (req, res) => {
      const { body, findUserIndex } = req;
      mockedUsers[findUserIndex] = { ...mockedUsers[findUserIndex], ...body };
      return res.sendStatus(200);
    }
  );

  app.delete(
    "/api/users/:id",
    userValidationSchemas.userIdParam,
    handleValidationErrors,
    resolvedFindUserMiddleware,
    (req, res) => {
      const { findUserIndex } = req;
      mockedUsers.splice(findUserIndex, 1);
      return res.sendStatus(200);
    }
  );

  app.post(
    "/api/users",
    userValidationSchemas.createUser(mockedUsers),
    handleValidationErrors,
    (req, res) => {
      const { body } = req;
      const newUsers = {
        id: mockedUsers[mockedUsers.length - 1].id + 1,
        ...body,
      };
      mockedUsers.push(newUsers);
      res
        .status(201)
        .send({ message: "User created successfully!", user: newUsers });
    }
  );

  return app;
};

describe("Express User API", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("GET /api/users", () => {
    it("should return all users when no query parameters", async () => {
      const response = await request(app).get("/api/users").expect(200);

      expect(response.body).toHaveLength(5);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("username");
      expect(response.body[0]).toHaveProperty("displayName");
    });

    it("should filter users by username", async () => {
      const response = await request(app)
        .get("/api/users?filter=username&value=john")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].username).toBe("johndoe");
    });

    it("should filter users by displayName", async () => {
      const response = await request(app)
        .get("/api/users?filter=displayName&value=Jane")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].displayName).toBe("Jane Doe");
    });

    it("should return validation error for invalid filter", async () => {
      const response = await request(app)
        .get("/api/users?filter=email&value=test")
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Filter must be either 'username' or 'displayName'",
          }),
        ])
      );
    });

    it("should return validation error when filter provided without value", async () => {
      const response = await request(app)
        .get("/api/users?filter=username")
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Value is required when filter is provided",
          }),
        ])
      );
    });

    it("should return validation error when value provided without filter", async () => {
      const response = await request(app)
        .get("/api/users?value=test")
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Filter is required when value is provided",
          }),
        ])
      );
    });

    it("should return validation error for value too long", async () => {
      const longValue = "a".repeat(51);
      const response = await request(app)
        .get(`/api/users?filter=username&value=${longValue}`)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Value must be a string between 1 and 50 characters",
          }),
        ])
      );
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return a specific user by ID", async () => {
      const response = await request(app).get("/api/users/1").expect(200);

      expect(response.body).toEqual({
        id: 1,
        username: "johndoe",
        displayName: "John Doe",
      });
    });

    it("should return 404 for non-existent user", async () => {
      await request(app).get("/api/users/999").expect(404);
    });

    it("should return validation error for invalid ID format", async () => {
      const response = await request(app).get("/api/users/abc").expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should return validation error for negative ID", async () => {
      const response = await request(app).get("/api/users/-1").expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should return validation error for zero ID", async () => {
      const response = await request(app).get("/api/users/0").expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });
  });

  describe("POST /api/users", () => {
    it("should create a new user with valid data", async () => {
      const newUser = {
        username: "newuser123",
        displayName: "New User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(201);

      expect(response.body.message).toBe("User created successfully!");
      expect(response.body.user).toMatchObject({
        id: 6,
        username: "newuser123",
        displayName: "New User",
      });
    });

    it("should return validation error for missing username", async () => {
      const newUser = {
        displayName: "New User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username is required",
          }),
        ])
      );
    });

    it("should return validation error for missing displayName", async () => {
      const newUser = {
        username: "newuser123",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name is required",
          }),
        ])
      );
    });

    it("should return validation error for username too short", async () => {
      const newUser = {
        username: "ab",
        displayName: "New User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username must be between 3 and 20 characters",
          }),
        ])
      );
    });

    it("should return validation error for username too long", async () => {
      const newUser = {
        username: "a".repeat(21),
        displayName: "New User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username must be between 3 and 20 characters",
          }),
        ])
      );
    });

    it("should return validation error for invalid username characters", async () => {
      const newUser = {
        username: "user@name",
        displayName: "New User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username can only contain letters, numbers, and underscores",
          }),
        ])
      );
    });

    it("should return validation error for duplicate username", async () => {
      const newUser = {
        username: "johndoe", // Already exists
        displayName: "Another John",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });

    it("should return validation error for displayName too short", async () => {
      const newUser = {
        username: "newuser123",
        displayName: "A",
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should return validation error for displayName too long", async () => {
      const newUser = {
        username: "newuser123",
        displayName: "A".repeat(51),
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should return validation error for invalid fields", async () => {
      const newUser = {
        username: "newuser123",
        displayName: "New User",
        email: "test@example.com", // Invalid field
      };

      const response = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Invalid fields: email. Only username and displayName are allowed.",
          }),
        ])
      );
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update a user with valid data", async () => {
      const updateData = {
        username: "updateduser",
        displayName: "Updated User",
      };

      await request(app).put("/api/users/1").send(updateData).expect(200);

      // Verify the update
      const response = await request(app).get("/api/users/1").expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        username: "updateduser",
        displayName: "Updated User",
      });
    });

    it("should return validation error for invalid user ID", async () => {
      const updateData = {
        username: "updateduser",
        displayName: "Updated User",
      };

      const response = await request(app)
        .put("/api/users/abc")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should return 404 for non-existent user", async () => {
      const updateData = {
        username: "updateduser",
        displayName: "Updated User",
      };

      await request(app).put("/api/users/999").send(updateData).expect(404);
    });

    it("should return validation error for missing required fields", async () => {
      const updateData = {
        username: "updateduser",
        // Missing displayName
      };

      const response = await request(app)
        .put("/api/users/1")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Display name is required",
          }),
        ])
      );
    });

    it("should return validation error for duplicate username", async () => {
      const updateData = {
        username: "janedoe", // Already exists for user ID 2
        displayName: "Updated User",
      };

      const response = await request(app)
        .put("/api/users/1")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });

    it("should allow updating with same username (no change)", async () => {
      const updateData = {
        username: "johndoe", // Same username as current
        displayName: "Updated Display Name",
      };

      await request(app).put("/api/users/1").send(updateData).expect(200);
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("should partially update a user with username only", async () => {
      const updateData = {
        username: "patcheduser",
      };

      await request(app).patch("/api/users/1").send(updateData).expect(200);

      // Verify the update
      const response = await request(app).get("/api/users/1").expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        username: "patcheduser",
        displayName: "John Doe", // Should remain unchanged
      });
    });

    it("should partially update a user with displayName only", async () => {
      const updateData = {
        displayName: "Patched Display Name",
      };

      await request(app).patch("/api/users/1").send(updateData).expect(200);

      // Verify the update
      const response = await request(app).get("/api/users/1").expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        username: "johndoe", // Should remain unchanged
        displayName: "Patched Display Name",
      });
    });

    it("should update both fields when provided", async () => {
      const updateData = {
        username: "patcheduser",
        displayName: "Patched Display Name",
      };

      await request(app).patch("/api/users/1").send(updateData).expect(200);

      // Verify the update
      const response = await request(app).get("/api/users/1").expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        username: "patcheduser",
        displayName: "Patched Display Name",
      });
    });

    it("should return validation error when no fields provided", async () => {
      const updateData = {};

      const response = await request(app)
        .patch("/api/users/1")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "At least one field (username or displayName) must be provided for update",
          }),
        ])
      );
    });

    it("should return validation error for invalid fields", async () => {
      const updateData = {
        username: "patcheduser",
        email: "test@example.com", // Invalid field
      };

      const response = await request(app)
        .patch("/api/users/1")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Invalid fields: email. Only username and displayName are allowed.",
          }),
        ])
      );
    });

    it("should return validation error for duplicate username", async () => {
      const updateData = {
        username: "janedoe", // Already exists for user ID 2
      };

      const response = await request(app)
        .patch("/api/users/1")
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });

    it("should return 404 for non-existent user", async () => {
      const updateData = {
        username: "patcheduser",
      };

      await request(app).patch("/api/users/999").send(updateData).expect(404);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete a user successfully", async () => {
      await request(app).delete("/api/users/1").expect(200);

      // Verify the user is deleted
      await request(app).get("/api/users/1").expect(404);
    });

    it("should return 404 for non-existent user", async () => {
      await request(app).delete("/api/users/999").expect(404);
    });

    it("should return validation error for invalid ID format", async () => {
      const response = await request(app).delete("/api/users/abc").expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });

    it("should return validation error for negative ID", async () => {
      const response = await request(app).delete("/api/users/-1").expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "ID must be a positive integer",
          }),
        ])
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Content-Type", "application/json")
        .send('{"username": "test", "displayName":}') // Malformed JSON
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it("should handle empty request body", async () => {
      const response = await request(app).post("/api/users").send().expect(400);

      expect(response.body.error).toBe("Validation failed");
    });
  });
});
