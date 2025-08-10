const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/all', (req, res) => {
  const userId = req.session.userId || 0;
  const sql = `
    SELECT id, name, price
    FROM food
    WHERE isPublic = 1 OR ownerUserId = ?
    ORDER BY name
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
    return res.status(400).json({ message: 'Name & valid price required' });
  }

  const publicFlag = (makePublic === true || makePublic === 'true' || makePublic === 1 || makePublic === '1') ? 1 : 0;

  const sql = `
    INSERT INTO food (name, price, ownerUserId, isPublic)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [name, p, userId, publicFlag], (err, result) => {
    if (err) return res.status(500).json({ message: 'Insert failed' });
    res.json({ id: result.insertId, name, price: p });
  });
});

module.exports = router;
