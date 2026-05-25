const crypto = require('crypto');
const Shop = require('../models/Shop');

const generateShopCode = () => {
  return `SHOP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const createUniqueShopCode = async () => {
  let code;
  let exists;
  do {
    code = generateShopCode();
    exists = await Shop.findOne({ shop_code: code }).select('_id');
  } while (exists);
  return code;
};

module.exports = { createUniqueShopCode, generateShopCode };
