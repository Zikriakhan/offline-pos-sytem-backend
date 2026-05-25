const ROLE_PERMISSION_MAP = {
  superadmin: [
    'Dashboard','User Management','POS','Customers','Suppliers','Purchase History',
    'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
    'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','Configurations','User Permissions'
  ],
  admin: [
    'Dashboard','User Management','POS','Customers','Suppliers','Purchase History',
    'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
    'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','Configurations','User Permissions'
  ],
  owner: [
    'Dashboard','User Management','POS','Customers','Suppliers','Purchase History',
    'Sales Return','Purchases Return','Sales Return History','Suppliers History','Reset Password',
    'Items & Inventory','Purchases','Sales','Expenses','Reports','System Map','Settings','Configurations','User Permissions'
  ],
  manager: ['Dashboard','POS','Customers','Suppliers','Purchase History','Sales','Expenses','Reports','Settings'],
  cashier: ['Dashboard','POS','Sales','Customers'],
  sales_representative: ['Dashboard','POS','Sales','Customers','Reports'],
  inventory: ['Dashboard','Items & Inventory','Suppliers','Purchases','Purchase History'],
  pos: ['Dashboard','POS','Sales','Customers'],
  guest: ['Dashboard'],
  user: [
    'Dashboard','User Management','POS','Suppliers','Items & Inventory','Purchases','Sales',
    'Expenses','Reports','System Map','Settings','Customers','Purchase History','Sales Return',
    'Purchases Return','Sales Return History','Suppliers History','Reset Password','User Permissions'
  ]
};

const normalizeRole = (role) => String(role || 'user').trim().toLowerCase();

const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSION_MAP[normalizedRole] || ROLE_PERMISSION_MAP.user;
};

const getEffectivePermissions = (role, permissions) => {
  if (Array.isArray(permissions)) {
    return Array.from(new Set(permissions));
  }
  return getDefaultPermissionsForRole(role);
};

const mergePermissions = (role, permissions = []) => {
  const rolePermissions = getDefaultPermissionsForRole(role);
  const extraPermissions = Array.isArray(permissions) ? permissions : [];
  return Array.from(new Set([...rolePermissions, ...extraPermissions]));
};

module.exports = {
  ROLE_PERMISSION_MAP,
  normalizeRole,
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  mergePermissions
};