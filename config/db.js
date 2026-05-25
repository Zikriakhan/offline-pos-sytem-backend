const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const rawUri = process.env.MONGO_URI || '';
  const uri = rawUri.trim();
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  const isServerless = process.env.VERCEL === '1';
  const maxRetries = Number.parseInt(
    process.env.MONGO_CONNECT_RETRIES || (isServerless ? '1' : '5'),
    10
  );
  const baseDelayMs = Number.parseInt(
    process.env.MONGO_CONNECT_DELAY_MS || (isServerless ? '250' : '2000'),
    10
  );
  const serverSelectionTimeoutMS = Number.parseInt(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || (isServerless ? '5000' : '10000'),
    10
  );

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS,
        connectTimeoutMS: serverSelectionTimeoutMS,
        socketTimeoutMS: serverSelectionTimeoutMS * 2,
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
