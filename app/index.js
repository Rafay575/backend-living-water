const express = require('express');
const cors = require('cors');
const authRoutes = require('../routes/auth');
const contact = require('../routes/contact');
require('dotenv').config();
const purchase= require('../routes/purchase');
const app = express();
// enable CORS
app.use(cors({
  origin: '*', // adjust to your frontend origin as needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// parse JSON bodies
app.use(express.json());

// mount auth routes
app.use('/api/auth', authRoutes);
app.use('/api/purchase', purchase);
app.use('/api/contact', contact);
// health check
app.get('/', (req, res) => res.send('🚀 Auth API is running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
