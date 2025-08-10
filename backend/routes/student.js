const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalcCommuteForUser } = require('../services/commute');
const { recalcTotalsForUser } = require('../services/totals');

const safeParse = (value) => {
  try { return JSON.parse(value); } catch { return {}; }
};

const addDecimalInsert = (fields, placeholders, values, col, val) => {
  if (val === undefined) return;
  fields.push(col);
  placeholders.push('NULLIF(?, "")');
  values.push(String(val));
};
const addDecimalUpdate = (updates, values, col, val) => {
  if (val === undefined) return;
  updates.push(`${col} = NULLIF(?, "")`);
  values.push(String(val));
};

router.get('/me', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not logged in' });

  const sql = `
    SELECT s.*, u.nickname
    FROM students s
    JOIN users u ON s.userId = u.id
    WHERE s.userId = ?
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error('GET /student/me error:', err);
      return res.status(500).json({ message: 'Failed to load profile' });
    }
    if (rows.length === 0) {
      return res.status(200).json({
        userId,
        nickname: req.session?.nickname || 'User',
        budget: null,
        apartmentLocation: null,
        apartmentPrice: null,
        apartmentExpenses: null,
        universityFrequency: '[]',
        habitsFrequency: '[]',
        foodPreferenceBreakfast: '[]',
        foodPreferenceLunch: '[]',
        foodPreferenceDinner: '[]',
        savedPlaces: '[]',
        totalSpending: null,
        includeCommutePublic: 1
      });
    }
    return res.json(rows[0]);
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
    foodFrequency,
    includeCommutePublic
  } = req.body;

  db.query('SELECT * FROM students WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      console.error('SELECT student error:', err);
      return res.status(500).json({ message: 'Error checking profile' });
    }

    const finish = async (message) => {
      try { await recalcCommuteForUser(userId); } catch (e) { console.warn('recalcCommuteForUser failed (continuing):', e.message); }
      try { await recalcTotalsForUser(userId); } catch (e) { console.warn('recalcTotalsForUser failed (continuing):', e.message); }
      return res.json({ message });
    };

    if (rows.length === 0) {
      const fields = ['userId'];
      const values = [userId];
      const placeholders = ['?'];

      addDecimalInsert(fields, placeholders, values, 'budget',            budget);
      if (apartmentLocation !== undefined) { fields.push('apartmentLocation'); placeholders.push('?'); values.push(apartmentLocation); }
      addDecimalInsert(fields, placeholders, values, 'apartmentPrice',    apartmentPrice);
      addDecimalInsert(fields, placeholders, values, 'apartmentExpenses', apartmentExpenses);

      if (foodPreferenceBreakfast !== undefined) { fields.push('foodPreferenceBreakfast'); placeholders.push('?'); values.push(JSON.stringify(safeParse(foodPreferenceBreakfast))); }
      if (foodPreferenceLunch     !== undefined) { fields.push('foodPreferenceLunch');     placeholders.push('?'); values.push(JSON.stringify(safeParse(foodPreferenceLunch))); }
      if (foodPreferenceDinner    !== undefined) { fields.push('foodPreferenceDinner');    placeholders.push('?'); values.push(JSON.stringify(safeParse(foodPreferenceDinner))); }
      if (habits                  !== undefined) { fields.push('habits');                  placeholders.push('?'); values.push(JSON.stringify(safeParse(habits))); }
      if (universityFrequency     !== undefined) { fields.push('universityFrequency');     placeholders.push('?'); values.push(JSON.stringify(safeParse(universityFrequency))); }
      if (habitsFrequency         !== undefined) { fields.push('habitsFrequency');         placeholders.push('?'); values.push(JSON.stringify(safeParse(habitsFrequency))); }
      if (foodFrequency           !== undefined) { fields.push('foodFrequency');           placeholders.push('?'); values.push(JSON.stringify(safeParse(foodFrequency))); }
      if (typeof includeCommutePublic === 'boolean') { fields.push('includeCommutePublic'); placeholders.push('?'); values.push(includeCommutePublic ? 1 : 0); }

      const sql = `INSERT INTO students (${fields.join(',')}) VALUES (${placeholders.join(',')})`;
      db.query(sql, values, (err2) => {
        if (err2) {
          console.error('INSERT student error:', err2);
          return res.status(500).json({ message: 'Error inserting preferences' });
        }
        return finish('Preferences created!');
      });

    } else {
      const updates = [];
      const values = [];

      addDecimalUpdate(updates, values, 'budget',            budget);
      if (apartmentLocation !== undefined) { updates.push('apartmentLocation = ?'); values.push(apartmentLocation); }
      addDecimalUpdate(updates, values, 'apartmentPrice',    apartmentPrice);
      addDecimalUpdate(updates, values, 'apartmentExpenses', apartmentExpenses);

      if (foodPreferenceBreakfast !== undefined) { updates.push('foodPreferenceBreakfast = ?'); values.push(JSON.stringify(safeParse(foodPreferenceBreakfast))); }
      if (foodPreferenceLunch     !== undefined) { updates.push('foodPreferenceLunch = ?');     values.push(JSON.stringify(safeParse(foodPreferenceLunch))); }
      if (foodPreferenceDinner    !== undefined) { updates.push('foodPreferenceDinner = ?');    values.push(JSON.stringify(safeParse(foodPreferenceDinner))); }
      if (habits                  !== undefined) { updates.push('habits = ?');                  values.push(JSON.stringify(safeParse(habits))); }
      if (universityFrequency     !== undefined) { updates.push('universityFrequency = ?');     values.push(JSON.stringify(safeParse(universityFrequency))); }
      if (habitsFrequency         !== undefined) { updates.push('habitsFrequency = ?');         values.push(JSON.stringify(safeParse(habitsFrequency))); }
      if (foodFrequency           !== undefined) { updates.push('foodFrequency = ?');           values.push(JSON.stringify(safeParse(foodFrequency))); }
      if (typeof includeCommutePublic === 'boolean') { updates.push('includeCommutePublic = ?'); values.push(includeCommutePublic ? 1 : 0); }

      if (updates.length === 0) return res.json({ message: 'No changes provided.' });

      const sql = `UPDATE students SET ${updates.join(', ')} WHERE userId = ?`;
      values.push(userId);

      db.query(sql, values, (err3) => {
        if (err3) {
          console.error('UPDATE student error:', err3);
          return res.status(500).json({ message: 'Error updating preferences' });
        }
        return finish('Preferences updated!');
      });
    }
  });
});

module.exports = router;
