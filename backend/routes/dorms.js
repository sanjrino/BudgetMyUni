const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/all', (req, res) => {
  db.query('SELECT id, name, address, lat, lng, price FROM dorms ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    res.json(rows || []);
  });
});

module.exports = router;
