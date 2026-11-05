const mongoose = require('mongoose');

let isConnected = false;
let connectionType = 'none';

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  MONGODB_URI is not set in .env. Atlas connection skipped.');
    console.warn('\x1b[36m%s\x1b[0m', '👉 To connect to MongoDB Atlas, add MONGODB_URI in your .env file:');
    console.warn('\x1b[90m%s\x1b[0m', '   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/jira-clone?retryWrites=true&w=majority\n');
    return { isConnected: false, type: 'disconnected' };
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    connectionType = 'atlas';
    console.log('\x1b[32m%s\x1b[0m', `✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    return { isConnected: true, type: 'atlas', host: conn.connection.host };
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', `❌ MongoDB Atlas Connection Error: ${err.message}`);
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  App will start with memory-fallback for quick preview until Atlas credentials are set.');
    return { isConnected: false, type: 'error', error: err.message };
  }
}

function getStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    type: mongoose.connection.readyState === 1 ? 'atlas' : 'memory'
  };
}

module.exports = { connectDB, getStatus };

