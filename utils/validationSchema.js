exports.validateUserCreationSchema = {
  username: {
    in: ["body"],
    notEmpty: {
      errorMessage: "The username should not be empty",
    },
    isLength: {
      options: { min: 5, max: 15 },
      errorMessage: "The username must be 5-15 characters",
    },
  },
  displayName: {
    in: ["body"],
    notEmpty: {
      errorMessage: "The displayname should not be empty",
    },
    isLength: {
      options: { min: 5, max: 32 },
      errorMessage: "The displayname must be 5-15 characters",
    },
  },
};
