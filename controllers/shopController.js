const Shop = require('../models/Shop');

// Get shop info for current user
exports.getMyShop = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    
    const shop = await Shop.findOne({ user_id: userId });
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

    const shop = await Shop.findOneAndUpdate(
      { user_id: userId },
      updateData,
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
    const shop = await Shop.findOne({ user_id: req.params.userId });
    if (!shop) return res.status(404).json({ message: 'Shop info not found' });
    
    res.json(shop);
  } catch (err) {
    next(err);
  }
};

// List all shops (admin use)
exports.listShops = async (req, res, next) => {
  try {
    const shops = await Shop.find().populate('user_id', 'name email');
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

    const deleted = await Shop.findOneAndDelete({ user_id: userId });
    if (!deleted) return res.status(404).json({ message: 'Shop info not found' });
    
    res.json({ message: 'Shop info deleted' });
  } catch (err) {
    next(err);
  }
};
