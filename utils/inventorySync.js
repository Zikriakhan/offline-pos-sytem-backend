/**
 * Inventory Synchronization Utilities
 * Handles automatic inventory updates from all transaction types
 * Formula: Current Stock = Purchased - Purchase Returns - Sold + Sales Returns + Adjustments
 */

const InventoryItem = require('../models/InventoryItem');

/**
 * Update inventory stock from purchase order items
 * @param {String} ownerId - User ID
 * @param {Array} items - Purchase order items [{ name, quantity, price }]
 * @param {String} operation - 'increase' (purchase) or 'decrease' (purchase return)
 */
async function syncInventoryFromPurchase(ownerId, items, operation = 'increase') {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, message: 'No items to sync' };
  }

  const results = {
    created: [],
    updated: [],
    errors: []
  };

  for (const item of items) {
    try {
      const { name, quantity, price, barcode } = item;
      
      if (!name || quantity <= 0) {
        results.errors.push({ item: name, error: 'Invalid item data' });
        continue;
      }

      // Find existing inventory item by name (case-insensitive) or barcode
      let searchQuery = {
        owner: ownerId,
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      };

      // If barcode provided, also search by barcode
      if (barcode && barcode.trim()) {
        searchQuery = {
          owner: ownerId,
          $or: [
            { name: { $regex: new RegExp(`^${name}$`, 'i') } },
            { barcode: barcode.trim() },
            { sku: barcode.trim() }
          ]
        };
      }

      let inventoryItem = await InventoryItem.findOne(searchQuery);

      if (inventoryItem) {
        // Update existing item
        const oldStock = inventoryItem.currentStock;
        
        if (operation === 'increase') {
          // Purchase: Add to stock and track as purchased
          inventoryItem.currentStock += quantity;
          inventoryItem.totalPurchased = (inventoryItem.totalPurchased || 0) + quantity;
          console.log(`✅ PURCHASE: ${name} | +${quantity} units | Stock: ${oldStock} → ${inventoryItem.currentStock}`);
        } else {
          // Purchase Return: Reduce stock and track as return
          const returnQty = Math.min(quantity, inventoryItem.currentStock);
          inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - returnQty);
          inventoryItem.totalPurchaseReturns = (inventoryItem.totalPurchaseReturns || 0) + returnQty;
          console.log(`↩️ PURCHASE RETURN: ${name} | -${returnQty} units | Stock: ${oldStock} → ${inventoryItem.currentStock}`);
        }
        
        // Update purchase price if provided and valid
        if (price && price > 0) {
          inventoryItem.purchasePrice = price;

                // Update barcode if provided and not already set
                if (barcode && barcode.trim() && !inventoryItem.barcode) {
                  inventoryItem.barcode = barcode.trim();
                  inventoryItem.sku = inventoryItem.sku || barcode.trim();
                  console.log(`📦 BARCODE ADDED: ${name} → ${barcode.trim()}`);
                }
        }

        // Update selling price if not set (default markup: 20%)
        if (!inventoryItem.sellingPrice || inventoryItem.sellingPrice === 0) {
          inventoryItem.sellingPrice = price * 1.2;
        }

        await inventoryItem.save();
        results.updated.push({
          name: inventoryItem.name,
          oldStock: oldStock,
          newStock: inventoryItem.currentStock,
                    barcode: inventoryItem.barcode,
          operation: operation
        });
      } else {
        // Create new inventory item (only for purchases, not returns)
        if (operation === 'increase') {
          const sellingPrice = price ? price * 1.2 : 0;
          
          const newItemData = {
            owner: ownerId,
            name: name.trim(),
            category: 'General',
            currentStock: quantity,
            totalPurchased: quantity,
            reorderLevel: Math.ceil(quantity * 0.2), // 20% of initial stock
            unitOfMeasure: 'piece',
            purchasePrice: price || 0,
            sellingPrice: sellingPrice,
            status: 'active'
          };

          // Add barcode if provided
          if (barcode && barcode.trim()) {
            newItemData.barcode = barcode.trim();
            newItemData.sku = barcode.trim();
          }

          inventoryItem = await InventoryItem.create(newItemData);

          console.log(`🆕 NEW ITEM: ${name} | Initial stock: ${quantity} units${barcode ? ` | Barcode: ${barcode}` : ''}`);
          
          results.created.push({
            name: inventoryItem.name,
            stock: inventoryItem.currentStock,
            barcode: inventoryItem.barcode
          });
        } else {
          results.errors.push({
            item: name,
            error: 'Cannot return items that do not exist in inventory'
          });
        }
      }
    } catch (error) {
      results.errors.push({
        item: item.name,
        error: error.message
      });
    }
  }

  console.log(`\n📊 Inventory Sync Summary:`);
  console.log(`   Created: ${results.created.length} items`);
  console.log(`   Updated: ${results.updated.length} items`);
  console.log(`   Errors: ${results.errors.length} items\n`);

  return {
    success: results.errors.length === 0,
    ...results
  };
}

