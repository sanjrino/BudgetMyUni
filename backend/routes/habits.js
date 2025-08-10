const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/all', (req, res) => {
  const userId = req.session.userId || 0;
  const sql = `
    SELECT id, name, price
    FROM habits
    WHERE isPublic = 1 OR ownerUserId = ?
    ORDER BY name ASC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json(rows);
  });
});

router.post('/custom', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not logged in' });

  const { name, price, makePublic } = req.body;
  const p = Number(price);
  if (!name || !Number.isFinite(p) || p <= 0) {
    return res.status(400).json({ message: 'Valid name and price required' });
  }

  const sql = `INSERT INTO habits (name, price, ownerUserId, isPublic) VALUES (?,?,?,?)`;
  db.query(sql, [name, p, userId, makePublic ? 1 : 0], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json({ id: result.insertId, name, price: p });
  });
});

module.exports = router;
