const express = require('express');
const router = express.Router();
const { planTrip } = require('../services/otpClient');

router.post('/plan', async (req, res) => {
  try {
    const { fromLat, fromLon, toLat, toLon, date, time } = req.body;
    const itineraries = await planTrip({ fromLat, fromLon, toLat, toLon, date, time });
    const msToISO = ms => new Date(ms).toISOString();
    itineraries.forEach(it => {
      it.walkKm = Number((it.walkDistance / 1000).toFixed(2));
      it.legs.forEach(l => { l.startISO = msToISO(l.startTime); l.endISO = msToISO(l.endTime); });
    });
    res.json({ itineraries });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'OTP failed' });
  }
});

module.exports = router;
