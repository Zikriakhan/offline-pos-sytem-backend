const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Simple test to check if signup works
async function testSignup() {
  console.log('Testing signup endpoint...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Test User',
      email: `test${Date.now()}@example.com`, // unique email
      password: 'password123'
    });
    
    console.log('✅ Signup successful');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Signup failed');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data || error.message);
    throw error;
  }
}

// Test login
async function testLogin(email, password) {
  console.log('\nTesting login endpoint...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('✅ Login successful');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Login failed');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data || error.message);
    throw error;
  }
}

// Main test function
async function testAuth() {
  try {
    // Test signup
    const signupData = await testSignup();
    
    // Extract email from signup for login test
    const email = signupData.user.email;
    
    // Test login with the same credentials
    await testLogin(email, 'password123');
    
    console.log('\n🎉 Authentication tests passed!');
  } catch (error) {
    console.error('\n💥 Authentication test failed');
  }
}

testAuth();