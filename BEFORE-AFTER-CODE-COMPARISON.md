# Before & After Code Comparison

## 1️⃣ User Model Changes

### ❌ BEFORE
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });
```

### ✅ AFTER
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }  // ← NEW
}, { timestamps: true });
```

---

## 2️⃣ Login Function Changes

### ❌ BEFORE
```javascript
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    // ❌ NO STATUS CHECK - Anyone can login if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' });
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};
```

### ✅ AFTER
```javascript
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // ✅ NEW: Check if user account is active
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Your account is inactive. Please contact the administrator to reactivate your account.',
        status: 'inactive'
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' });
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }  // ← ADDED status
    });
  } catch (err) {
    next(err);
  }
};
```

**Key Changes:**
- ✅ Added status check BEFORE password verification
- ✅ Returns 403 if user is inactive
- ✅ Includes status in response

---

## 3️⃣ Signup Function Changes

### ❌ BEFORE
```javascript
const user = await User.create({ name, email, password: hashed });
```

### ✅ AFTER
```javascript
const user = await User.create({ name, email, password: hashed, status: 'active' });  // ← NEW
```

**Response Update:**
```javascript
// ❌ BEFORE
user: { id: user._id, name: user.name, email: user.email, role: user.role }

// ✅ AFTER
user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }
```

---

## 4️⃣ Update Function Changes

### ❌ BEFORE
```javascript
exports.update = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);
    // ❌ NO STATUS HANDLING
    const updated = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    next(err);
  }
};
```

### ✅ AFTER
```javascript
exports.update = async (req, res, next) => {
  try {
    const { name, email, password, status } = req.body;  // ← ADDED status
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);
    if (status && ['active', 'inactive'].includes(status)) data.status = status;  // ← NEW
    const updated = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    next(err);
  }
};
```

**Changes:**
- ✅ Accepts status parameter
- ✅ Validates status (only 'active' or 'inactive')
- ✅ Updates status if provided

---

## 5️⃣ New Functions Added

### ✅ NEWLY ADDED: Deactivate User
```javascript
exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'inactive' }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ 
      message: 'User account deactivated successfully',
      user 
    });
  } catch (err) {
    next(err);
  }
};
```

### ✅ NEWLY ADDED: Activate User
```javascript
exports.activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: 'active' }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ 
      message: 'User account activated successfully',
      user 
    });
  } catch (err) {
    next(err);
  }
};
```

### ✅ NEWLY ADDED: Toggle User Status
```javascript
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const updated = await User.findByIdAndUpdate(id, { status: newStatus }, { new: true }).select('-password');
    
    res.json({ 
      message: `User account ${newStatus} successfully`,
      user: updated 
    });
  } catch (err) {
    next(err);
  }
};
```

---

## 6️⃣ Routes Changes

### ❌ BEFORE
```javascript
const { signup, login, list, get, update, remove, adminList } = require('../controllers/authController');

// ... routes ...
// NO STATUS MANAGEMENT ROUTES
```

### ✅ AFTER
```javascript
const { signup, login, list, get, update, remove, adminList, deactivateUser, activateUser, toggleUserStatus } = require('../controllers/authController');  // ← NEW IMPORTS

// ... existing routes ...

// ✅ NEW: User status management (admin only)
router.post('/users/:id/deactivate', requireRole('admin'), deactivateUser);
router.post('/users/:id/activate', requireRole('admin'), activateUser);
router.post('/users/:id/toggle-status', requireRole('admin'), toggleUserStatus);
```

---

## 📊 Summary of Changes

| Component | Change Type | Details |
|-----------|------------|---------|
| User Model | NEW FIELD | `status: { enum: ['active', 'inactive'], default: 'active' }` |
| Login | ENHANCED | Status check BEFORE password verify |
| Signup | ENHANCED | Users created with active status |
| Update | ENHANCED | Can now update status |
| Functions | NEW | deactivateUser, activateUser, toggleUserStatus |
| Routes | NEW | 3 new admin-only endpoints |
| Response | UPDATED | All responses now include status field |

---

## 🔄 Behavior Changes

### Login Endpoint
**Before:** Anyone with correct password → Login allowed  
**After:** Only active users with correct password → Login allowed

### Inactive User Attempt
**Before:** No check, user could login  
**After:** Returns 403 Forbidden with error message

### Admin Control
**Before:** No way to disable/enable users  
**After:** Admins can deactivate/activate users instantly

---

## 🧪 Test Scenarios

### Scenario 1: New User
1. Signup → User created with status='active' ✅
2. Login → Success ✅

### Scenario 2: Deactivated User
1. Admin deactivates user → status='inactive' ✅
2. Login attempt → 403 Forbidden ❌

### Scenario 3: Reactivated User
1. Admin activates user → status='active' ✅
2. Login → Success ✅

---

## 📈 Impact Summary

| Area | Impact |
|------|--------|
| Security | ⬆️ Higher (Can disable accounts) |
| Control | ⬆️ More admin control |
| Functionality | ➕ New status management |
| Performance | ➡️ Minimal (1 field check) |
| Backwards Compatibility | ✅ Yes (defaults to active) |

