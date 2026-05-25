const User = require('../models/User');
const Role = require('../models/Role');
const { normalizeRole, getDefaultPermissionsForRole, mergePermissions } = require('../utils/rbac');
const { getCurrentShopId } = require('../utils/tenantScope');

const findShopScopedUser = async (req, userId) => {
  const shopId = await getCurrentShopId(req);
  const query = { _id: userId };
  if (shopId) query.shop_id = shopId;
  return await User.findOne(query).select('-password');
};

// Canonical list of available pages/permissions
const AVAILABLE_PERMISSIONS = [
  'Dashboard','POS','Catalog','Configurations','Customers','Suppliers','Purchase History',
  'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
  'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','User Management'
];

exports.getAllUsers = async (req, res, next) => {
  try {
    const shopId = await getCurrentShopId(req);
    const query = shopId ? { shop_id: shopId } : {};
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getUserPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await findShopScopedUser(req, userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const normalizedRole = normalizeRole(user.role);

    // Resolve role permissions for fallback when there are no explicit user permissions
    const role = await Role.findOne({ role_name: normalizedRole });
    const rolePermissions = (role && Array.isArray(role.permissions) && role.permissions.length > 0)
      ? role.permissions
      : getDefaultPermissionsForRole(normalizedRole);

    const explicitUserPermissions = Array.isArray(user.permissions) ? user.permissions : undefined;
    const effective = Array.isArray(explicitUserPermissions) ? explicitUserPermissions : rolePermissions;

    res.json({ role: normalizedRole, rolePermissions, userPermissions: explicitUserPermissions || [], effectivePermissions: effective });
  } catch (err) {
    next(err);
  }
};

exports.updateUserPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array of strings' });
    }

    // Validate permissions
    const invalid = permissions.filter(p => !AVAILABLE_PERMISSIONS.includes(p));
    if (invalid.length) return res.status(400).json({ message: 'Invalid permissions', invalid });

    const user = await findShopScopedUser(req, userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.permissions = Array.from(new Set(permissions));
    await user.save();
    res.json({ message: 'User permissions updated', user });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { role } = req.body; // role name
    if (!role) return res.status(400).json({ message: 'Role required' });

    const normalizedRole = normalizeRole(role);
    const roleDoc = await Role.findOne({ role_name: normalizedRole });
    if (!roleDoc) return res.status(400).json({ message: 'Role not found' });

    const rolePermissions = (Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0)
      ? roleDoc.permissions
      : getDefaultPermissionsForRole(normalizedRole);

    const user = await findShopScopedUser(req, userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = normalizedRole;
    await user.save();

    res.json({ message: 'User role updated', user });
  } catch (err) {
    next(err);
  }
};

exports.getAvailablePermissions = async (req, res, next) => {
  try {
    res.json({ permissions: AVAILABLE_PERMISSIONS });
  } catch (err) {
    next(err);
  }
};

exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find();
    const normalizedRoles = roles.map((role) => {
      const roleName = normalizeRole(role.role_name);
      const permissions = (Array.isArray(role.permissions) && role.permissions.length > 0)
        ? role.permissions
        : getDefaultPermissionsForRole(roleName);
      return {
        ...role.toObject(),
        role_name: roleName,
        permissions
      };
    });
    res.json(normalizedRoles);
  } catch (err) {
    next(err);
  }
};

// Assign role's default permissions to user (overwrite user.permissions)
exports.assignDefaultPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await findShopScopedUser(req, userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const normalizedRole = normalizeRole(user.role);
    const roleDoc = await Role.findOne({ role_name: normalizedRole });
    if (!roleDoc) return res.status(400).json({ message: 'Role not found for user' });

    user.permissions = (Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0)
      ? roleDoc.permissions
      : getDefaultPermissionsForRole(normalizedRole);
    await user.save();

    res.json({ message: 'Default role permissions assigned', user: { id: user._id, role: normalizedRole, permissions: user.permissions } });
  } catch (err) {
    next(err);
  }
};
