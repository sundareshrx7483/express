const express = require("express");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

const mockedUsers = [
  {
    id: 1,
    username: "johndoe",
    displayName: "John Doe",
  },
  {
    id: 2,
    username: "janedoe",
    displayName: "Jane Doe",
  },
  {
    id: 3,
    username: "sundar2025",
    displayName: "Sundaresh",
  },
  {
    id: 4,
    username: "coolcoder",
    displayName: "Code Master",
  },
  {
    id: 5,
    username: "techqueen",
    displayName: "Tech Queen",
  },
];
app.get("/", (req, res) => {
  res.writeHead(200, { "content-type": "text/html" });

  res.end("Hi, How are you");
});

app.get("/api/users", (req, res) => {
  // console.log(req.query);
  const {
    query: { filter, value },
  } = req;

  if (!filter && !value) return res.send(mockedUsers);
  if (filter && value)
    return res.send(mockedUsers.filter((user) => user[filter].includes(value)));
});

app.get("/api/users/:id", (req, res) => {
  const parsedId = parseInt(req.params.id);

  if (isNaN(parsedId)) return res.status(400).send("Invalid id");
  const findUsers = mockedUsers.find((user) => user.id === parsedId);

  if (!findUsers) return res.sendStatus(404);
  return res.send(findUsers);
});
app.put("/api/users/:id", (req, res) => {
  const {
    body,
    params: { id },
  } = req;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return res.status(400);
  const findIndex = mockedUsers.findIndex((user) => user.id === parsedId);
  if (findIndex === -1) return res.status(404);
  mockedUsers[findIndex] = { id: parsedId, ...body };
  return res.sendStatus(200);
});

app.get("/api/products", (req, res) => {
  res.status(200).send([
    {
      id: 101,
      productName: "Wireless Mouse",
      price: 799,
    },
    {
      id: 102,
      productName: "Bluetooth Headphones",
      price: 2499,
    },
    {
      id: 103,
      productName: "Mechanical Keyboard",
      price: 3499,
    },
    {
      id: 104,
      productName: 'LED Monitor 24"',
      price: 10999,
    },
    {
      id: 105,
      productName: "USB-C Hub",
      price: 1299,
    },
  ]);
});

app.post("/api/users", (req, res) => {
  console.log(req.body);
  const { body } = req;
  const newUsers = { id: mockedUsers[mockedUsers.length - 1].id + 1, ...body };
  console.log(newUsers);
  mockedUsers.push(newUsers);
  res
    .status(201)
    .send({ message: "User created successfully!", user: newUsers });
});
app.patch("/api/users/:id", (req, res) => {
  const {
    body,
    params: { id },
  } = req;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return res.status(400);
  const findIndex = mockedUsers.findIndex((user) => user.id === parsedId);
  if (findIndex === -1) return res.status(404);
  mockedUsers[findIndex] = { ...mockedUsers[findIndex], ...body };
  return res.sendStatus(200);
});

app.delete("/api/users/:id", (req, res) => {
  const {
    params: { id },
  } = req;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return res.status(400);
  const findUserIndex = mockedUsers.findIndex((user) => user.id === parsedId);
  if (findUserIndex === -1) return res.status(404);
  mockedUsers.splice(findUserIndex, 1);
  return res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
