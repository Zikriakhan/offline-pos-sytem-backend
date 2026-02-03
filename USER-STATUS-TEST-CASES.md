# User Active/Inactive - Postman Test Cases

## Test Case 1: Signup New User (Auto Active)

**Method:** POST  
**URL:** `http://localhost:5000/auth/signup`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "pass123"
}
```

**Expected Response (201):**
```json
{
  "message": "Signup successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "active"
  }
}
```

✅ New users are automatically **active**

---

## Test Case 2: Login Active User (Success)

**Method:** POST  
**URL:** `http://localhost:5000/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "pass123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "active"
  }
}
```

✅ Active users can login successfully

---

## Test Case 3: Admin Deactivate User

**Method:** POST  
**URL:** `http://localhost:5000/auth/users/USER_ID/deactivate`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Body:** (empty)

**Expected Response (200):**
```json
{
  "message": "User account deactivated successfully",
  "user": {
    "_id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "inactive",
    "createdAt": "2024-01-31T...",
    "updatedAt": "2024-01-31T..."
  }
}
```

✅ Admin successfully deactivated user

---

## Test Case 4: Login Inactive User (Blocked)

**Method:** POST  
**URL:** `http://localhost:5000/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "pass123"
}
```

**Expected Response (403):**
```json
{
  "message": "Your account is inactive. Please contact the administrator to reactivate your account.",
  "status": "inactive"
}
```

❌ Inactive users CANNOT login

---

## Test Case 5: Admin Activate User

**Method:** POST  
**URL:** `http://localhost:5000/auth/users/USER_ID/activate`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Body:** (empty)

**Expected Response (200):**
```json
{
  "message": "User account activated successfully",
  "user": {
    "_id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "2024-01-31T...",
    "updatedAt": "2024-01-31T..."
  }
}
```

✅ Admin successfully reactivated user

---

## Test Case 6: Login Reactivated User (Success)

**Method:** POST  
**URL:** `http://localhost:5000/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "pass123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "active"
  }
}
```

✅ Reactivated user can now login again

---

## Test Case 7: Toggle User Status

**Method:** POST  
**URL:** `http://localhost:5000/auth/users/USER_ID/toggle-status`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Body:** (empty)

**Expected Response (200):**
First call (active → inactive):
```json
{
  "message": "User account inactive successfully",
  "user": {
    "_id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "inactive"
  }
}
```

Second call (inactive → active):
```json
{
  "message": "User account active successfully",
  "user": {
    "_id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user",
    "status": "active"
  }
}
```

✅ Status toggles between active and inactive

---

## Test Case 8: Admin List Users (Include Status)

**Method:** GET  
**URL:** `http://localhost:5000/auth/users`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Expected Response (200):**
```json
[
  {
    "_id": "user_id_1",
    "name": "Test User",
    "email": "test@example.com",
    "status": "active",
    "createdAt": "2024-01-31T...",
    "updatedAt": "2024-01-31T..."
  },
  {
    "_id": "user_id_2",
    "name": "Another User",
    "email": "another@example.com",
    "status": "inactive",
    "createdAt": "2024-01-31T...",
    "updatedAt": "2024-01-31T..."
  }
]
```

✅ Admin can see all users with their status

---

## Summary Table

| Test # | Action | Expected Result |
|--------|--------|-----------------|
| 1 | Signup user | User created with status "active" ✅ |
| 2 | Login active user | Login successful ✅ |
| 3 | Admin deactivate | User status changed to "inactive" ✅ |
| 4 | Login inactive user | Login blocked (403) ❌ |
| 5 | Admin activate | User status changed to "active" ✅ |
| 6 | Login reactivated user | Login successful ✅ |
| 7 | Toggle status | Status switches between active/inactive ✅ |
| 8 | Admin list users | All users shown with status ✅ |

---

## Error Scenarios to Test

### Inactive User Login
```
Email: inactive@example.com
Status: inactive
Action: Login
Result: 403 Forbidden - "Your account is inactive"
```

### Invalid Status (Direct DB Update - Should Fail)
```
Attempt to set status to: "blocked" (invalid)
Result: Validation error - only "active" or "inactive" allowed
```

### Non-Admin Tries to Deactivate User
```
User: regular@example.com (role: "user")
Endpoint: POST /auth/users/ID/deactivate
Result: 403 Forbidden - "Requires admin role"
```

