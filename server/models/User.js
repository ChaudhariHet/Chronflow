const mongoose = require('mongoose');

// The schema mirrors exactly what the spec's Users collection needs:
// fullName, email, hashed password, createdAt (auto), plus two bonus-feature
// fields (lastLogin, totalStopwatchTime) that live naturally on the user
// document rather than in a separate collection.
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return the password hash by default on queries
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    totalStopwatchTime: {
      // stored in seconds - simplest unit to accumulate and later format
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

module.exports = mongoose.model('User', userSchema);
