const User = require('../models/User');
const Shop = require('../models/Shop');
const { normalizeRole } = require('./rbac');

const getCurrentShopId = async (req) => {
  if (!req.user) return null;

  const role = normalizeRole(req.user.role);
  if (role === 'superadmin') return null;

  if (req.user.shopId) return String(req.user.shopId);

  const user = await User.findById(req.user.id).select('shop_id');
  if (user && user.shop_id) return String(user.shop_id);

  const shop = await Shop.findOne({ user_id: req.user.id }).select('_id');
  return shop ? String(shop._id) : null;
};

const getAccessibleOwnerIds = async (req) => {
  if (!req.user) return [];

  const role = normalizeRole(req.user.role);
  if (role === 'superadmin') return null;

  const shopId = await getCurrentShopId(req);
  if (!shopId) return [String(req.user.id)];

  const users = await User.find({ shop_id: shopId }).select('_id').lean();
  const ids = users.map((user) => String(user._id));
  if (!ids.includes(String(req.user.id))) ids.push(String(req.user.id));
  return ids;
};

const buildOwnerFilter = async (req, field = 'owner') => {
  const ownerIds = await getAccessibleOwnerIds(req);
  const shopId = await getCurrentShopId(req);

  if (!shopId) {
    if (!ownerIds) return {};
    return { [field]: { $in: ownerIds } };
  }

  // Prefer explicit shop_id scoping where supported, but keep owner fallback for legacy records
  return {
    $or: [
      { shop_id: shopId },
      { [field]: { $in: ownerIds } }
    ]
  };
};

module.exports = { getCurrentShopId, getAccessibleOwnerIds, buildOwnerFilter };