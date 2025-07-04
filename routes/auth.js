const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
require("dotenv").config();

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { firstname, email, password } = req.body;
  if (!firstname || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1. check if user exists
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // 2. hash the password
    const hash = await bcrypt.hash(password, 10);

    // 3. insert user
    const [result] = await pool.query(
      "INSERT INTO users (firstname, email, password) VALUES (?, ?, ?)",
      [firstname, email, hash]
    );

    res
      .status(201)
      .json({ message: "User registered", userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // 1. fetch user
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];

    // 2. compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. sign JWT
    const token = jwt.sign(
      { userId: user.id, firstname: user.firstname },
      "process.env.JWT_SECRET",
      { expiresIn: '1h' }
    );

    res.json({ message: "Logged in", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
