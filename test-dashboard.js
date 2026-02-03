const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testDashboard() {
  console.log('📊 Testing Enhanced Dashboard API\n');
  
  try {
    // Create a test user
    console.log('1️⃣ Creating test user...');
    const timestamp = Date.now();
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Dashboard Test User',
      email: `dashtest${timestamp}@example.com`,
      password: 'password123'
    });
    
    const userToken = signupRes.data.token;
    console.log('✅ User created');
    
    // Add sample customers
    console.log('\n2️⃣ Adding sample customers...');
    await axios.post(`${BASE_URL}/customers`, {
      name: 'Customer 1',
      contact: '123-456-7890',
      totalPurchases: 5000,
      outstanding: 1000,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    await axios.post(`${BASE_URL}/customers`, {
      name: 'Customer 2',
      contact: '098-765-4321',
      totalPurchases: 3000,
      outstanding: 500,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Customers added');
    
    // Add expenses
    console.log('\n3️⃣ Adding expenses...');
    await axios.post(`${BASE_URL}/expenses`, {
      title: 'Office Supplies',
      category: 'Supplies',
      date: new Date().toISOString(),
      amount: 500,
      paymentMethod: 'credit',
      type: 'one-time'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    await axios.post(`${BASE_URL}/expenses`, {
      title: 'Monthly Rent',
      category: 'Rent',
      date: new Date().toISOString(),
      amount: 1500,
      paymentMethod: 'bank',
      type: 'recurring'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Expenses added');
    
    // Get dashboard
    console.log('\n4️⃣ Fetching dashboard metrics...');
    const dashboardRes = await axios.get(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Dashboard data retrieved\n');
    
    console.log('📊 DASHBOARD METRICS:');
    console.log('==========================================');
    console.log(`💰 Total Revenue (sum of customer purchases): $${dashboardRes.data.totalRevenue}`);
    console.log(`📌 Pending Payments (sum of outstanding): $${dashboardRes.data.pendingPayments}`);
    console.log(`📊 Total Customers: ${dashboardRes.data.totalCustomers}`);
    console.log(`📈 Net Profit (revenue - expenses): $${dashboardRes.data.netProfit}`);
    
    console.log('\n📋 DETAILED METRICS:');
    console.log('==========================================');
    
    const details = dashboardRes.data.details;
    
    console.log('\n🏪 Customer Metrics:');
    console.log(`   Total Customers: ${details.customerMetrics.totalCustomers}`);
    console.log(`   Total Purchases: $${details.customerMetrics.totalCustomerPurchases}`);
    console.log(`   Outstanding Payments: $${details.customerMetrics.totalOutstandingPayments}`);
    
    console.log('\n📦 Sales Metrics:');
    console.log(`   Total Sales Invoice Amount: $${details.salesMetrics.totalSalesInvoiceAmount}`);
    console.log(`   Total Sales Received: $${details.salesMetrics.totalSalesReceived}`);
    console.log(`   Total Sales Balance: $${details.salesMetrics.totalSalesBalance}`);
    
    console.log('\n💸 Expense Metrics:');
    console.log(`   Total Expenses: $${details.expenseMetrics.totalExpenses}`);
    
    console.log('\n📈 Profit Metrics:');
    console.log(`   Gross Profit: $${details.profitMetrics.grossProfit}`);
    console.log(`   Net Profit: $${details.profitMetrics.netProfit}`);
    console.log(`   Profit Margin: ${details.profitMetrics.profitMargin}`);
    
    console.log('\n🎉 Dashboard API test completed successfully!');
    console.log('\n✨ New Pro-Level Features:');
    console.log('==========================================');
    console.log('✅ Total Revenue = Sum of all customer purchases');
    console.log('✅ Pending Payments = Sum of all customer outstanding amounts');
    console.log('✅ Net Profit = Total Revenue - Total Expenses');
    console.log('✅ Detailed breakdown by category (Sales, Customers, Expenses, Profit)');
    console.log('✅ Profit Margin percentage calculation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDashboard();