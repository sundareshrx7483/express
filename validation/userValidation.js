const { body, query, param, validationResult } = require("express-validator");

// Validation error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Helper function to check username uniqueness
const checkUsernameUniqueness = (mockedUsers) => {
  return (value, { req }) => {
    const userId = req.params.id ? parseInt(req.params.id) : null;
    const existingUser = mockedUsers.find(
      (user) => user.username === value && user.id !== userId
    );
    if (existingUser) {
      throw new Error("Username already exists");
    }
    return true;
  };
};

// User validation schemas
const userValidationSchemas = {
  // GET /api/users query validation
  getUsersQuery: [
    query("filter")
      .optional()
      .isIn(["username", "displayName"])
      .withMessage("Filter must be either 'username' or 'displayName'"),
    query("value")
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage("Value must be a string between 1 and 50 characters"),
    query("filter").custom((value, { req }) => {
      if (value && !req.query.value) {
        throw new Error("Value is required when filter is provided");
      }
      return true;
    }),
    query("value").custom((value, { req }) => {
      if (value && !req.query.filter) {
        throw new Error("Filter is required when value is provided");
      }
      return true;
    }),
  ],

  // User ID parameter validation
  userIdParam: [
    param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
  ],

  // POST /api/users body validation
  createUser: (mockedUsers) => [
    body("username")
      .notEmpty()
      .withMessage("Username is required")
      .isString()
      .withMessage("Username must be a string")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      )
      .custom(checkUsernameUniqueness(mockedUsers)),
    body("displayName")
      .notEmpty()
      .withMessage("Display name is required")
      .isString()
      .withMessage("Display name must be a string")
      .isLength({ min: 2, max: 50 })
      .withMessage("Display name must be between 2 and 50 characters")
      .trim(),
    body().custom((value) => {
      const allowedFields = ["username", "displayName"];
      const providedFields = Object.keys(value);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field)
      );
      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid fields: ${invalidFields.join(
            ", "
          )}. Only username and displayName are allowed.`
        );
      }
      return true;
    }),
  ],

  // PUT /api/users/:id body validation
  updateUser: (mockedUsers) => [
    body("username")
      .notEmpty()
      .withMessage("Username is required")
      .isString()
      .withMessage("Username must be a string")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      )
      .custom(checkUsernameUniqueness(mockedUsers)),
    body("displayName")
      .notEmpty()
      .withMessage("Display name is required")
      .isString()
      .withMessage("Display name must be a string")
      .isLength({ min: 2, max: 50 })
      .withMessage("Display name must be between 2 and 50 characters")
      .trim(),
    body().custom((value) => {
      const allowedFields = ["username", "displayName"];
      const providedFields = Object.keys(value);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field)
      );
      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid fields: ${invalidFields.join(
            ", "
          )}. Only username and displayName are allowed.`
        );
      }
      return true;
    }),
  ],

  // PATCH /api/users/:id body validation
  partialUpdateUser: (mockedUsers) => [
    body("username")
      .optional()
      .isString()
      .withMessage("Username must be a string")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      )
      .custom((value, { req }) => {
        if (value) {
          return checkUsernameUniqueness(mockedUsers)(value, { req });
        }
        return true;
      }),
    body("displayName")
      .optional()
      .isString()
      .withMessage("Display name must be a string")
      .isLength({ min: 2, max: 50 })
      .withMessage("Display name must be between 2 and 50 characters")
      .trim(),
    body().custom((value) => {
      const allowedFields = ["username", "displayName"];
      const providedFields = Object.keys(value);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field)
      );
      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid fields: ${invalidFields.join(
            ", "
          )}. Only username and displayName are allowed.`
        );
      }
      if (providedFields.length === 0) {
        throw new Error(
          "At least one field (username or displayName) must be provided for update"
        );
      }
      return true;
    }),
  ],
};

module.exports = {
  userValidationSchemas,
  handleValidationErrors,
};
