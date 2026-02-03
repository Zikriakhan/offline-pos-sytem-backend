# User Active/Inactive Functionality Implementation

## Overview
Implemented user account activation/deactivation functionality to the backend authentication system. Users can only login if their account status is set to "active".

---

## Changes Made

### 1. **User Model** ([User.js](./src/models/User.js))
Added `status` field to the user schema:

```javascript
status: { type: String, enum: ['active', 'inactive'], default: 'active' }
```

**Features:**
- ✅ Enum validation: only accepts 'active' or 'inactive'
- ✅ Default value: 'active' (new users are active by default)
- ✅ Persistent storage in MongoDB

---

### 2. **Authentication Controller** ([authController.js](./src/controllers/authController.js))

#### ✅ **Signup Function (Updated)**
- New users are created with `status: 'active'` by default
- Status is returned in the signup response

#### ✅ **Login Function (Updated)**
**Key Change:** Added active/inactive check BEFORE password validation

```javascript
// Check if user account is active
if (user.status === 'inactive') {
  return res.status(403).json({ 
    message: 'Your account is inactive. Please contact the administrator to reactivate your account.',
    status: 'inactive'
  });
}
```

**Login Flow:**
1. Check if user email exists
2. **[NEW] Check if user status is 'active'** ← Returns 403 error if inactive
3. Verify password
4. Generate JWT token
5. Return success with user data including status

#### ✅ **Update Function (Enhanced)**
- Now supports updating user `status` field
- Admin can change status along with other user properties

```javascript
if (status && ['active', 'inactive'].includes(status)) data.status = status;
```

#### ✅ **New: Deactivate User Function**
**Route:** `POST /auth/users/:id/deactivate` (Admin only)

Deactivates a user account:
```javascript
exports.deactivateUser = async (req, res, next) => {
  // Sets status to 'inactive'
  // User cannot login anymore
}
```

#### ✅ **New: Activate User Function**
**Route:** `POST /auth/users/:id/activate` (Admin only)

Activates a user account:
```javascript
exports.activateUser = async (req, res, next) => {
  // Sets status to 'active'
  // User can login again
}
```

#### ✅ **New: Toggle User Status Function**
**Route:** `POST /auth/users/:id/toggle-status` (Admin only)

Toggles between active and inactive:
```javascript
exports.toggleUserStatus = async (req, res, next) => {
  // Switches from 'active' to 'inactive' or vice versa
}
```

#### ✅ **Admin List Function (Updated)**
Now includes `status` field in admin user list

---

### 3. **Auth Routes** ([authRoutes.js](./src/routes/authRoutes.js))

Added three new admin-only endpoints:

```javascript
// User status management (admin only)
router.post('/users/:id/deactivate', requireRole('admin'), deactivateUser);
router.post('/users/:id/activate', requireRole('admin'), activateUser);
router.post('/users/:id/toggle-status', requireRole('admin'), toggleUserStatus);
```

---

## API Endpoints

### 📍 Login Endpoint (Updated)
**POST** `/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (Status: 200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "status": "active"
  }
}
```

**Inactive Account Response (Status: 403):**
```json
{
  "message": "Your account is inactive. Please contact the administrator to reactivate your account.",
  "status": "inactive"
}
```

---

### 📍 Deactivate User (Admin Only)
**POST** `/auth/users/:id/deactivate`

**Response (Status: 200):**
```json
{
  "message": "User account deactivated successfully",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "status": "inactive",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 📍 Activate User (Admin Only)
**POST** `/auth/users/:id/activate`

**Response (Status: 200):**
```json
{
  "message": "User account activated successfully",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 📍 Toggle User Status (Admin Only)
**POST** `/auth/users/:id/toggle-status`

**Response (Status: 200):**
```json
{
  "message": "User account inactive successfully",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "status": "inactive"
  }
}
```

---

## Testing Guide

### Test 1: Active User Can Login ✅
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "active@example.com", "password": "pass123"}'
# Should return: Login successful + token
```

### Test 2: Inactive User Cannot Login ❌
```bash
# First deactivate the user via admin endpoint
curl -X POST http://localhost:5000/auth/users/USER_ID/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Try to login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "inactive@example.com", "password": "pass123"}'
# Should return: Status 403 - Account is inactive
```

### Test 3: Admin Can Deactivate User ✅
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Should return: User account deactivated successfully
```

### Test 4: Admin Can Activate User ✅
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/activate \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Should return: User account activated successfully
```

### Test 5: Admin Can Toggle User Status ✅
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/toggle-status \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Should return: User account active successfully (or inactive if was active)
```

---

## Security Features

✅ **Role-Based Access Control (RBAC)**
- Only admins can deactivate/activate users
- Routes protected with `requireRole('admin')` middleware

✅ **Status Validation**
- Status field validated against enum ['active', 'inactive']
- Prevents invalid status values

✅ **Early Check in Login**
- Status checked BEFORE password verification
- Prevents unnecessary computation

✅ **No Password in Response**
- Password field excluded from all user responses (`.select('-password')`)

---

## Migration Guide (If Existing Data)

For existing users in the database:

```javascript
// Run this in MongoDB to add status to all existing users
db.users.updateMany(
  { status: { $exists: false } },
  { $set: { status: 'active' } }
)
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `User.js` | Added `status` field (enum: ['active', 'inactive'], default: 'active') |
| `authController.js` | ✅ Updated signup, login, update functions<br>✅ Added deactivateUser, activateUser, toggleUserStatus functions |
| `authRoutes.js` | ✅ Added 3 new admin-only routes for user status management |

---

## Files Modified

1. [User.js](./src/models/User.js)
2. [authController.js](./src/controllers/authController.js)
3. [authRoutes.js](./src/routes/authRoutes.js)

---

## Next Steps

1. ✅ Deploy backend changes
2. ✅ Update frontend login handling to display custom message for inactive accounts
3. ✅ Create admin UI to manage user status
4. ✅ Add user status display in admin dashboard

