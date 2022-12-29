const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8mgm9lb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {   
    const postCollection = client.db("cloudfood").collection("post");
    const commentCollection = client.db("cloudfood").collection("comment");
    const userCollection = client.db("cloudfood").collection("user");

    // jwt authorization
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15d",
      });
      res.send({ token });
    });

    // new postCollection adding to bd
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await postCollection.insertOne(service);
      res.send(result);
    });

    // all services send
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = postCollection.find(query, { sort: { time: -1 } });
      const services = await cursor.limit(3).toArray();
      res.send(services);
    });
    // for sepecific services app.get
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = postCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    // data take
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await postCollection.findOne(query);
      res.send(service);
    });
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { service: id };
      const cursor = commentCollection.find(query, { sort: { time: -1 } });
      const reviews = await cursor.toArray();
      console.log(id);
      res.send(reviews);
    });

    // reviews collection
    app.get("/reviews", verifyJWT, async (req, res) => {
      console.log("got here...");
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = commentCollection.find(query, { sort: { time: -1 } });
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    // review upate secondary
    app.get("/update-reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = commentCollection.find(query);
      const result = await cursor.toArray();
      console.log(id);
      res.send(result);
    });
    // send to database
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await commentCollection.insertOne(review);
      res.send(result);
    });
    // Review Update
    app.patch("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const result = await commentCollection.updateOne(
        { _id: ObjectId(id) },
        { $set: { message: req.body?.reviewText } }
      );
      res.send(result);
    });
    // reviews delete
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await commentCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("food is running");
});

app.listen(port, () => {
  console.log(`food server running on ${port}`);
});
