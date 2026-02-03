const axios = require('axios');
const BASE_URL = 'http://localhost:4000/api';

async function quickTest() {
  try {
    const ts = Date.now();
    
    // Signup
    const signup = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Dashboard User',
      email: `dashuser${ts}@test.com`,
      password: 'pass123'
    });
    const token = signup.data.token;
    console.log('✅ User created');
    
    // Add customer
    await axios.post(`${BASE_URL}/customers`, {
      name: 'Customer 1',
      contact: '111-222-3333',
      totalPurchases: 10000,
      outstanding: 2500,
      status: 'active'
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Customer added');
    
    // Add expense
    await axios.post(`${BASE_URL}/expenses`, {
      title: 'Expense 1',
      category: 'Test',
      amount: 1000,
      paymentMethod: 'bank',
      type: 'one-time'
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ Expense added');
    
    // Get dashboard
    const dash = await axios.get(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n📊 DASHBOARD RESULTS:');
    console.log(`Total Revenue (should be 10000): ${dash.data.totalRevenue}`);
    console.log(`Pending Payments (should be 2500): ${dash.data.pendingPayments}`);
    console.log(`Net Profit (should be 9000): ${dash.data.netProfit}`);
    console.log(`Total Customers: ${dash.data.totalCustomers}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

quickTest();