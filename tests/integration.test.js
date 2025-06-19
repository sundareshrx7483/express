const request = require("supertest");
const express = require("express");
const {
  userValidationSchemas,
  handleValidationErrors,
} = require("../validation/userValidation");

// Create a test app instance with fresh data for each test
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Fresh test data for each test
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

describe("Integration Tests", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("Complete User Lifecycle", () => {
    it("should create, read, update, and delete a user successfully", async () => {
      // 1. Create a new user
      const newUser = {
        username: "testuser123",
        displayName: "Test User",
      };

      const createResponse = await request(app)
        .post("/api/users")
        .send(newUser)
        .expect(201);

      expect(createResponse.body.message).toBe("User created successfully!");
      expect(createResponse.body.user).toMatchObject({
        id: 6,
        username: "testuser123",
        displayName: "Test User",
      });

      const userId = createResponse.body.user.id;

      // 2. Read the created user
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(readResponse.body).toMatchObject({
        id: userId,
        username: "testuser123",
        displayName: "Test User",
      });

      // 3. Update the user (PUT)
      const updateData = {
        username: "updateduser123",
        displayName: "Updated Test User",
      };

      await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      // Verify the update
      const updatedReadResponse = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(updatedReadResponse.body).toMatchObject({
        id: userId,
        username: "updateduser123",
        displayName: "Updated Test User",
      });

      // 4. Partial update the user (PATCH)
      const patchData = {
        displayName: "Patched Test User",
      };

      await request(app)
        .patch(`/api/users/${userId}`)
        .send(patchData)
        .expect(200);

      // Verify the patch
      const patchedReadResponse = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(patchedReadResponse.body).toMatchObject({
        id: userId,
        username: "updateduser123", // Should remain unchanged
        displayName: "Patched Test User",
      });

      // 5. Delete the user
      await request(app).delete(`/api/users/${userId}`).expect(200);

      // Verify the deletion
      await request(app).get(`/api/users/${userId}`).expect(404);
    });
  });

  describe("Complex Filtering Scenarios", () => {
    it("should handle case-sensitive filtering correctly", async () => {
      // Test case sensitivity in username filtering
      const response1 = await request(app)
        .get("/api/users?filter=username&value=John")
        .expect(200);

      expect(response1.body).toHaveLength(0); // Should be empty as usernames are lowercase

      const response2 = await request(app)
        .get("/api/users?filter=username&value=john")
        .expect(200);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].username).toBe("johndoe");
    });

    it("should handle partial matches in display names", async () => {
      const response = await request(app)
        .get("/api/users?filter=displayName&value=Doe")
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((user) => user.displayName)).toEqual(
        expect.arrayContaining(["John Doe", "Jane Doe"])
      );
    });

    it("should return empty array when no matches found", async () => {
      const response = await request(app)
        .get("/api/users?filter=username&value=nonexistent")
        .expect(200);

      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple user creations with unique usernames", async () => {
      const users = [
        { username: "user1", displayName: "User One" },
        { username: "user2", displayName: "User Two" },
        { username: "user3", displayName: "User Three" },
      ];

      const promises = users.map((user) =>
        request(app).post("/api/users").send(user).expect(201)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.body.message).toBe("User created successfully!");
        expect(response.body.user.username).toBe(users[index].username);
        expect(response.body.user.displayName).toBe(users[index].displayName);
      });

      // Verify all users were created
      const allUsersResponse = await request(app).get("/api/users").expect(200);

      expect(allUsersResponse.body).toHaveLength(8); // 5 original + 3 new
    });

    it("should prevent duplicate username creation in concurrent requests", async () => {
      const duplicateUser = {
        username: "duplicateuser",
        displayName: "Duplicate User",
      };

      // Try to create the same user twice simultaneously
      const promises = [
        request(app).post("/api/users").send(duplicateUser),
        request(app).post("/api/users").send(duplicateUser),
      ];

      const responses = await Promise.all(promises);

      // One should succeed, one should fail
      const successCount = responses.filter((res) => res.status === 201).length;
      const failureCount = responses.filter((res) => res.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // The failed response should have a duplicate username error
      const failedResponse = responses.find((res) => res.status === 400);
      expect(failedResponse.body.error).toBe("Validation failed");
      expect(failedResponse.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username already exists",
          }),
        ])
      );
    });
  });

  describe("Edge Cases and Boundary Testing", () => {
    it("should handle username at minimum length boundary", async () => {
      const user = {
        username: "abc", // Exactly 3 characters (minimum)
        displayName: "ABC User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.username).toBe("abc");
    });

    it("should handle username at maximum length boundary", async () => {
      const user = {
        username: "a".repeat(20), // Exactly 20 characters (maximum)
        displayName: "Long Username User",
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.username).toBe("a".repeat(20));
    });

    it("should handle displayName at minimum length boundary", async () => {
      const user = {
        username: "testuser",
        displayName: "AB", // Exactly 2 characters (minimum)
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.displayName).toBe("AB");
    });

    it("should handle displayName at maximum length boundary", async () => {
      const user = {
        username: "testuser",
        displayName: "A".repeat(50), // Exactly 50 characters (maximum)
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.displayName).toBe("A".repeat(50));
    });

    it("should handle special characters in displayName", async () => {
      const user = {
        username: "testuser",
        displayName: "Test User-123 (Special)",
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.displayName).toBe("Test User-123 (Special)");
    });

    it("should trim whitespace from displayName", async () => {
      const user = {
        username: "testuser",
        displayName: "  Test User  ", // Has leading and trailing spaces
      };

      const response = await request(app)
        .post("/api/users")
        .send(user)
        .expect(201);

      expect(response.body.user.displayName).toBe("Test User"); // Should be trimmed
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should maintain data consistency after failed operations", async () => {
      // Get initial user count
      const initialResponse = await request(app).get("/api/users").expect(200);
      const initialCount = initialResponse.body.length;

      // Try to create a user with invalid data
      await request(app)
        .post("/api/users")
        .send({ username: "ab", displayName: "Test" }) // Username too short
        .expect(400);

      // Verify user count hasn't changed
      const afterFailedResponse = await request(app)
        .get("/api/users")
        .expect(200);
      expect(afterFailedResponse.body).toHaveLength(initialCount);

      // Try to update a non-existent user
      await request(app)
        .put("/api/users/999")
        .send({ username: "testuser", displayName: "Test User" })
        .expect(404);

      // Verify existing users are unchanged
      const afterFailedUpdateResponse = await request(app)
        .get("/api/users")
        .expect(200);
      expect(afterFailedUpdateResponse.body).toHaveLength(initialCount);

      // Verify specific user data is unchanged
      const userResponse = await request(app).get("/api/users/1").expect(200);
      expect(userResponse.body).toMatchObject({
        id: 1,
        username: "johndoe",
        displayName: "John Doe",
      });
    });

    it("should handle malformed request bodies gracefully", async () => {
      // Test with completely invalid JSON structure
      const response = await request(app)
        .post("/api/users")
        .set("Content-Type", "application/json")
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it("should handle requests with null values", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          username: null,
          displayName: null,
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
    });

    it("should handle requests with undefined values", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          username: undefined,
          displayName: "Test User",
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
    });
  });

  describe("Performance and Load Testing", () => {
    it("should handle multiple read operations efficiently", async () => {
      const startTime = Date.now();

      // Perform 10 concurrent read operations
      const promises = Array(10)
        .fill()
        .map(() => request(app).get("/api/users").expect(200));

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.body).toHaveLength(5);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it("should handle filtering operations with various query sizes", async () => {
      const queries = [
        { filter: "username", value: "j" },
        { filter: "username", value: "jo" },
        { filter: "username", value: "joh" },
        { filter: "displayName", value: "D" },
        { filter: "displayName", value: "Do" },
        { filter: "displayName", value: "Doe" },
      ];

      const promises = queries.map((query) =>
        request(app)
          .get(`/api/users?filter=${query.filter}&value=${query.value}`)
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed and return arrays
      responses.forEach((response) => {
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });
});
