const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Shop = require('../models/Shop');
const { normalizeRole, getDefaultPermissionsForRole, mergePermissions } = require('../utils/rbac');

const elevatedRoles = ['superadmin', 'admin', 'owner'];

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization required' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const payload = jwt.verify(token, secret);

    // Fetch user data
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    let shopId = user.shop_id ? String(user.shop_id) : null;
    let shopCode = null;
    if (!shopId) {
      const shop = await Shop.findOne({ user_id: user._id }).select('_id shop_code');
      shopId = shop ? String(shop._id) : null;
      shopCode = shop ? shop.shop_code : null;
    } else {
      let shop = await Shop.findById(shopId).select('shop_code');
      if (!shop) {
        shop = await Shop.findOne({ user_id: user._id }).select('shop_code');
        shopId = shop ? String(shop._id) : shopId;
      }
      shopCode = shop ? shop.shop_code : null;
    }

    // Resolve role permissions and use explicit per-user permissions when available
    const normalizedRole = normalizeRole(user.role);
    const roleDoc = await Role.findOne({ role_name: normalizedRole });
    const rolePermissions = (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0)
      ? roleDoc.permissions
      : getDefaultPermissionsForRole(normalizedRole);
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : undefined;
    const effectivePermissions = Array.isArray(userPermissions)
      ? userPermissions
      : rolePermissions;

    // Attach user info
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
      shopId,
      shopCode,
      permissions: effectivePermissions
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Require a specific role (string) — admin and superadmin bypass any check
const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authorization required' });
  const normalizedRole = normalizeRole(req.user.role);
  const requiredRole = normalizeRole(role);
  if (elevatedRoles.includes(normalizedRole)) return next();
  if (normalizedRole !== requiredRole) return res.status(403).json({ message: 'Forbidden: insufficient role' });
  return next();
};

// Require the caller to be an owner/admin/superadmin (used by some routes)
const requireOwner = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authorization required' });
  const normalizedRole = normalizeRole(req.user.role);
  if (elevatedRoles.includes(normalizedRole)) return next();
  return res.status(403).json({ message: 'Forbidden: admin only' });
};

// Require a specific permission by page name
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authorization required' });
  const normalizedRole = normalizeRole(req.user.role);
  if (normalizedRole === 'superadmin') return next();
  if (!Array.isArray(req.user.permissions)) return res.status(403).json({ message: 'Forbidden' });
  if (!req.user.permissions.includes(permission)) return res.status(403).json({ message: 'Forbidden: permission denied' });
  return next();
};

module.exports = { auth, requireRole, requireOwner, requirePermission };
