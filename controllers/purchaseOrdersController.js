const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const { syncInventoryFromPurchase } = require('../utils/inventorySync');
const { 
  processSupplierBalanceOnCompletion, 
  adjustSupplierBalance, 
  reverseSupplierBalance 
} = require('../utils/supplierBalance');

const isAdmin = (req) => req.user && req.user.role === 'admin';

function buildSearchFilter(q, fields) {
  if (!q) return {};
  const or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
  return { $or: or };
}

function buildIdFilter(idParam, ownerId) {
  const isObjectId = mongoose.Types.ObjectId.isValid(idParam);
  const base = isObjectId ? { _id: idParam } : { poNumber: idParam };
  return ownerId ? Object.assign(base, { owner: ownerId }) : base;
}

function normalizeItemName(name) {
  return (name || '').trim().toLowerCase();
}

function buildItemMap(items) {
  const map = new Map();
  (items || []).forEach((item) => {
    const key = normalizeItemName(item.name);
    if (!key) return;
    const prev = map.get(key) || { name: item.name?.trim() || '', quantity: 0, price: item.price || 0 };
    map.set(key, {
      name: item.name?.trim() || prev.name,
      quantity: (prev.quantity || 0) + (item.quantity || 0),
      price: item.price || prev.price || 0
    });
  });
  return map;
}

function normalizeItemsForSave(items) {
  if (!Array.isArray(items)) return [];
  return items.map(it => ({
    name: (it.name || it.itemName || '').toString(),
    quantity: Number(it.quantity || it.qty || 0) || 0,
    price: Number(it.price || it.unitPrice || 0) || 0,
    returnedQuantity: Number(it.returnedQuantity || 0) || 0,
    barcode: it.barcode || null
  }));
}

function calculateItemsTotal(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.price) || 0)), 0);
}

async function getNextPoNumber(ownerId) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const regex = new RegExp(`^${prefix}\\d+$`);

  const existing = await PurchaseOrder.find({ owner: ownerId, poNumber: regex })
    .select('poNumber')
    .lean();

  let max = 0;
  existing.forEach((order) => {
    const parts = (order.poNumber || '').split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last)) max = Math.max(max, last);
  });

  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function diffPurchaseItems(oldItems, newItems) {
  const oldMap = buildItemMap(oldItems);
  const newMap = buildItemMap(newItems);

  const increaseItems = [];
  const decreaseItems = [];

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  allKeys.forEach((key) => {
    const oldItem = oldMap.get(key);
    const newItem = newMap.get(key);
    const oldQty = oldItem?.quantity || 0;
    const newQty = newItem?.quantity || 0;
    const diff = newQty - oldQty;

    if (diff > 0) {
      increaseItems.push({
        name: newItem?.name || oldItem?.name || key,
        quantity: diff,
        price: newItem?.price || oldItem?.price || 0
      });
    } else if (diff < 0) {
      decreaseItems.push({
        name: oldItem?.name || newItem?.name || key,
        quantity: Math.abs(diff),
        price: oldItem?.price || newItem?.price || 0
      });
    }
  });

  return { increaseItems, decreaseItems };
}

exports.list = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };
    const searchFilter = buildSearchFilter(q, ['poNumber', 'status', 'items.name']);
    const filter = Object.assign({}, baseFilter, q ? searchFilter : {});
    
    console.log('=== PURCHASE ORDERS LIST DEBUG ===');
    console.log('User:', req.user?.id, 'IsAdmin:', isAdmin(req));
    console.log('Filter:', filter);
    console.log('Page:', page, 'Limit:', limit);
    
    const total = await PurchaseOrder.countDocuments(filter);
    console.log('Total matching orders:', total);
    
    // Find without populate first
    const items = await PurchaseOrder.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    console.log('Items fetched:', items.length);
    
    // Process each item to handle both string and ObjectId suppliers
    const itemsWithSupplier = await Promise.all(items.map(async (item) => {
      let supplierName = item.supplierName || '';
      
      // If supplier is a valid ObjectId, try to populate
      if (item.supplier && mongoose.Types.ObjectId.isValid(item.supplier)) {
        try {
          const supplier = await Supplier.findById(item.supplier);
          if (supplier) {
            supplierName = supplier.name;
          }
        } catch (err) {
          // If populate fails, keep existing name
          console.log('Failed to populate supplier:', err.message);
        }
      } else if (item.supplier && typeof item.supplier === 'string') {
        // Old format: supplier is a string name
        supplierName = item.supplier;
      }
      
      return {
        ...item,
        supplierName: supplierName || 'Unknown Supplier',
        supplier: mongoose.Types.ObjectId.isValid(item.supplier) ? item.supplier : null
      };
    }));
    
    console.log('Items with supplier populated:', itemsWithSupplier.length);
    if (itemsWithSupplier.length > 0) {
      console.log('Sample item:', itemsWithSupplier[0]);
    } else {
      console.log('No purchase orders found for this user');
    }
    res.json({ items: itemsWithSupplier, total, page, limit });
  } catch (err) {
    console.error('❌ Purchase Orders List Error:', err);
    next(err);
  }
};


