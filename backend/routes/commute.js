const express = require('express');
const router = express.Router();
const { recalcCommuteForUser } = require('../services/commute');

router.post('/recalculate', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    const out = await recalcCommuteForUser(userId);
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Commute calculation failed' });
  }
});

module.exports = router;
