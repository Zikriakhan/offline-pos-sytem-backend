const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digi-khata';
  await mongoose.connect(uri, {
    // options are handled by Mongoose defaults in modern versions
  });
  console.log('MongoDB connected');
};

module.exports = connectDB;
