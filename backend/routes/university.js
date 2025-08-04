const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/all', (req, res) => {
  db.query('SELECT id, name FROM university', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

module.exports = router;
