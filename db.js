const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:    '50.63.132.206',
  user:     'living_water',
  password: 'LoXwxwKWMPlH',
  database: 'living_water',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
