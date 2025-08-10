const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'yourSuperSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/university', require('./routes/university'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/food', require('./routes/food'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/geocode', require('./routes/geocode'));
app.use('/api/student/places', require('./routes/studentPlaces'));
app.use('/api/dorms', require('./routes/dorms'));
app.use('/api/commute', require('./routes/commute'));
app.use('/api/tips', require('./routes/tips'));


app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
