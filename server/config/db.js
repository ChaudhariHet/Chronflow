const mongoose = require('mongoose');

// Centralizing the connection logic here keeps app.js focused purely on
// wiring up middleware and routes, not on database concerns.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    // A dead DB connection means the app can't function at all,
    // so we exit rather than let the server run in a broken state.
    process.exit(1);
  }
};

module.exports = connectDB;
