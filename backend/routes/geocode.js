const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocode');

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await geocode(q);
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Geocoding failed' });
  }
});

module.exports = router;
