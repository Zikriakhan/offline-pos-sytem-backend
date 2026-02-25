const User = require('../models/User');
const Role = require('../models/Role');

// Canonical list of available pages/permissions
const AVAILABLE_PERMISSIONS = [
  'Dashboard','POS','Catalog','Configurations','Customers','Suppliers','Purchase History',
  'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
  'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','User Management'
];

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getUserPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Resolve role permissions
    const role = await Role.findOne({ role_name: user.role });
    const rolePermissions = role ? role.permissions : [];

    // User-level overrides (explicit permissions array) take precedence
    const effective = Array.from(new Set([...(rolePermissions || []), ...(user.permissions || [])]));

    res.json({ role: user.role, rolePermissions, userPermissions: user.permissions || [], effectivePermissions: effective });
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

    const user = await User.findByIdAndUpdate(userId, { permissions }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
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

    const roleDoc = await Role.findOne({ role_name: role });
    if (!roleDoc) return res.status(400).json({ message: 'Role not found' });

    const user = await User.findByIdAndUpdate(userId, { role, permissions: [] }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
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
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

// Assign role's default permissions to user (overwrite user.permissions)
exports.assignDefaultPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roleDoc = await Role.findOne({ role_name: user.role });
    if (!roleDoc) return res.status(400).json({ message: 'Role not found for user' });

    user.permissions = roleDoc.permissions || [];
    await user.save();

    res.json({ message: 'Default role permissions assigned', user: { id: user._id, role: user.role, permissions: user.permissions } });
  } catch (err) {
    next(err);
  }
};
