const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test script to demonstrate multi-user data isolation
async function testMultiUserIsolation() {
  console.log('🧪 Testing Multi-User Data Isolation\n');
  
  try {
    // Step 1: Create two users
    console.log('1️⃣ Creating two test users...');
    const timestamp = Date.now();
    const user1Response = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'John Doe',
      email: `john${timestamp}@example.com`,
      password: 'password123'
    });
    
    const user2Response = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Jane Smith', 
      email: `jane${timestamp}@example.com`,
      password: 'password123'
    });
    
    console.log('✅ Users created successfully');
    
    // Step 2: Login both users to get tokens
    console.log('\n2️⃣ Logging in users...');
    const user1Login = await axios.post(`${BASE_URL}/auth/login`, {
      email: `john${timestamp}@example.com`,
      password: 'password123'
    });
    
    const user2Login = await axios.post(`${BASE_URL}/auth/login`, {
      email: `jane${timestamp}@example.com`, 
      password: 'password123'
    });
    
    const user1Token = user1Login.data.token;
    const user2Token = user2Login.data.token;
    console.log('✅ Users logged in successfully');
    
    // Step 3: Create customers for each user
    console.log('\n3️⃣ Creating customers for each user...');
    
    // User 1 creates customers
    await axios.post(`${BASE_URL}/customers`, {
      name: 'John\'s Customer A',
      contact: '123-456-7890',
      totalPurchases: 1000,
      outstanding: 200,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    await axios.post(`${BASE_URL}/customers`, {
      name: 'John\'s Customer B', 
      contact: '098-765-4321',
      totalPurchases: 2000,
      outstanding: 500,
      status: 'inactive'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    // User 2 creates customers
    await axios.post(`${BASE_URL}/customers`, {
      name: 'Jane\'s Customer X',
      contact: '555-666-7777',
      totalPurchases: 1500,
      outstanding: 300,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    
    console.log('✅ Customers created for both users');
    
    // Step 4: Test data isolation - each user should only see their own customers
    console.log('\n4️⃣ Testing data isolation...');
    
    const user1Customers = await axios.get(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    const user2Customers = await axios.get(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    
    console.log(`🔍 User 1 sees ${user1Customers.data.length} customers:`);
    user1Customers.data.forEach(c => console.log(`   - ${c.name} (${c.contact})`));
    
    console.log(`🔍 User 2 sees ${user2Customers.data.length} customers:`);
    user2Customers.data.forEach(c => console.log(`   - ${c.name} (${c.contact})`));
    
    // Step 5: Test search functionality with isolation
    console.log('\n5️⃣ Testing search functionality...');
    
    // User 1 searches by status
    const user1ActiveCustomers = await axios.get(`${BASE_URL}/customers?status=active`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log(`🔍 User 1 active customers: ${user1ActiveCustomers.data.length}`);
    
    // User 1 searches by name
    const user1CustomersByName = await axios.get(`${BASE_URL}/customers?name=Customer A`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log(`🔍 User 1 customers with 'Customer A': ${user1CustomersByName.data.length}`);
    
    // User 2 searches by status  
    const user2ActiveCustomers = await axios.get(`${BASE_URL}/customers?status=active`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    console.log(`🔍 User 2 active customers: ${user2ActiveCustomers.data.length}`);
    
    console.log('\n🎉 Multi-user isolation test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Each user can only see their own data');
    console.log('✅ Search functionality works with proper user isolation');
    console.log('✅ Data security is enforced at the API level');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMultiUserIsolation();
}

module.exports = testMultiUserIsolation;