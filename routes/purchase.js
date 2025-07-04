// routes/purchase.js
const express  = require('express');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const paypal   = require('@paypal/checkout-server-sdk');
require('dotenv').config();

const router = express.Router();

/* ---------- PayPal client ---------- */
const payEnv   = new paypal.core.SandboxEnvironment(
  'AftLDvxL_UjEtmlHPOL5AptiEIIhbyYOYO55zYFj_bXZnS16sNFZaB_a06j63FO4XB-NY3CdjCpO_IqF',
  'EF_6JBo1OM7xBw1DJX-ml9QWw-tABPnpDE5QnNBrhiSL2lXipwlkD6IRRF0TtHjON7Igx5LcY1SQFMJm'
);
const payClient = new paypal.core.PayPalHttpClient(payEnv);

/* ---------- JWT middleware ---------- */
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, 'process.env.JWT_SECRET', (err, payload) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.userId = payload.userId;
    next();
  });
}

/* ========== 1) CREATE PAYPAL ORDER (address NOT sent to PayPal) ========== */
router.post('/create-order', authenticateToken, async (req, res) => {
  const { price, shipping } = req.body;          // we still accept shipping
  if (price == null) {                           // but no longer require it
    return res.status(400).json({ error: 'Missing price' });
  }

  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: price },
          // ⬆ only amount is passed; shipping omitted on purpose
        },
      ],
    });

    const { result } = await payClient.execute(request);
    res.json({ orderID: result.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'PayPal order creation failed' });
  }
});

/* ========== 2) LIST PURCHASES (unchanged) ========== */
router.get('/', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM purchases
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [totalRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM purchases WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      purchases: rows,
      page: +page,
      totalPages: Math.ceil(totalRows[0].total / limit),
      totalCount: totalRows[0].total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

/* ========== 3) CAPTURE & RECORD PURCHASE (still saves shipping) ========== */
router.post('/', authenticateToken, async (req, res) => {
  const { orderID, cases, description, price, shipping } = req.body;

  if (!orderID || cases == null || !description || price == null || !shipping) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    /* Capture payment on PayPal */
    const captureReq = new paypal.orders.OrdersCaptureRequest(orderID);
    captureReq.requestBody({});
    const captureResp = await payClient.execute(captureReq);
    const paid = captureResp.result.status === 'COMPLETED' ? 1 : 0;

    /* Save everything in MySQL */
    const [result] = await pool.query(
      `INSERT INTO purchases
         (user_id, cases, description, price, paid,
          address_line1, city, state, zip, country, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        cases,
        description,
        price,
        paid,
        shipping.line1,
        shipping.city,
        shipping.state,
        shipping.zip,
        shipping.country,
        shipping.phone,
      ]
    );

    res.status(201).json({
      message: 'Recorded',
      purchaseId: result.insertId,
      paid: Boolean(paid),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment capture or DB save failed' });
  }
});

module.exports = router;
