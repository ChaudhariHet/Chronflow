const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateStopwatchTime,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes - "protect" runs first and blocks the request
// before it ever reaches the controller if the token is missing/invalid.
router.get('/profile', protect, getProfile);
router.patch('/stopwatch-time', protect, updateStopwatchTime);

module.exports = router;
