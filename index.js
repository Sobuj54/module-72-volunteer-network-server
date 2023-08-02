const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l0lz8w0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify jwt
const verifyJWT = (req, res, next) => {
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const volunteerCollection = client
      .db("volunteerNetwork")
      .collection("volunteers");

    const userCollection = client.db("volunteerNetwork").collection("users");

    const eventCollection = client.db("volunteerNetwork").collection("events");

    // jwt token generation
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      console.log(token);
      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const users = req.body;
      const result = await userCollection.insertOne(users);
      res.send(result);
    });

    app.post("/events", async (req, res) => {
      const events = req.body;
      console.log(events);
      const result = await eventCollection.insertOne(events);
      res.send(result);
    });

    app.get("/events", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log(decoded);
      // verifying token
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "invalid token" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await eventCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/volunteers", async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const skip = page * limit;

      const result = await volunteerCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is woriking");
});

app.listen(port, () => {
  console.log(`server is running at port :${port}`);
});
