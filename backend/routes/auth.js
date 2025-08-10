const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid'); 
    res.json({ message: 'Logged out successfully!' });
  });
});


router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (result.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = user.id; 
    res.json({ message: 'Login successful!', user: { id: user.id, email: user.email, nickname: user.nickname, role: user.role } });
  });
});

router.post('/register', async (req, res) => {
  const { email, nickname, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (email, nickname, password, role) VALUES (?, ?, ?, ?)',
      [email, nickname, hashedPassword, 'student'],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists!' });
          return res.status(500).json({ message: 'Registration error' });
        }

        db.query('SELECT * FROM users WHERE email = ?', [email], (err2, rows) => {
          if (err2) return res.status(500).json({ message: 'Error retrieving user' });
          const userId = rows[0].id;

          db.query('INSERT IGNORE INTO students (userId) VALUES (?)', [userId], (err3) => {
            if (err3) console.error(err3);
            req.session.userId = userId; 
            res.json({ message: 'Registered and logged in!', user: rows[0] });
          });
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error hashing password' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    user: { id: req.session.userId, nickname: req.session.nickname }
  });
});


module.exports = router;
