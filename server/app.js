const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { protectPage } = require('./middleware/authMiddleware');

connectDB();

const app = express();

// --- Core middleware ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5000',
    credentials: true, // required so the browser sends/receives the httpOnly cookie
  })
);

// --- Serve the static client ---
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// --- API routes ---
app.use('/api/auth', authRoutes);

// --- Server-side route guard for the dashboard/profile pages ---
// This is a second layer of protection on top of the client-side JS check:
// even if someone disables JavaScript or hits the URL directly with a stale
// cookie, the server verifies the token before ever sending the HTML file.
app.get('/dashboard', protectPage, (req, res) => {
  res.sendFile(path.join(clientPath, 'dashboard.html'));
});

app.get('/profile', protectPage, (req, res) => {
  res.sendFile(path.join(clientPath, 'profile.html'));
});

// --- Centralized error handler ---
// Catches anything unexpected that falls through controllers without being
// handled locally, so the client never sees a raw stack trace.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
