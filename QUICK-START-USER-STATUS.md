# 🚀 Quick Start - User Active/Inactive Feature

## ⚡ 30-Second Overview

**What:** Users can only login if their account is **"active"**  
**Why:** Admins can disable/enable user accounts instantly  
**How:** New status check added to login endpoint  

---

## 🔄 The Flow

```
Active User Login?     → ✅ Allowed
Inactive User Login?   → ❌ Blocked (403 error)
```

---

## 🛠️ Installation

No additional packages needed. Everything uses existing dependencies (bcrypt, jwt, mongoose).

Just deploy the updated files:
- ✅ `src/models/User.js`
- ✅ `src/controllers/authController.js`
- ✅ `src/routes/authRoutes.js`

---

## 📡 API Quick Reference

### 1️⃣ Login (Active User)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass123"}'
```
✅ Returns: Token + User data

### 2️⃣ Login (Inactive User)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "inactive@example.com", "password": "pass123"}'
```
❌ Returns: 403 Forbidden

### 3️⃣ Deactivate User (Admin)
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ User can't login anymore

### 4️⃣ Activate User (Admin)
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/activate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ User can login again

### 5️⃣ Toggle Status (Admin)
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/toggle-status \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ Switches between active/inactive

---

## 💾 Database

**New field added:**
```javascript
status: { 
  type: String, 
  enum: ['active', 'inactive'], 
  default: 'active' 
}
```

**For existing users:**
```javascript
// Run once to add status field
db.users.updateMany(
  { status: { $exists: false } },
  { $set: { status: 'active' } }
)
```

---

## 📊 User Response

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "status": "active"  ← NEW FIELD
}
```

---

## 🔐 New Routes (Admin Only)

| Method | Route | Effect |
|--------|-------|--------|
| POST | `/auth/users/:id/deactivate` | Disable login |
| POST | `/auth/users/:id/activate` | Enable login |
| POST | `/auth/users/:id/toggle-status` | Switch status |

---

## 🧪 Test It

### Step 1: Signup
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "pass123"
  }'
```
Result: User created with `status: "active"`

### Step 2: Login (Works)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "pass123"
  }'
```
Result: ✅ Login successful

### Step 3: Deactivate (Admin)
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
Result: User status changed to `"inactive"`

### Step 4: Login (Fails)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "pass123"
  }'
```
Result: ❌ Error 403 - Account is inactive

### Step 5: Activate (Admin)
```bash
curl -X POST http://localhost:5000/auth/users/USER_ID/activate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
Result: User status changed back to `"active"`

### Step 6: Login (Works Again)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "pass123"
  }'
```
Result: ✅ Login successful

---

## 📱 Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Login successful, User updated |
| 400 | Bad Request | Missing fields, Invalid email |
| 403 | Forbidden | Account is inactive |
| 404 | Not Found | User not found |

---

## 🔑 Key Points

✅ **Default:** New users are "active"  
✅ **Check:** Status verified BEFORE password check  
✅ **Error:** Clear message when account inactive  
✅ **Admin:** Only admins can change status  
✅ **Token:** JWT token includes user role  

---

## ❓ Common Questions

**Q: Can a user change their own status?**  
A: No, only admins can change status.

**Q: What happens to inactive user's sessions?**  
A: Existing tokens still work (validate at request level if needed).

**Q: Can admin change their own status?**  
A: Yes (be careful with this!).

**Q: Are inactive users deleted?**  
A: No, they're just disabled. Can be reactivated anytime.

**Q: What about initial migration?**  
A: Existing users default to "active" automatically.

---

## 📚 More Info

See detailed documentation:
- `USER-ACTIVE-INACTIVE-COMPLETE.md` - Full guide
- `USER-STATUS-TEST-CASES.md` - Test examples
- `BEFORE-AFTER-CODE-COMPARISON.md` - What changed

---

## ✅ Checklist

- [x] Backend code updated
- [x] No syntax errors
- [x] All tests passing
- [x] Documentation complete
- [ ] Frontend updated (optional)
- [ ] Admin UI created (optional)
- [ ] User status dashboard (optional)

---

**Ready to deploy!** 🚀

