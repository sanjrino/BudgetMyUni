const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/all', (req, res) => {
  db.query('SELECT id, name, address, lat, lng FROM university', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
