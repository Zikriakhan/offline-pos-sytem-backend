const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function run() {
  try {
    console.log('🔐 Logging in as admin@example.com ...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.token;
    console.log('✅ Admin login successful');

    console.log('📊 Fetching all users data (admin-only)...');
    const res = await axios.get(`${BASE_URL}/showalldata/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Received data summary:');
    console.log({
      totalUsers: res.data.totalUsers,
      systemSummary: res.data.systemSummary
    });
  } catch (err) {
    console.error('❌ Failed:', err.response?.data || err.message);
  }
}

run();