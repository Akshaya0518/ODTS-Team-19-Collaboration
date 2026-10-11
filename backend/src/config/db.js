const mongoose = require('mongoose');

/**
 * Connects to MongoDB (Atlas or local).
 * Prints a friendly hint when the connection fails, because the error
 * messages from Atlas can be hard to understand the first time.
 */
async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('\nCould not connect to MongoDB.');
    console.error(`Reason: ${err.message}\n`);
    console.error('Checklist:');
    console.error('  1. Is MONGODB_URI in backend/.env correct (username, password, cluster host)?');
    console.error('  2. Atlas -> Network Access: is your current IP address allowed?');
    console.error('  3. Atlas -> Database Access: does the database user exist with that password?');
    console.error('  4. Special characters in the password must be URL-encoded (@ -> %40).\n');
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
