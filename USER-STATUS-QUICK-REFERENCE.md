# User Active/Inactive - Quick Reference

## 🎯 What Was Added?

Active/Inactive user account functionality for login control.

---

## 📋 Quick Features

### ✅ Default Behavior
- **New users** → Created as **"active"** by default ✓
- **Active users** → Can login normally ✓
- **Inactive users** → Cannot login (403 Forbidden) ✗

### ✅ Admin Controls
| Action | Endpoint | Method |
|--------|----------|--------|
| Deactivate User | `/auth/users/:id/deactivate` | POST |
| Activate User | `/auth/users/:id/activate` | POST |
| Toggle Status | `/auth/users/:id/toggle-status` | POST |

---

## 🔐 Login Flow (Updated)

```
1. User enters email + password
   ↓
2. Check if user exists
   ↓
3. ✨ NEW: Check if user status = "active"
   ├─ If INACTIVE → Return Error 403
   └─ If ACTIVE → Continue
   ↓
4. Verify password
   ↓
5. Generate token & return user data
```

---

## 💻 API Examples

### Login Active User (Success)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "pass123"
  }'
```
✅ Returns: Token + User Data + status: "active"

---

### Login Inactive User (Blocked)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inactive@example.com",
    "password": "pass123"
  }'
```
❌ Returns: Error 403 - "Your account is inactive"

---

### Admin Deactivate User
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ Returns: User account deactivated successfully

---

### Admin Activate User
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/activate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ Returns: User account activated successfully

---

## 🗄️ Database Field

```javascript
{
  name: "John Doe",
  email: "john@example.com",
  role: "user",
  status: "active"  // ← NEW FIELD
  // status can be: "active" or "inactive"
}
```

---

## 📊 Response Examples

### ✅ Active User Login Success
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "123",
    "name": "John",
    "email": "john@example.com",
    "role": "user",
    "status": "active"
  }
}
```

### ❌ Inactive User Login Error
```json
{
  "message": "Your account is inactive. Please contact the administrator to reactivate your account.",
  "status": "inactive"
}
```

HTTP Status: **403** (Forbidden)

---

## 🛡️ Security

- ✅ Only **Admins** can activate/deactivate users
- ✅ Status checked **before** password verification (faster)
- ✅ No passwords exposed in responses
- ✅ Role-based access control enforced

---

## 📝 Files Changed

1. **User.js** - Added status field
2. **authController.js** - Added status checks + new functions
3. **authRoutes.js** - Added new routes

---

## 🚀 Ready to Use!

All changes are complete and tested. Backend is ready for deployment.

