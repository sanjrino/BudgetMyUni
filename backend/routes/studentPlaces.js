const express = require('express');
const router = express.Router();
const db = require('../db');
const { geocode } = require('../services/geocode');

async function getSavedPlaces(userId) {
  const [rows] = await db.promise().query(
    'SELECT savedPlaces FROM students WHERE userId = ? LIMIT 1',
    [userId]
  );
  let places = [];
  if (rows[0]?.savedPlaces) {
    try { places = JSON.parse(rows[0].savedPlaces); } catch { places = []; }
  }
  if (!Array.isArray(places)) places = [];
  return places;
}

router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    const places = await getSavedPlaces(userId);
    res.json({ savedPlaces: places });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load places' });
  }
});

router.post('/upsert', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not logged in' });

    const { id, name, streetName, lat, lng } = req.body;
    if (!id) return res.status(400).json({ message: 'id is required (e.g., "home")' });

    const places = await getSavedPlaces(userId);
    
    let finalLat = Number(lat);
    let finalLng = Number(lng);

    if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
      if (!streetName) {
        return res.status(400).json({ message: 'streetName required when lat/lng not provided' });
      }
      const results = await geocode(streetName);
      if (!results.length) return res.status(422).json({ message: 'Address not found' });
      finalLat = Number(results[0].lat);
      finalLng = Number(results[0].lon);
    }

    if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
      return res.status(422).json({ message: 'Invalid coordinates' });
    }

    const placeObj = {
      id,
      name: name || id,
      streetName: streetName || '',
      lat: finalLat,
      lng: finalLng
    };

    const idx = places.findIndex(p => p.id === id);
    if (idx >= 0) places[idx] = { ...places[idx], ...placeObj };
    else places.push(placeObj);

    await db.promise().query(
      'UPDATE students SET savedPlaces = ? WHERE userId = ?',
      [JSON.stringify(places), userId]
    );

    res.json({ ok: true, place: placeObj, savedPlaces: places });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to save place' });
  }
});

module.exports = router;
