const express = require("express");
const {
  query,
  validationResult,
  checkSchema,
  matchedData,
} = require("express-validator");
const { validateUserCreationSchema } = require("./utils/validationSchema.js");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

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
  if (isNaN(parsedId)) return res.status(400).send("Invalid id");
  const findUserIndex = mockedUsers.findIndex((user) => user.id === parsedId);
  if (findUserIndex === -1) return res.sendStatus(404);
  req.findUserIndex = findUserIndex;
  req.parsedId = parsedId;
  next();
};

app.get(
  "/api/users",
  [
    query("filter")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("The username must not be empty")
      .isLength({ min: 5, max: 15 })
      .withMessage("The Username character must be 5-15 characters"),

    query("value")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("The username value must not be empty")
      .isLength({ min: 5, max: 15 })
      .withMessage("The Username character must be 5-15 characters"),
  ],
  (req, res) => {
    const {
      query: { filter, value },
    } = req;
    console.log(filter);
    console.log(value);
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty())
      return res.status(400).send({ errors: errors.array() });
    if (!filter && !value) return res.send(mockedUsers);
    if (filter && value)
      return res.send(
        mockedUsers.filter((user) => user[filter]?.includes(value))
      );
    return res.send(mockedUsers);
  }
);
// app.get("/api/users", (req, res) => {
//   res.status(200).send(mockedUsers);
// });

app.get("/api/users/:id", resolvedFindUserMiddleware, (req, res) => {
  const user = mockedUsers[req.findUserIndex];
  return res.send(user);
});

app.put("/api/users/:id", resolvedFindUserMiddleware, (req, res) => {
  const { body, findUserIndex } = req;
  mockedUsers[findUserIndex] = { id: mockedUsers[findUserIndex].id, ...body };
  return res.sendStatus(200);
});

app.patch("/api/users/:id", resolvedFindUserMiddleware, (req, res) => {
  const { body, findUserIndex } = req;
  mockedUsers[findUserIndex] = { ...mockedUsers[findUserIndex], ...body };
  return res.sendStatus(200);
});

app.delete("/api/users/:id", resolvedFindUserMiddleware, (req, res) => {
  const { findUserIndex } = req;
  mockedUsers.splice(findUserIndex, 1);
  return res.sendStatus(200);
});

app.post("/api/users", checkSchema(validateUserCreationSchema), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.array() });
  }
  const data = matchedData(req);

  const newUsers = { id: mockedUsers[mockedUsers.length - 1].id + 1, ...data };
  mockedUsers.push(newUsers);
  res
    .status(201)
    .send({ message: "User created successfully!", user: newUsers });
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
