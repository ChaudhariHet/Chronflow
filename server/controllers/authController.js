const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

const SALT_ROUNDS = 12;

// Cookie options are centralized here so login/logout/register stay in sync -
// if one sets httpOnly + sameSite and the other forgets, that's a real bug.
const cookieOptions = (rememberMe = false) => ({
  httpOnly: true, // JS on the client can never read this - mitigates XSS token theft
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    // Strong password check: at least one letter and one number.
    // Kept intentionally simple and explainable rather than an opaque regex
    // library, per the "understand what you're building" goal of the project.
    const strongPasswordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!strongPasswordPattern.test(password)) {
      return res
        .status(400)
        .json({ message: 'Password must contain at least one letter and one number.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions());

    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    // Never leak raw error/stack details to the client - log internally,
    // return a generic message externally.
    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // .select('+password') because the schema excludes it by default
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      // Deliberately identical message to the "no user found" case above -
      // revealing which one failed would let an attacker enumerate real emails.
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, !!rememberMe);
    res.cookie('token', token, cookieOptions(!!rememberMe));

    return res.status(200).json({
      message: 'Login successful.',
      user: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route POST /api/auth/logout
const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  // req.user was attached by the protect middleware - no DB call needed here
  const { _id, fullName, email, lastLogin, totalStopwatchTime, createdAt } = req.user;

  return res.status(200).json({
    user: { id: _id, fullName, email, lastLogin, totalStopwatchTime, createdAt },
  });
};

// @route PATCH /api/auth/stopwatch-time
// Bonus feature: persist accumulated stopwatch usage to the DB.
const updateStopwatchTime = async (req, res) => {
  try {
    const { elapsedSeconds } = req.body;

    if (typeof elapsedSeconds !== 'number' || elapsedSeconds < 0) {
      return res.status(400).json({ message: 'Invalid time value.' });
    }

    req.user.totalStopwatchTime += elapsedSeconds;
    await req.user.save();

    return res.status(200).json({ totalStopwatchTime: req.user.totalStopwatchTime });
  } catch (error) {
    console.error('Update stopwatch time error:', error.message);
    return res.status(500).json({ message: 'Could not save stopwatch time.' });
  }
};

// @route POST /api/auth/forgot-password
// Simplified flow: since there's no email service configured in this project,
// we generate a reset token and return it directly (in a real production app
// this would be emailed, not returned in the response).
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });

    if (!user) {
      // Same "don't reveal if the email exists" principle as login.
      return res.status(200).json({
        message: 'If an account exists with this email, a reset link has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    return res.status(200).json({
      message: 'Reset token generated. In production this would be emailed to you.',
      resetToken, // exposed here only because there is no mail service wired up
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Invalid request.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateStopwatchTime,
  forgotPassword,
  resetPassword,
};
