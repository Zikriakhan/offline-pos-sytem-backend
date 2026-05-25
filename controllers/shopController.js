const Shop = require('../models/Shop');
const { normalizeRole } = require('../utils/rbac');
const { getCurrentShopId } = require('../utils/tenantScope');
const { createUniqueShopCode } = require('../utils/shopCode');

const buildShopQueryForCurrentUser = async (req) => {
  const shopId = await getCurrentShopId(req);
  if (shopId) return { _id: shopId };
  return { user_id: req.user.id };
};

// Get shop info for current user
exports.getMyShop = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    
    const shop = await Shop.findOne(await buildShopQueryForCurrentUser(req));
    if (!shop) return res.status(404).json({ message: 'Shop info not found' });
    
    res.json(shop);
  } catch (err) {
    next(err);
  }
};

// Update shop info for current user
exports.updateMyShop = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const {
      shopName,
      shopEmail,
      phoneNumber,
      websiteLink
    } = req.body;

    const updateData = {};
    if (shopName) updateData.shop_name = shopName;
    if (shopEmail) updateData.shop_email = shopEmail;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    if (websiteLink) updateData.website_link = websiteLink;
    if (req.file && req.file.filename) updateData.shop_logo = req.file.filename;

    const existingShop = await Shop.findOne(await buildShopQueryForCurrentUser(req)).select('shop_code');
    const shopCode = existingShop ? existingShop.shop_code : await createUniqueShopCode();

    const shop = await Shop.findOneAndUpdate(
      await buildShopQueryForCurrentUser(req),
      { ...updateData, shop_code: shopCode },
      { new: true, upsert: true }
    );

    res.json({ message: 'Shop info updated', shop });
  } catch (err) {
    next(err);
  }
};

// Get shop info for a specific user (admin use)
exports.getShop = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user.role);
    const query = { user_id: req.params.userId };
    if (role !== 'superadmin') {
      const shopId = await getCurrentShopId(req);
      if (shopId) query._id = shopId;
    }

    const shop = await Shop.findOne(query);
    if (!shop) return res.status(404).json({ message: 'Shop info not found' });
    
    res.json(shop);
  } catch (err) {
    next(err);
  }
};

// List shops for current admin or all shops for superadmin
exports.listShops = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user.role);
    if (role === 'superadmin') {
      const shops = await Shop.find().populate('user_id', 'name email');
      return res.json(shops);
    }

    const shopId = await getCurrentShopId(req);
    const shops = shopId ? await Shop.find({ _id: shopId }).populate('user_id', 'name email') : [];
    res.json(shops);
  } catch (err) {
    next(err);
  }
};

// Delete shop info
exports.deleteShop = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const deleted = await Shop.findOneAndDelete(await buildShopQueryForCurrentUser(req));
    if (!deleted) return res.status(404).json({ message: 'Shop info not found' });
    
    res.json({ message: 'Shop info deleted' });
  } catch (err) {
    next(err);
  }
};
