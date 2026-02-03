const app = require('../src/app');
const connectDB = require('../src/config/db');

let isConnected = false;
let connectingPromise = null;

async function ensureDbConnection() {
  if (isConnected) return;
  if (!connectingPromise) {
    connectingPromise = connectDB()
      .then(() => {
        isConnected = true;
      })
      .catch((err) => {
        isConnected = false;
        connectingPromise = null;
        throw err;
      });
  }
  await connectingPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDbConnection();
    return app(req, res);
  } catch (err) {
    console.error('Vercel API error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