exports.get = async (req, res, next) => {
  try {
    const q = buildIdFilter(req.params.id, isAdmin(req) ? null : req.user.id);
    const p = await PurchaseOrder.findOne(q).lean();
    if (!p) return res.status(404).json({ message: 'Not found' });
    
    // Handle supplier name resolution
    let supplierName = p.supplierName || '';
    
    if (p.supplier && mongoose.Types.ObjectId.isValid(p.supplier)) {
      try {
        const supplier = await Supplier.findById(p.supplier);
        if (supplier) {
          supplierName = supplier.name;
        }
      } catch (err) {
        console.log('Failed to populate supplier:', err.message);
      }
    } else if (p.supplier && typeof p.supplier === 'string') {
      // Old format: supplier is a string name
      supplierName = p.supplier;
    }
    
    p.supplierName = supplierName || 'Unknown Supplier';
    p.supplier = mongoose.Types.ObjectId.isValid(p.supplier) ? p.supplier : null;
    
    res.json(p);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    data.owner = req.user.id;

    if (!data.poNumber) {
      data.poNumber = await getNextPoNumber(req.user.id);
    }
    
    // Normalize numeric item fields and total before save
    data.items = normalizeItemsForSave(data.items);
    data.totalAmount = Number(data.totalAmount) || calculateItemsTotal(data.items);

    // Get supplier name if supplier ID is provided
    if (data.supplier && mongoose.Types.ObjectId.isValid(data.supplier)) {
      const supplier = await Supplier.findById(data.supplier);
      if (supplier) {
        data.supplierName = supplier.name;
      }
    }
    
    // Log barcode data for debugging
    if (Array.isArray(data.items) && data.items.length > 0) {
      const itemsWithBarcode = data.items.filter(item => item.barcode);
      if (itemsWithBarcode.length > 0) {
        console.log(`📦 Purchase Order contains ${itemsWithBarcode.length} item(s) with barcode:`);
        itemsWithBarcode.forEach(item => {
          console.log(`   - ${item.name}: ${item.barcode}`);
        });
      }
    }
    
    const respondWithPurchase = async (poDoc) => {
      const result = poDoc.toObject();

      // Handle purchase returns - reduce inventory by returned quantity
      if (data.returnProcessed && Array.isArray(data.items) && data.items.length > 0) {
        const returnedItems = data.items
          .filter(item => Number(item.returnedQuantity || 0) > 0)
          .map(item => ({
            name: item.name,
            quantity: Number(item.returnedQuantity || 0),
            price: Number(item.price || 0)
          }));

        if (returnedItems.length > 0) {
          try {
            console.log('%c📦 Processing Returned Items (Create):', 'color: #dc2626; font-weight: bold;');
            console.log('Items being returned:', returnedItems);
            await syncInventoryFromPurchase(req.user.id, returnedItems, 'decrease');
            console.log('✅ Inventory reduced for returned items');
          } catch (returnSyncError) {
            console.error('Error syncing returned items on create:', returnSyncError);
          }
        }
      }

      // Auto-sync inventory when purchase order is marked as completed (only for new purchases)
      if (data.status === 'completed' && Array.isArray(data.items) && data.items.length > 0 && !data.returnProcessed) {
        try {
          await syncInventoryFromPurchase(req.user.id, data.items, 'increase');
        } catch (syncError) {
          console.error('Inventory sync error on create:', syncError);
          // Don't fail the entire operation, just log the error
        }
      }

      // Update supplier's outstanding balance when PO is completed
      if (data.status === 'completed') {
        try {
          await processSupplierBalanceOnCompletion(poDoc);
        } catch (balanceError) {
          console.error('Supplier balance update error on create:', balanceError);
        }
      }

      // Populate supplier for response
      const populated = await PurchaseOrder.findById(poDoc._id).populate('supplier', 'name').lean();
      populated.supplierName = populated.supplier?.name || populated.supplierName || 'Unknown Supplier';
      populated.supplier = populated.supplier?._id || populated.supplier;

      res.status(201).json(populated);
    };

    try {
      const po = await PurchaseOrder.create(data);
      await respondWithPurchase(po);
    } catch (err) {
      if (err && err.code === 11000) {
        data.poNumber = await getNextPoNumber(req.user.id);
        const po = await PurchaseOrder.create(data);
        await respondWithPurchase(po);
      } else {
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const q = buildIdFilter(req.params.id, isAdmin(req) ? null : req.user.id);
    const oldPO = await PurchaseOrder.findOne(q).lean();
    
    if (!oldPO) return res.status(404).json({ message: 'Not found' });

    // Get supplier name if supplier ID is provided
    if (req.body.supplier && mongoose.Types.ObjectId.isValid(req.body.supplier)) {
      const supplier = await Supplier.findById(req.body.supplier);
      if (supplier) {
        req.body.supplierName = supplier.name;
      }
    }

    // Normalize incoming items and totals
    if (req.body.items) {
      req.body.items = normalizeItemsForSave(req.body.items);
      req.body.totalAmount = Number(req.body.totalAmount) || calculateItemsTotal(req.body.items);
    }

    const updated = await PurchaseOrder.findOneAndUpdate(q, req.body, { new: true })
      .populate('supplier', 'name')
      .lean();
    
    updated.supplierName = updated.supplier?.name || updated.supplierName || 'Unknown Supplier';
    updated.supplier = updated.supplier?._id || updated.supplier;

    const ownerId = updated.owner || req.user.id;

    // Adjust supplier balance when PO is updated
    try {
      await adjustSupplierBalance(oldPO, updated);
    } catch (balanceError) {
      console.error('Supplier balance adjustment error on update:', balanceError);
    }

    // Handle purchase returns - reduce inventory by returned quantity
    if (req.body.returnProcessed && Array.isArray(updated.items) && updated.items.length > 0) {
      const returnedItems = updated.items
        .filter(item => Number(item.returnedQuantity || 0) > 0)
        .map(item => ({
          name: item.name,
          quantity: Number(item.returnedQuantity || 0),
          price: Number(item.price || 0)
        }));

      if (returnedItems.length > 0) {
        try {
          console.log('%c📦 Processing Returned Items:', 'color: #dc2626; font-weight: bold;');
          console.log('Items being returned (inventory reduced):', returnedItems);
          await syncInventoryFromPurchase(ownerId, returnedItems, 'decrease');
          console.log('✅ Inventory reduced for returned items');
        } catch (returnSyncError) {
          console.error('Error syncing returned items to inventory:', returnSyncError);
        }
      }
    }

    // Auto-sync inventory when status changes to completed (for new purchases, not returns)
    if (updated.status === 'completed' && oldPO.status !== 'completed' && !req.body.returnProcessed) {
      if (Array.isArray(updated.items) && updated.items.length > 0) {
        try {
          await syncInventoryFromPurchase(ownerId, updated.items, 'increase');
        } catch (syncError) {
          console.error('Inventory sync error on update:', syncError);
        }
      }
    }

    // If completed PO is updated, sync only the differences (supports returns or added items)
    if (updated.status === 'completed' && oldPO.status === 'completed') {
      const { increaseItems, decreaseItems } = diffPurchaseItems(oldPO.items, updated.items);

      if (increaseItems.length > 0) {
        try {
          await syncInventoryFromPurchase(ownerId, increaseItems, 'increase');
        } catch (syncError) {
          console.error('Inventory sync error on update (increase):', syncError);
        }
      }

      if (decreaseItems.length > 0) {
        try {
          await syncInventoryFromPurchase(ownerId, decreaseItems, 'decrease');
        } catch (syncError) {
          console.error('Inventory sync error on update (decrease):', syncError);
        }
      }
    }

    // If completed PO is cancelled, reverse all items
    if (oldPO.status === 'completed' && updated.status === 'cancelled') {
      if (Array.isArray(oldPO.items) && oldPO.items.length > 0) {
        try {
          await syncInventoryFromPurchase(ownerId, oldPO.items, 'decrease');
        } catch (syncError) {
          console.error('Inventory sync error on cancel:', syncError);
        }
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const q = buildIdFilter(req.params.id, isAdmin(req) ? null : req.user.id);
    const deleted = await PurchaseOrder.findOneAndDelete(q);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    // Reverse supplier balance when PO is deleted
    try {
      await reverseSupplierBalance(deleted);
    } catch (balanceError) {
      console.error('Supplier balance reversal error on delete:', balanceError);
    }

    if (deleted.status === 'completed' && Array.isArray(deleted.items) && deleted.items.length > 0) {
      try {
        await syncInventoryFromPurchase(deleted.owner, deleted.items, 'decrease');
      } catch (syncError) {
        console.error('Inventory sync error on delete:', syncError);
      }
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

