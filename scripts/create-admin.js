require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Role = require('../models/Role');

const AVAILABLE_PERMISSIONS = [
  'Dashboard','POS','Catalog','Configurations','Customers','Suppliers','Purchase History',
  'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
  'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','User Management'
];

async function main() {
  const [,, emailArg, passwordArg, nameArg] = process.argv;
  const email = (emailArg || 'superadmin@example.com').trim().toLowerCase();
  const password = passwordArg || 'SuperAdmin@123';
  const name = nameArg || 'Super Admin';

  if (!process.env.MONGO_URI) {
    console.log('Warning: MONGO_URI not set  in .env. Using default mongodb://localhost:27017/digikhata');
  }

  await connectDB();

  const hashed = await bcrypt.hash(password, 10);

  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.password = hashed;
    user.role = 'superadmin';
    user.status = 'active';
    await user.save();
    console.log(`Updated existing user to superadmin: ${email}`);
  } else {
    user = await User.create({ name, email, password: hashed, role: 'superadmin', status: 'active' });
    console.log(`Created superadmin user: ${email}`);
  }

  // Create default roles if they don't exist
  const defaultRoles = [
    { role_name: 'superadmin', description: 'Super Administrator - Full system access', permissions: AVAILABLE_PERMISSIONS },
    { role_name: 'admin', description: 'Administrator - Full access to all business features', permissions: AVAILABLE_PERMISSIONS },
    { role_name: 'manager', description: 'Manager access', permissions: [] },
    { role_name: 'cashier', description: 'Cashier (POS & Sales)', permissions: [] },
    { role_name: 'sales_representative', description: 'Sales Representative', permissions: [] },
    { role_name: 'pos', description: 'POS operator', permissions: [] },
    { role_name: 'guest', description: 'Guest (view only)', permissions: [] },
    { role_name: 'inventory', description: 'Inventory staff', permissions: [] }
  ];

  for (const r of defaultRoles) {
    const existing = await Role.findOne({ role_name: r.role_name });
    if (existing) {
      existing.description = r.description;
      existing.permissions = r.permissions;
      await existing.save();
      console.log(`Updated role: ${r.role_name}`);
    } else {
      await Role.create(r);
      console.log(`Created role: ${r.role_name}`);
    }
  }

  // Create demo users for each role
  const demoUsers = [
    { email: 'admin@example.com', password: 'Admin@123', name: 'Demo Admin', role: 'admin' },
    { email: 'manager@example.com', password: 'Manager@123', name: 'Demo Manager', role: 'manager' },
    { email: 'cashier@example.com', password: 'Cashier@123', name: 'Demo Cashier', role: 'cashier' },
    { email: 'inventory@example.com', password: 'Inventory@123', name: 'Demo Inventory Staff', role: 'inventory' }
  ];

  for (const demoUser of demoUsers) {
    let existingUser = await User.findOne({ email: demoUser.email });
    const hashedPassword = await bcrypt.hash(demoUser.password, 10);

    if (existingUser) {
      existingUser.password = hashedPassword;
      existingUser.role = demoUser.role;
      existingUser.status = 'active';
      await existingUser.save();
      console.log(`Updated demo user: ${demoUser.email} (${demoUser.role})`);
    } else {
      await User.create({
        name: demoUser.name,
        email: demoUser.email,
        password: hashedPassword,
        role: demoUser.role,
        status: 'active'
      });
      console.log(`Created demo user: ${demoUser.email} (${demoUser.role})`);
    }
  }

  console.log('Admin bootstrap complete. You can now login and access /api/showalldata/all');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });