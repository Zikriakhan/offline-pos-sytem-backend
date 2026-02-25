const InventoryItem = require('../models/InventoryItem');

const isAdmin = (req) => req.user && req.user.role === 'admin';

function buildSearchFilter(q, fields) {
	if (!q) return {};
	const or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
	return { $or: or };
}

/**
 * List inventory items with filtering and pagination
 */
exports.list = async (req, res, next) => {
	try {
 		const q = req.query.q || '';
 		const { name, category, status } = req.query;
 		const page = Math.max(1, parseInt(req.query.page) || 1);
 		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
 		const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };

 		// build explicit filters if provided, otherwise fall back to q-based search
 		let filter = { ...baseFilter };
 		if (name) filter.name = { $regex: name, $options: 'i' };
 		if (category) filter.category = { $regex: category, $options: 'i' };
 		if (status) {
 			const s = String(status).toLowerCase();
 			if (s === 'active') {
 				filter.status = 'active';
 			} else if (s === 'inactive' || s === 'non-active' || s === 'not active' || s === 'none active') {
 				filter.status = { $ne: 'active' };
 			} else if (s === 'instockitems' || s === 'in-stock-items' || s === 'in stock items') {
 				filter.currentStock = { $gt: 0 };
 			} else if (s === 'lowstockitems' || s === 'low-stock-items' || s === 'low stock items') {
 				filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
 				filter.currentStock = { $gt: 0 };
 			} else if (s === 'outofstockitems' || s === 'out-of-stock-items' || s === 'out of stock items') {
 				filter.currentStock = 0;
 			} else if (s === 'criticalitems' || s === 'critical-items' || s === 'critical items') {
 				filter.$or = [
 					{ currentStock: 0 },
 					{ $expr: { $lt: ['$currentStock', '$reorderLevel'] } }
 				];
 			} else {
 				filter.status = status;
 			}
 		}

 		if (!name && !category && !status && q) {
 			const searchFilter = buildSearchFilter(q, ['name', 'category', 'description']);
 			filter = Object.assign({}, filter, searchFilter);
 		}

 		const total = await InventoryItem.countDocuments(filter);
 		const items = await InventoryItem.find(filter)
 			.sort({ createdAt: -1 })
 			.skip((page - 1) * limit)
 			.limit(limit);
 		
 		res.json({ items, total, page, limit });
 	} catch (err) { 
 		next(err); 
 	}
};

/**
 * Get a single inventory item
 */
exports.get = async (req, res, next) => { 
	try { 
		const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id }; 
		const item = await InventoryItem.findOne(q); 
		
		if (!item) {
			return res.status(404).json({ message: 'Item not found' }); 
		}
		
		res.json(item); 
	} catch (err) { 
		next(err); 
	} 
};

/**
 * Create a new inventory item
 */
exports.create = async (req, res, next) => { 
	try { 
		const { name, category, description, currentStock = 0, reorderLevel = 0, unitOfMeasure = 'piece', purchasePrice = 0, sellingPrice, status = 'active', barcode, sku, alternateBarcodes = [] } = req.body;

		// Validate required fields
		if (!name || sellingPrice === undefined) {
			return res.status(400).json({ message: 'Name and sellingPrice are required' });
		}

		if (sellingPrice < 0 || purchasePrice < 0) {
			return res.status(400).json({ message: 'Prices cannot be negative' });
		}

		if (currentStock < 0) {
			return res.status(400).json({ message: 'Stock cannot be negative' });
		}

		const item = await InventoryItem.create({
			owner: req.user.id,
			name,
			category,
			description,
			currentStock,
			reorderLevel,
			unitOfMeasure,
			purchasePrice,
			sellingPrice,
			status,
			barcode,
			sku,
			alternateBarcodes,
			totalQuantitySold: 0,
			totalTransactions: 0,
			totalRevenue: 0
		});

		res.status(201).json(item); 
	} catch (err) { 
		next(err); 
	} 
};

/**
 * Update an inventory item
 */
