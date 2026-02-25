const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  const maxRetries = Number.parseInt(process.env.MONGO_CONNECT_RETRIES || '5', 10);
  const baseDelayMs = Number.parseInt(process.env.MONGO_CONNECT_DELAY_MS || '2000', 10);

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });

      console.log('MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      const code = err && err.code ? ` code=${err.code}` : '';
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed${code}.`);

      if (attempt < maxRetries) {
        await sleep(baseDelayMs * attempt);
      }
    }
  }

  const error = new Error(
    'Failed to connect to MongoDB after retries. Check DNS/SRV resolution, Atlas IP allowlist, and credentials.'
  );
  error.cause = lastError;
  throw error;
};

module.exports = connectDB;
