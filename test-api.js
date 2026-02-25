const http = require('http');

// Test 1: Check if server is running
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Server is running!`);
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
    console.log('\n=== Testing Update Password Endpoint ===');
    testUpdatePasswordEndpoint();
  });
});

req.on('error', (e) => {
  console.error(`❌ Cannot reach server: ${e.message}`);
  process.exit(1);
});

req.end();

// Test 2: Test the update-password endpoint
function testUpdatePasswordEndpoint() {
  const testData = JSON.stringify({
    email: 'test@example.com',
    currentPassword: 'oldPassword123',
    newPassword: 'newPassword456'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/update-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Endpoint status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response: ${data}`);
      
      if (res.statusCode === 400 || res.statusCode === 200) {
        console.log('\n✅ API Endpoint is working!');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error testing endpoint: ${e.message}`);
  });

  req.write(testData);
  req.end();
}