/**
 * Update inventory from sales transactions
 * @param {String} ownerId - User ID
 * @param {Array} items - Sale items [{ itemId, quantity, unitPrice }]
 * @param {String} operation - 'sale' or 'return'
 */
async function syncInventoryFromSale(ownerId, items, operation = 'sale') {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, message: 'No items to sync' };
  }

  const results = { updated: [], errors: [] };

  for (const item of items) {
    try {
      const { itemId, quantity, unitPrice } = item;
      
      if (!itemId || quantity <= 0) {
        results.errors.push({ item: itemId, error: 'Invalid item data' });
        continue;
      }

      const inventoryItem = await InventoryItem.findOne({
        _id: itemId,
        owner: ownerId
      });

      if (!inventoryItem) {
        results.errors.push({ item: itemId, error: 'Item not found' });
        continue;
      }

      const oldStock = inventoryItem.currentStock;

      if (operation === 'sale') {
        // Sale: Reduce stock and track as sold
        const soldQty = Math.min(quantity, inventoryItem.currentStock);
        inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - soldQty);
        inventoryItem.totalQuantitySold = (inventoryItem.totalQuantitySold || 0) + soldQty;
        inventoryItem.totalTransactions = (inventoryItem.totalTransactions || 0) + 1;
        inventoryItem.totalRevenue = (inventoryItem.totalRevenue || 0) + (soldQty * (unitPrice || inventoryItem.sellingPrice));
        
        console.log(`💰 SALE: ${inventoryItem.name} | -${soldQty} units | Stock: ${oldStock} → ${inventoryItem.currentStock}`);
      } else if (operation === 'return') {
        // Sales Return: Add back to stock
        inventoryItem.currentStock += quantity;
        inventoryItem.totalSalesReturns = (inventoryItem.totalSalesReturns || 0) + quantity;
        inventoryItem.totalQuantitySold = Math.max(0, (inventoryItem.totalQuantitySold || 0) - quantity);
        inventoryItem.totalRevenue = Math.max(0, (inventoryItem.totalRevenue || 0) - (quantity * (unitPrice || inventoryItem.sellingPrice)));
        
        console.log(`🔄 SALES RETURN: ${inventoryItem.name} | +${quantity} units | Stock: ${oldStock} → ${inventoryItem.currentStock}`);
      }

      await inventoryItem.save();
      
      results.updated.push({
        name: inventoryItem.name,
        oldStock: oldStock,
        newStock: inventoryItem.currentStock,
        operation: operation
      });
    } catch (error) {
      results.errors.push({
        item: item.itemId,
        error: error.message
      });
    }
  }

  console.log(`\n📊 Sales Sync Summary:`);
  console.log(`   Updated: ${results.updated.length} items`);
  console.log(`   Errors: ${results.errors.length} items\n`);

  return {
    success: results.errors.length === 0,
    ...results
  };
}

/**
 * Calculate stock status based on current stock and reorder level
 */
function calculateStockStatus(currentStock, reorderLevel) {
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock < reorderLevel * 0.5) return 'Critical';
  if (currentStock <= reorderLevel) return 'Low Stock';
  return 'In Stock';
}

module.exports = {
  syncInventoryFromPurchase,
  syncInventoryFromSale,
  calculateStockStatus
};