exports.update = async (req, res, next) => { 
	try { 
		const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
		
		// Validate prices if provided
		if (req.body.sellingPrice !== undefined && req.body.sellingPrice < 0) {
			return res.status(400).json({ message: 'Selling price cannot be negative' });
		}
		if (req.body.purchasePrice !== undefined && req.body.purchasePrice < 0) {
			return res.status(400).json({ message: 'Purchase price cannot be negative' });
		}
		if (req.body.currentStock !== undefined && req.body.currentStock < 0) {
			return res.status(400).json({ message: 'Current stock cannot be negative' });
		}

		// Allow updating stock directly from inventory management
		// Note: Stock can also be updated through sales/purchase orders
		const allowedFields = ['name', 'category', 'description', 'currentStock', 'reorderLevel', 'unitOfMeasure', 'purchasePrice', 'sellingPrice', 'status', 'barcode', 'sku', 'alternateBarcodes'];
		const updateData = {};

		for (const field of allowedFields) {
			if (req.body.hasOwnProperty(field)) {
				updateData[field] = req.body[field];
			}
		}

		const updated = await InventoryItem.findOneAndUpdate(q, updateData, { new: true }); 
		
		if (!updated) {
			return res.status(404).json({ message: 'Item not found' }); 
		}
		
		res.json(updated); 
	} catch (err) { 
		next(err); 
	} 
};

/**
 * Delete an inventory item
 */
exports.remove = async (req, res, next) => { 
	try { 
		const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
		const deleted = await InventoryItem.findOneAndDelete(q); 
		
		if (!deleted) {
			return res.status(404).json({ message: 'Item not found' }); 
		}
		
		res.json({ message: 'Item deleted successfully' }); 
	} catch (err) { 
		next(err); 
	} 
};

/**
 * Adjust stock level (manual adjustment)
 * Body: { adjustment: number (can be positive or negative), reason: string }
 */
exports.adjustStock = async (req, res, next) => {
	try {
		const { adjustment, reason = 'Manual adjustment' } = req.body;

		if (adjustment === undefined || adjustment === 0) {
			return res.status(400).json({ message: 'Adjustment value is required and cannot be zero' });
		}

		const q = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
		const item = await InventoryItem.findOne(q);

		if (!item) {
			return res.status(404).json({ message: 'Item not found' });
		}

		const newStock = item.currentStock + adjustment;
		if (newStock < 0) {
			return res.status(400).json({ message: `Cannot adjust stock. New stock would be negative (Current: ${item.currentStock}, Adjustment: ${adjustment})` });
		}

		const updated = await InventoryItem.findByIdAndUpdate(
			item._id,
			{ $inc: { currentStock: adjustment } },
			{ new: true }
		);

		res.json({
			message: `Stock adjusted by ${adjustment}. Reason: ${reason}`,
			item: updated
		});
	} catch (err) {
		next(err);
	}
};

/**
 * Get inventory alerts (low stock items)
 */
exports.getLowStockAlerts = async (req, res, next) => {
	try {
		const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };
		
		// Find items where current stock is at or below reorder level
		const lowStockItems = await InventoryItem.find({
			...baseFilter,
			$expr: { $lte: ['$currentStock', '$reorderLevel'] },
			status: 'active'
		}).sort({ currentStock: 1 });

		res.json({
			count: lowStockItems.length,
			items: lowStockItems
		});
	} catch (err) {
		next(err);
	}
};

/**
 * Get inventory statistics
 */
exports.getInventoryStats = async (req, res, next) => {
	try {
		const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };
		
		const items = await InventoryItem.find(baseFilter);
		
		const stats = {
			totalItems: items.length,
			activeItems: items.filter(i => i.status === 'active').length,
			inactiveItems: items.filter(i => i.status === 'inactive').length,
			totalStockValue: items.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0),
			totalSalesValue: items.reduce((sum, item) => sum + item.totalRevenue, 0),
			totalQuantityInStock: items.reduce((sum, item) => sum + item.currentStock, 0),
			totalQuantitySold: items.reduce((sum, item) => sum + item.totalQuantitySold, 0),
			averageStockLevel: items.length > 0 ? Math.round((items.reduce((sum, item) => sum + item.currentStock, 0) / items.length) * 100) / 100 : 0,
			lowStockCount: items.filter(i => i.currentStock <= i.reorderLevel && i.status === 'active').length,
			topSellingItems: items
				.filter(i => i.totalQuantitySold > 0)
				.sort((a, b) => b.totalRevenue - a.totalRevenue)
				.slice(0, 5)
				.map(i => ({
					id: i._id,
					name: i.name,
					totalSold: i.totalQuantitySold,
					totalRevenue: i.totalRevenue,
					currentStock: i.currentStock
				}))
		};

		res.json(stats);
	} catch (err) {
		next(err);
	}
};

