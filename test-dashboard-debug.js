const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testDashboardDebug() {
  console.log('🔍 Debugging Dashboard Calculations\n');
  
  try {
    // Create a test user
    console.log('1️⃣ Creating test user...');
    const timestamp = Date.now();
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Dashboard Debug User',
      email: `dashdbg${timestamp}@example.com`,
      password: 'password123'
    });
    
    const userToken = signupRes.data.token;
    console.log('✅ User created');
    
    // Add customers with proper data
    console.log('\n2️⃣ Adding customer with totalPurchases and outstanding...');
    const c1 = await axios.post(`${BASE_URL}/customers`, {
      name: 'Test Customer ABC',
      contact: '111-222-3333',
      totalPurchases: 10000,
      outstanding: 2500,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ Customer 1 created:', c1.data);
    
    const c2 = await axios.post(`${BASE_URL}/customers`, {
      name: 'Test Customer XYZ',
      contact: '444-555-6666',
      totalPurchases: 7500,
      outstanding: 1500,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ Customer 2 created:', c2.data);
    
    // Verify customers are saved
    console.log('\n3️⃣ Fetching all customers to verify...');
    const customersRes = await axios.get(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ Customers fetched:', customersRes.data);
    
    // Add an expense
    console.log('\n4️⃣ Adding expense...');
    await axios.post(`${BASE_URL}/expenses`, {
      title: 'Test Expense',
      category: 'Testing',
      date: new Date().toISOString(),
      amount: 2000,
      paymentMethod: 'bank',
      type: 'one-time'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ Expense added');
    
    // Get dashboard
    console.log('\n5️⃣ Getting dashboard...');
    const dashRes = await axios.get(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('\n📊 RESULTS:');
    console.log('==========================================');
    console.log('Total Revenue:', dashRes.data.totalRevenue, '(Should be 17500)');
    console.log('Pending Payments:', dashRes.data.pendingPayments, '(Should be 4000)');
    console.log('Total Expenses:', dashRes.data.details.expenseMetrics.totalExpenses, '(Should be 2000)');
    console.log('Net Profit:', dashRes.data.netProfit, '(Should be 15500)');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDashboardDebug();