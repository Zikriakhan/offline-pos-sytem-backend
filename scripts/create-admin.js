require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
  const [,, emailArg, passwordArg, nameArg] = process.argv;
  const email = emailArg || 'admin@example.com';
  const password = passwordArg || 'Admin@123';
  const name = nameArg || 'System Admin';

  if (!process.env.MONGO_URI) {
    console.log('Warning: MONGO_URI not set in .env. Using default mongodb://localhost:27017/digikhata');
  }

  await connectDB();

  const hashed = await bcrypt.hash(password, 10);

  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.password = hashed;
    user.role = 'admin';
    await user.save();
    console.log(`Updated existing user to admin: ${email}`);
  } else {
    user = await User.create({ name, email, password: hashed, role: 'admin' });
    console.log(`Created admin user: ${email}`);
  }

  console.log('Admin bootstrap complete. You can now login and access /api/showalldata/all');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });