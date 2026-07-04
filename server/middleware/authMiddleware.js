const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This middleware is the gatekeeper for every protected endpoint
// (/api/auth/profile, dashboard-related routes, etc). It reads the JWT from
// the httpOnly cookie, verifies it, and attaches the user to req.user so
// downstream controllers never have to worry about auth again.
const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch the user rather than trusting the token payload blindly -
    // guards against a user being deleted after the token was issued.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers both expired and malformed tokens with one friendly message -
    // we don't want to leak whether the failure was expiry vs tampering.
    return res.status(401).json({ message: 'Session expired, please log in again.' });
  }
};

// Used only for guarding server-rendered HTML page routes (e.g. /dashboard).
// Unlike "protect", this redirects to the login page instead of returning
// JSON, since a browser navigating directly to a URL expects a page back.
const protectPage = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login.html');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.redirect('/login.html');

    req.user = user;
    next();
  } catch (error) {
    return res.redirect('/login.html');
  }
};

module.exports = { protect, protectPage };
