const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Role = require('../models/Role');
const Customer = require('../models/Customer');
const InventoryItem = require('../models/InventoryItem');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesInvoice = require('../models/SalesInvoice');
const SalesReturn = require('../models/SalesReturn');
const Expense = require('../models/Expense');
const { normalizeRole, getDefaultPermissionsForRole, mergePermissions } = require('../utils/rbac');
const { getCurrentShopId } = require('../utils/tenantScope');
const { createUniqueShopCode } = require('../utils/shopCode');

exports.signup = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      shopName,
      phoneNumber,
      shopEmail,
      websiteLink,
      agreeTerms
    } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedRequesterRole = req.user ? normalizeRole(req.user.role) : null;
    const elevatedCreatorRoles = ['admin', 'superadmin', 'owner'];
    const hasUserManagementPermission = req.user && Array.isArray(req.user.permissions) && req.user.permissions.includes('User Management');
    const isAdminCreating = req.user && (elevatedCreatorRoles.includes(normalizedRequesterRole) || hasUserManagementPermission);
    const requestedRole = normalizeRole(req.body.role || 'user');

    // Basic validation
    if (!fullName || !normalizedEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    // Only require terms agreement for self-signup, not for authenticated user-management creators
    if (!isAdminCreating && (!agreeTerms || (agreeTerms !== true && agreeTerms !== 'true'))) {
      return res.status(400).json({ message: 'You must accept Terms and Conditions' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const logo = req.file && req.file.filename ? req.file.filename : undefined;

    // If an authenticated admin is creating a user, allow role & permissions assignment
    let userPayload = {
      name: fullName,
      full_name: fullName,
      email: normalizedEmail,
      password: hashed,
      role: isAdminCreating ? requestedRole : 'user',
      permissions: isAdminCreating ? (Array.isArray(req.body.permissions) ? req.body.permissions : []) : getDefaultPermissionsForRole('user'),
      status: 'active'
    };

    if (isAdminCreating) {
      // Admin-created user: accept optional role and explicit permissions only
      if (req.body.role) userPayload.role = requestedRole;
      userPayload.permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
      userPayload.created_by = req.user.id;
    }

    const user = await User.create(userPayload);

    // Create Shop info if any shop details are provided
    let shop = null;
    if (shopName || phoneNumber || shopEmail || websiteLink) {
      shop = await Shop.create({
        user_id: user._id,
        shop_code: await createUniqueShopCode(),
        shop_name: shopName,
        phone_number: phoneNumber,
        shop_email: shopEmail,
        website_link: websiteLink,
        shop_logo: logo
      });
      await User.findByIdAndUpdate(user._id, { shop_id: shop._id });
    } else if (isAdminCreating) {
      const currentShopId = await getCurrentShopId(req);
      if (currentShopId) {
        await User.findByIdAndUpdate(user._id, { shop_id: currentShopId });
      }
    }

    // If admin created the user, don't auto-login as that user — return created user only
    if (isAdminCreating) {
      return res.status(201).json({ message: 'User created', user: { id: user._id, name: user.name, email: user.email, role: user.role, shopId: shop?._id || req.user?.shopId || null } });
    }

    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign({ id: user._id, role: user.role, shopId: shop?._id || req.user?.shopId || null }, secret, { expiresIn: '7d' });

    // If session middleware is configured, set session user
    if (req.session) {
      req.session.userId = user._id;
    }

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: shop?._id || req.user?.shopId || null,
        shopCode: shop?.shop_code || undefined,
        shop_name: shop?.shop_name || undefined,
        shop_email: shop?.shop_email || undefined,
        phone_number: shop?.phone_number || undefined,
        website_link: shop?.website_link || undefined,
        permissions: user.permissions || getDefaultPermissionsForRole(user.role),
        status: user.status
      }
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes('duplicate'))) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const rawIdentifier = typeof email === 'string' ? email.trim() : '';
    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const isEmailLogin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);
    
    // Validate input
    if (!normalizedIdentifier || !password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Support login by email (preferred) or by full name/username for legacy UX.
    let user = null;
    if (isEmailLogin) {
      user = await User.findOne({ email: normalizedIdentifier });
    } else {
      const escapedIdentifier = rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactCaseInsensitive = new RegExp(`^${escapedIdentifier}$`, 'i');
      user = await User.findOne({
        $or: [
          { username: exactCaseInsensitive },
          { full_name: exactCaseInsensitive },
          { name: exactCaseInsensitive }
        ]
      });
    }
    
    if (!user) {
      console.warn('Login failed: user not found for identifier', rawIdentifier);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Compare provided password with hashed password first
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.warn('Login failed: password mismatch for identifier', rawIdentifier);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check if user is active (only after password is verified)
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact admin.',
        contactAdmin: {
          email: 'muhammadjanzikria@gmail.com',
          phone: '03137709330'
        }
      });
    }
    
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    let shop = null;
    if (user.shop_id) {
      shop = await Shop.findById(user.shop_id);
      if (!shop) {
        shop = await Shop.findOne({ user_id: user._id });
      }
    } else {
      shop = await Shop.findOne({ user_id: user._id });
    }

    const token = jwt.sign({ id: user._id, role: user.role, shopId: shop?._id || null, shopCode: shop?.shop_code || null }, secret, { expiresIn: '7d' });

    // Get role's permissions and merge with user's custom permissions
    const normalizedRole = normalizeRole(user.role);
    const roleDoc = await Role.findOne({ role_name: normalizedRole });
    const rolePermissions = (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0)
      ? roleDoc.permissions
      : getDefaultPermissionsForRole(normalizedRole);
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : undefined;
    const effectivePermissions = Array.isArray(userPermissions)
      ? userPermissions
      : rolePermissions;

    // If session middleware is configured, set session user id
    if (req.session) {
      req.session.userId = user._id;
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        shopId: shop?._id || null,
        shopCode: shop?.shop_code || undefined,
        shop_name: shop?.shop_name || undefined,
        shop_email: shop?.shop_email || undefined,
        phone_number: shop?.phone_number || undefined,
        website_link: shop?.website_link || undefined,
        permissions: effectivePermissions,
        status: user.status
      }
    });
  } catch (err) {
    // Return generic error message for any server errors
    return res.status(400).json({ message: 'Invalid email or password' });
  }
};

