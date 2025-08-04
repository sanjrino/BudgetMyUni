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


const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const universityRoutes = require('./routes/university');
app.use('/api/university', universityRoutes);
const habitsRoutes = require('./routes/habits');
app.use('/api/habits', habitsRoutes);
const foodRoutes = require('./routes/food');
app.use('/api/food', foodRoutes);