/**
 * Bulk update stock for multiple items
 * Body: { updates: [{ name: string, adjustment: number }] }
 */
exports.bulkAdjustStock = async (req, res, next) => {
	try {
		const { updates } = req.body;

		if (!Array.isArray(updates) || updates.length === 0) {
			return res.status(400).json({ message: 'Updates array is required' });
		}

		const results = {
			success: [],
			failed: []
		};

		for (const update of updates) {
			try {
				const { name, adjustment } = update;

				if (!name || adjustment === undefined) {
					results.failed.push({ name, error: 'Name and adjustment are required' });
					continue;
				}

				const q = isAdmin(req) 
					? { name: { $regex: new RegExp(`^${name}$`, 'i') } }
					: { name: { $regex: new RegExp(`^${name}$`, 'i') }, owner: req.user.id };

				const item = await InventoryItem.findOne(q);

				if (!item) {
					results.failed.push({ name, error: 'Item not found' });
					continue;
				}

				const newStock = Math.max(0, item.currentStock + adjustment);
				item.currentStock = newStock;
				await item.save();

				results.success.push({
					name: item.name,
					oldStock: item.currentStock - adjustment,
					newStock: item.currentStock
				});
			} catch (error) {
				results.failed.push({ name: update.name, error: error.message });
			}
		}

		res.json(results);
	} catch (err) {
		next(err);
	}
};

/**
 * Search inventory by barcode/SKU
 * Route: GET /inventory/search/barcode/:barcode
 */
exports.searchByBarcode = async (req, res, next) => {
	try {
		const { barcode } = req.params;

		if (!barcode || barcode.trim() === '') {
			return res.status(400).json({ message: 'Barcode parameter is required' });
		}

		const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };

		// Search by barcode, SKU, or alternative barcodes
		const item = await InventoryItem.findOne({
			...baseFilter,
			$or: [
				{ barcode: { $regex: `^${barcode}$`, $options: 'i' } },
				{ sku: { $regex: `^${barcode}$`, $options: 'i' } },
				{ alternateBarcodes: { $in: [new RegExp(`^${barcode}$`, 'i')] } },
				{ name: { $regex: barcode, $options: 'i' } }
			],
			status: 'active'
		});

		if (!item) {
			return res.status(404).json({ message: `Product with barcode "${barcode}" not found` });
		}

		res.json({
			success: true,
			item: {
				id: item._id,
				name: item.name,
				price: item.sellingPrice,
				stock: item.currentStock,
				category: item.category,
				sku: item.sku,
				barcode: item.barcode
			}
		});
	} catch (err) {
		next(err);
	}
};

/**
 * Search inventory by multiple barcodes
 * Route: POST /inventory/search/barcodes
 * Body: { barcodes: [string] }
 */
exports.searchByMultipleBarcodes = async (req, res, next) => {
	try {
		const { barcodes } = req.body;

		if (!Array.isArray(barcodes) || barcodes.length === 0) {
			return res.status(400).json({ message: 'Barcodes array is required' });
		}

		const baseFilter = isAdmin(req) ? {} : { owner: req.user.id };
		const barcodePatterns = barcodes.map(bc => new RegExp(`^${bc}$`, 'i'));

		const items = await InventoryItem.find({
			...baseFilter,
			$or: [
				{ barcode: { $in: barcodePatterns } },
				{ sku: { $in: barcodePatterns } },
				{ alternateBarcodes: { $in: barcodePatterns } }
			],
			status: 'active'
		});

		res.json({
			success: true,
			found: items.length,
			items: items.map(item => ({
				id: item._id,
				name: item.name,
				price: item.sellingPrice,
				stock: item.currentStock,
				category: item.category,
				sku: item.sku,
				barcode: item.barcode
			})),
			notFound: barcodes.filter(bc => !items.some(item => 
				item.barcode === bc || item.sku === bc || item.alternateBarcodes?.includes(bc)
			))
		});
	} catch (err) {
		next(err);
	}
};
