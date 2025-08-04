const express = require('express');
const router = express.Router();
const db = require('../db');

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

router.get('/me', (req, res) => {
    console.log('Session:', req.session);
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not logged in' });

  const sql = `
    SELECT s.*, u.nickname 
    FROM students s
    JOIN users u ON s.userId = u.id
    WHERE s.userId = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'Profile not found' });
    res.json(result[0]);
  });
});

router.post('/save', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not logged in' });

  const {
    budget,
    apartmentLocation,
    apartmentPrice,
    apartmentExpenses,
    foodPreferenceBreakfast,
    foodPreferenceLunch,
    foodPreferenceDinner,
    habits,
    universityFrequency,
    habitsFrequency,
    foodFrequency
  } = req.body;

  db.query('SELECT * FROM students WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error checking profile' });
    }

    if (rows.length === 0) {
   
      const fields = ['userId'];
      const values = [userId];
      const placeholders = ['?'];


      if (budget) { fields.push('budget'); values.push(budget); placeholders.push('?'); }
      if (apartmentLocation) { fields.push('apartmentLocation'); values.push(apartmentLocation); placeholders.push('?'); }
      if (apartmentPrice) { fields.push('apartmentPrice'); values.push(apartmentPrice); placeholders.push('?'); }
      if (apartmentExpenses) { fields.push('apartmentExpenses'); values.push(apartmentExpenses); placeholders.push('?'); }
      if (foodPreferenceBreakfast) { fields.push('foodPreferenceBreakfast'); values.push(JSON.stringify(safeParse(foodPreferenceBreakfast))); placeholders.push('?'); }
      if (foodPreferenceLunch) { fields.push('foodPreferenceLunch'); values.push(JSON.stringify(safeParse(foodPreferenceLunch))); placeholders.push('?'); }
      if (foodPreferenceDinner) { fields.push('foodPreferenceDinner'); values.push(JSON.stringify(safeParse(foodPreferenceDinner))); placeholders.push('?'); }
      if (habits) { fields.push('habits'); values.push(JSON.stringify(safeParse(habits))); placeholders.push('?'); }
      if (universityFrequency) { fields.push('universityFrequency'); values.push(JSON.stringify(safeParse(universityFrequency))); placeholders.push('?'); }
      if (habitsFrequency) { fields.push('habitsFrequency'); values.push(JSON.stringify(safeParse(habitsFrequency))); placeholders.push('?'); } // ✅ ADD THIS
      if (foodFrequency) {
  fields.push('foodFrequency');
  values.push(JSON.stringify(safeParse(foodFrequency)));
  placeholders.push('?');
}

      const sql = `INSERT INTO students (${fields.join(',')}) VALUES (${placeholders.join(',')})`;
      db.query(sql, values, (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ message: 'Error inserting preferences' });
        }
        return res.json({ message: 'Preferences created!' });
      });

    } else {
      const updates = [];
      const values = [];

      if (budget) { updates.push('budget = ?'); values.push(budget); }
      if (apartmentLocation) { updates.push('apartmentLocation = ?'); values.push(apartmentLocation); }
      if (apartmentPrice) { updates.push('apartmentPrice = ?'); values.push(apartmentPrice); }
      if (apartmentExpenses) { updates.push('apartmentExpenses = ?'); values.push(apartmentExpenses); }
      if (foodPreferenceBreakfast) { updates.push('foodPreferenceBreakfast = ?'); values.push(JSON.stringify(safeParse(foodPreferenceBreakfast))); }
      if (foodPreferenceLunch) { updates.push('foodPreferenceLunch = ?'); values.push(JSON.stringify(safeParse(foodPreferenceLunch))); }
      if (foodPreferenceDinner) { updates.push('foodPreferenceDinner = ?'); values.push(JSON.stringify(safeParse(foodPreferenceDinner))); }
      if (habits) { updates.push('habits = ?'); values.push(JSON.stringify(safeParse(habits))); }
      if (universityFrequency) { updates.push('universityFrequency = ?'); values.push(JSON.stringify(safeParse(universityFrequency))); }
      if (habitsFrequency) { updates.push('habitsFrequency = ?'); values.push(JSON.stringify(safeParse(habitsFrequency))); } // ✅ ADD THIS
      if (foodFrequency) {
  updates.push('foodFrequency = ?');
  values.push(JSON.stringify(safeParse(foodFrequency)));
}

      if (updates.length === 0) {
        return res.json({ message: 'No changes provided.' });
      }

      const sql = `UPDATE students SET ${updates.join(', ')} WHERE userId = ?`;
      values.push(userId);

      db.query(sql, values, (err3) => {
        if (err3) {
          console.error(err3);
          return res.status(500).json({ message: 'Error updating preferences' });
        }
        return res.json({ message: 'Preferences updated!' });
      });
    }
  });
});


module.exports = router;
