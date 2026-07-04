const jwt = require('jsonwebtoken');

// Kept separate from the controller so token logic (expiry, secret, payload
// shape) lives in exactly one place. If we ever need to change how tokens
// are issued, this is the only file that changes.
const generateToken = (userId, rememberMe = false) => {
  // "Remember Me" bonus feature: extend expiry instead of the default short
  // session, rather than building a whole separate refresh-token system.
  const expiresIn = rememberMe ? '30d' : '1d';

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = { generateToken };
