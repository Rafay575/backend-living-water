// routes/contact.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email and message are required." });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO contacts 
         (name, email, message) 
       VALUES (?, ?,?)`,
      [name, email, message]
    );

    return res.json({
      success: true,
      id: result.insertId,
      message: "Contact saved successfully.",
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "Database error." });
  }
});

module.exports = router;
