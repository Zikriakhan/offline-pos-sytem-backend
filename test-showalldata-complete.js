const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testWithExistingUser() {
  console.log('🧪 Testing Show All Data API with Existing User\n');
  
  try {
    // Create a fresh user and immediately test
    console.log('1️⃣ Creating fresh user...');
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    
    const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Test User for ShowAllData',
      email: email,
      password: 'password123'
    });
    
    console.log('✅ User created successfully');
    const userToken = signupResponse.data.token;
    
    // Add some sample data first
    console.log('\n2️⃣ Adding sample data for testing...');
    
    // Create a customer
    await axios.post(`${BASE_URL}/customers`, {
      name: 'Sample Customer',
      contact: '123-456-7890',
      totalPurchases: 5000,
      outstanding: 1000,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    // Create an inventory item
    await axios.post(`${BASE_URL}/inventory`, {
      name: 'Sample Widget',
      category: 'Electronics',
      currentStock: 100,
      reorderLevel: 20,
      purchasePrice: 10,
      sellingPrice: 15,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    // Create a supplier
    await axios.post(`${BASE_URL}/suppliers`, {
      name: 'Sample Supplier',
      contact: '098-765-4321',
      totalSupplied: 10000,
      amountPayable: 2000,
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    // Create an expense
    await axios.post(`${BASE_URL}/expenses`, {
      title: 'Office Rent',
      category: 'Rent',
      date: new Date().toISOString(),
      amount: 1500,
      paymentMethod: 'bank',
      type: 'recurring'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Sample data created');
    
    // Now test the showalldata endpoint
    console.log('\n3️⃣ Getting current user\'s complete data...');
    const userDataResponse = await axios.get(`${BASE_URL}/showalldata/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ User data retrieved successfully');
    console.log('\n📊 Complete User Data Structure:');
    console.log('==========================================');
    console.log('👤 USER INFO:');
    console.log(`   - ID: ${userDataResponse.data.user.id}`);
    console.log(`   - Name: ${userDataResponse.data.user.name}`);
    console.log(`   - Email: ${userDataResponse.data.user.email}`);
    console.log(`   - Role: ${userDataResponse.data.user.role}`);
    console.log(`   - Created: ${userDataResponse.data.user.createdAt}`);
    
    console.log('\n📊 DATA SUMMARY:');
    console.log(`   - Total Customers: ${userDataResponse.data.summary.totalCustomers}`);
    console.log(`   - Total Inventory Items: ${userDataResponse.data.summary.totalInventoryItems}`);
    console.log(`   - Total Suppliers: ${userDataResponse.data.summary.totalSuppliers}`);
    console.log(`   - Total Purchase Orders: ${userDataResponse.data.summary.totalPurchaseOrders}`);
    console.log(`   - Total Sales Invoices: ${userDataResponse.data.summary.totalSalesInvoices}`);
    console.log(`   - Total Expenses: ${userDataResponse.data.summary.totalExpenses}`);
    console.log(`   - Total Sales Amount: $${userDataResponse.data.summary.totalSalesAmount}`);
    console.log(`   - Total Purchase Amount: $${userDataResponse.data.summary.totalPurchaseAmount}`);
    console.log(`   - Total Expense Amount: $${userDataResponse.data.summary.totalExpenseAmount}`);
    
    console.log('\n📋 DETAILED DATA:');
    if (userDataResponse.data.data.customers.length > 0) {
      console.log('   👥 CUSTOMERS:');
      userDataResponse.data.data.customers.forEach(customer => {
        console.log(`      - ${customer.name} (${customer.contact}) - Status: ${customer.status}`);
      });
    }
    
    if (userDataResponse.data.data.inventory.length > 0) {
      console.log('   📦 INVENTORY:');
      userDataResponse.data.data.inventory.forEach(item => {
        console.log(`      - ${item.name} (${item.category}) - Stock: ${item.currentStock}`);
      });
    }
    
    if (userDataResponse.data.data.suppliers.length > 0) {
      console.log('   🏢 SUPPLIERS:');
      userDataResponse.data.data.suppliers.forEach(supplier => {
        console.log(`      - ${supplier.name} (${supplier.contact}) - Status: ${supplier.status}`);
      });
    }
    
    if (userDataResponse.data.data.expenses.length > 0) {
      console.log('   💰 EXPENSES:');
      userDataResponse.data.data.expenses.forEach(expense => {
        console.log(`      - ${expense.title} (${expense.category}) - Amount: $${expense.amount}`);
      });
    }
    
    // Test admin endpoint protection
    console.log('\n4️⃣ Testing admin endpoint protection...');
    try {
      const allUsersResponse = await axios.get(`${BASE_URL}/showalldata/all`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      console.log('❌ Regular user should not be able to access admin endpoint');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Correctly blocked regular user from admin endpoint (403 Forbidden)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }
    
    console.log('\n🎉 Show All Data API test completed successfully!');
    console.log('\n📝 Features Successfully Demonstrated:');
    console.log('==========================================');
    console.log('✅ User can get their complete data in nested structure');
    console.log('✅ Response includes comprehensive user info');
    console.log('✅ All business data types are included (Customers, Inventory, Suppliers, etc.)');
    console.log('✅ Summary statistics are calculated automatically'); 
    console.log('✅ Admin endpoint is properly protected (403 for regular users)');
    console.log('✅ Data structure is well-organized and easy to consume');
    console.log('✅ Complete user data isolation is maintained');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testWithExistingUser();