const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

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

    // Resolve role permissions and merge with per-user overrides
    const roleDoc = await Role.findOne({ role_name: user.role });
    const rolePermissions = roleDoc ? roleDoc.permissions : [];
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const effectivePermissions = Array.from(new Set([...(rolePermissions || []), ...userPermissions]));

    // Attach user info
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
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
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return next();
  if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden: insufficient role' });
  return next();
};

// Require the caller to be an owner/admin/superadmin (used by some routes)
const requireOwner = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authorization required' });
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Forbidden: admin only' });
};

// Require a specific permission by page name
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authorization required' });
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return next();
  if (!Array.isArray(req.user.permissions)) return res.status(403).json({ message: 'Forbidden' });
  if (!req.user.permissions.includes(permission)) return res.status(403).json({ message: 'Forbidden: permission denied' });
  return next();
};

module.exports = { auth, requireRole, requireOwner, requirePermission };
