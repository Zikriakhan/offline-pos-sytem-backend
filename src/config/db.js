const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb+srv://muhammadjanzikria_db_user:NBrPykOstBhROzbx@cluster0.n9nremq.mongodb.net/digi-khata-appliction';
  await mongoose.connect(uri, {
    // options are handled by Mongoose defaults in modern versions
  });
  console.log('MongoDB connected');
};

module.exports = connectDB;
