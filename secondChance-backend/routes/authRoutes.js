const express = require("express");
const { body, validationResult } = require("express-validator");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../models/db");
const router = express.Router();
const dotenv = require("dotenv");
const pino = require("pino");
dotenv.config();

const logger = pino();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/register", async (req, res) => {
  try {
    const db = await connectToDatabase();
    console.log(db);
    const collection = db.collection("users");

    console.log(collection);
    const existingEmail = await collection.findOne({ email: req.body.email });

    if (existingEmail) {
      logger.error("Email id already exists");
      return res.status(400).json({ error: "Email id already exists" });
    }

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(req.body.password, salt);
    const email = req.body.email;
    const newUser = await collection.insertOne({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: hash,
      createdAt: new Date(),
    });

    const payload = {
      user: {
        id: newUser.insertedId,
      },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);
    logger.info("User registered successfully");
    res.json({ authtoken, email });
  } catch (e) {
    logger.error(e);
    return res.status(500).send("Internal server error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("users");
    const user = await collection.findOne({ email: req.body.email });

    if (user) {
      let result = await bcryptjs.compare(req.body.password, user.password);

      if (!result) {
        logger.error("Wrong credentials");
        return res.status(404).json({ error: "Wrong credentials" });
      }
      const userName = user.firstName;

      const email = user.email;

      const payload = {
        user: {
          id: user.insertedId,
        },
      };

      console.log(userName, email, payload);

      const authtoken = jwt.sign(payload, JWT_SECRET);
      logger.info("User logged in successfully");
      return res.status(200).json({ authtoken, userName, email });
    } else {
      logger.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }
  } catch (e) {
    logger.error(e);
    return res.status(500).send("Internal server error");
  }
});

router.put("/update", async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation errors in update request", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const email = req.header.email;
    if (!email) {
      logger.error("Email not found in the request headers");
      return res
        .status(400)
        .json({ error: "Email not found in the request headers" });
    }

    const db = await connectToDatabase();
    const collection = db.collection("users");
    const user = await collection.findOne({ email: email });

    if (!existingUser) {
      logger.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    user.firstName = req.body.firstName;
    existingUser.updatedAt = new Date();

    const updatedUser = await collection.findOneAndUpdate(
      { email },
      { $set: existingUser },
      { returnDocument: "after" }
    );
    const payload = {
      user: {
        id: updatedUser.insertedId,
      },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);
    logger.info("User updated successfully");

    res.json(authtoken);
  } catch (e) {
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