// Get current logged-in user
exports.getMe = async (req, res, next) => {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ message: 'Not authenticated' });
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Get shop info
    let shop = null;
    if (user.shop_id) {
      shop = await Shop.findById(user.shop_id);
      if (!shop) {
        shop = await Shop.findOne({ user_id: id });
      }
    } else {
      shop = await Shop.findOne({ user_id: id });
    }
    
    const normalizedRole = normalizeRole(user.role);
    const roleDoc = await Role.findOne({ role_name: normalizedRole });
    const rolePermissions = (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0)
      ? roleDoc.permissions
      : getDefaultPermissionsForRole(normalizedRole);
    const explicitUserPermissions = Array.isArray(user.permissions) ? user.permissions : undefined;
    const effectivePermissions = Array.isArray(explicitUserPermissions) ? explicitUserPermissions : rolePermissions;

    const response = {
      ...user.toObject(),
      shop: shop || null,
      shopId: user.shop_id || shop?._id || null,
      shopCode: shop?.shop_code || undefined,
      permissions: effectivePermissions
    };
    
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// Update current logged-in user's profile (only updates logged-in user)
exports.updateMe = async (req, res, next) => {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ message: 'Not authenticated' });

    const {
      fullName,
      phoneNumber,
      shopName,
      shopEmail,
      websiteLink,
      password
    } = req.body;

    // Update user profile
    const userData = {};
    if (fullName) { userData.name = fullName; userData.full_name = fullName; }
    if (password) userData.password = await bcrypt.hash(password, 10);

    const updated = await User.findByIdAndUpdate(id, userData, { new: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });

    // Update or create shop info
    const shopData = {};
    if (phoneNumber) shopData.phone_number = phoneNumber;
    if (shopName) shopData.shop_name = shopName;
    if (shopEmail) shopData.shop_email = shopEmail;
    if (websiteLink) shopData.website_link = websiteLink;
    if (req.file && req.file.filename) shopData.shop_logo = req.file.filename;

    let shop = null;
    if (Object.keys(shopData).length > 0) {
      const existingShop = await Shop.findOne({ user_id: id }).select('shop_code');
      const shopCode = existingShop ? existingShop.shop_code : await createUniqueShopCode();
      shop = await Shop.findOneAndUpdate(
        { user_id: id },
        { ...shopData, shop_code: shopCode },
        { new: true, upsert: true }
      );
      if (shop && String(updated.shop_id || '') !== String(shop._id)) {
        await User.findByIdAndUpdate(id, { shop_id: shop._id });
      }
    } else {
      shop = await Shop.findOne({ user_id: id });
    }

    const response = {
      message: 'Profile updated',
      user: { ...updated.toObject(), shopId: shop?._id || updated.shop_id || null, shopCode: shop?.shop_code || undefined },
      shop: shop || null
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const shopId = await getCurrentShopId(req);
    const query = {};

    if (req.user.role !== 'superadmin') {
      if (shopId) {
        query.shop_id = shopId;
      } else {
        query._id = req.user.id;
      }
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const requesterId = String(req.user && req.user.id);
    const targetId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'superadmin' && requesterId !== targetId) {
      const shopId = await getCurrentShopId(req);
      const user = await User.findOne({ _id: targetId, shop_id: shopId }).select('-password');
      if (!user) {
        return res.status(403).json({ message: 'Forbidden: cannot access other user profiles' });
      }
      return res.json(user);
    }

    const user = await User.findById(targetId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const requesterId = String(req.user && req.user.id);
    const targetId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'superadmin') {
      if (requesterId !== targetId) {
        const shopId = await getCurrentShopId(req);
        const targetUser = await User.findOne({ _id: targetId, shop_id: shopId });
        if (!targetUser) {
          return res.status(403).json({ message: 'Forbidden: cannot update other users' });
        }
      }
    }

    const { name, email, password, role, permissions, status } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);

    if (req.user.role === 'admin') {
      if (role) data.role = normalizeRole(role);
      if (Array.isArray(permissions)) data.permissions = permissions;
      if (status) data.status = status;
    }

    const updated = await User.findByIdAndUpdate(targetId, data, { new: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const requesterId = String(req.user && req.user.id);
    const targetId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'superadmin') {
      if (requesterId !== targetId) {
        const shopId = await getCurrentShopId(req);
        const targetUser = await User.findOne({ _id: targetId, shop_id: shopId });
        if (!targetUser) {
          return res.status(403).json({ message: 'Forbidden: cannot delete other users' });
        }
      }
    }

    const deleted = await User.findByIdAndDelete(targetId);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// Admin: delete user and all owned data
exports.removeUserWithData = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      const shopId = await getCurrentShopId(req);
      const scopedUser = await User.findOne({ _id: req.params.id, shop_id: shopId });
      if (!scopedUser) {
        return res.status(403).json({ message: 'Forbidden: cannot delete user from another shop' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    const ownerId = user._id;

    await Promise.all([
      Customer.deleteMany({ owner: ownerId }),
      InventoryItem.deleteMany({ owner: ownerId }),
      Supplier.deleteMany({ owner: ownerId }),
      PurchaseOrder.deleteMany({ owner: ownerId }),
      SalesInvoice.deleteMany({ owner: ownerId }),
      SalesReturn.deleteMany({ owner: ownerId }),
      Expense.deleteMany({ owner: ownerId })
    ]);

    await User.deleteOne({ _id: ownerId });

    res.json({ message: 'User and all data deleted' });
  } catch (err) {
    next(err);
  }
};

// Toggle user status (Admin only)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      const shopId = await getCurrentShopId(req);
      const scopedUser = await User.findOne({ _id: req.params.id, shop_id: shopId });
      if (!scopedUser) {
        return res.status(403).json({ message: 'Forbidden: cannot update user from another shop' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If status field doesn't exist, set it to active first
    if (!user.status) {
      user.status = 'active';
    }
    
    // Toggle status between active and inactive
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    
    res.json({ 
      message: `User status updated to ${user.status}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Toggle status error:', err);
    return res.status(500).json({ message: err.message || 'Failed to toggle user status' });
  }
};

// Deactivate user (Admin only)
exports.deactivateUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      const shopId = await getCurrentShopId(req);
      const scopedUser = await User.findOne({ _id: req.params.id, shop_id: shopId });
      if (!scopedUser) {
        return res.status(403).json({ message: 'Forbidden: cannot deactivate user from another shop' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot deactivate admin users' });
    }
    user.status = 'inactive';
    await user.save();
    res.json({ message: 'User deactivated', user: { id: user._id, status: user.status } });
  } catch (err) {
    next(err);
  }
};

// Activate user (Admin only)
exports.activateUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      const shopId = await getCurrentShopId(req);
      const scopedUser = await User.findOne({ _id: req.params.id, shop_id: shopId });
      if (!scopedUser) {
        return res.status(403).json({ message: 'Forbidden: cannot activate user from another shop' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.status = 'active';
    await user.save();
    res.json({ message: 'User activated', user: { id: user._id, status: user.status } });
  } catch (err) {
    next(err);
  }
};

// Admin list: DO NOT expose passwords or plainPassword
exports.adminList = async (req, res, next) => {
  try {
    const shopId = await getCurrentShopId(req);
    const query = {};

    if (req.user.role !== 'superadmin') {
      if (shopId) {
        query.shop_id = shopId;
      } else {
        query._id = req.user.id;
      }
    }

    const users = await User.find(query).select('-password'); // Exclude password field
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Reset password for old accounts or testing
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If email exists, you will receive a reset code shortly' });
    }
    
    // Generate simple OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to user (for now, in memory - in production add to DB)
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();
    
    // TODO: Send email with OTP here
    console.log(`OTP for ${email}: ${otp}`);
    
    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
        
    // Check OTP if provided
    if (otp) {
      if (user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      if (new Date() > user.otpExpiry) {
        return res.status(400).json({ message: 'OTP has expired' });
      }
    }
    
    // Hash new password with bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.status = 'active'; // Ensure user is active
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    
    res.json({ 
      message: 'Password reset successfully',
      user: { id: user._id, email: user.email, status: user.status }
    });
  } catch (err) {
    next(err);
  }
};

// Migration: Add status field to all users
exports.migrateUserStatus = async (req, res, next) => {
  try {
    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    
    res.json({ 
      message: 'Migration completed',
      updated: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// Update password for authenticated users
exports.updatePassword = async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Email, current password, and new password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password with bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    
    res.json({ 
      message: 'Password updated successfully',
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    next(err);
  }
};

