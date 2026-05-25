const SalesInvoice = require('../models/SalesInvoice');
const InventoryItem = require('../models/InventoryItem');
const Customer = require('../models/Customer');
const { syncInventoryFromSale } = require('../utils/inventorySync');
const { buildOwnerFilter, getCurrentShopId } = require('../utils/tenantScope');

function buildSearchFilter(q, fields) {
	if (!q) return {};
	const or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
	return { $or: or };
}

/**
 * Generate a unique invoice number
 */
const generateInvoiceNumber = async (req) => {
	const today = new Date();
	const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
	
	// Find the latest invoice for today within the current shop scope
	const latestInvoice = await SalesInvoice.findOne({
		...(await buildOwnerFilter(req)),
		invoiceNumber: { $regex: `^INV-${dateStr}-` }
	}).sort({ invoiceNumber: -1 });
	
	let nextNumber = 1;
	if (latestInvoice && latestInvoice.invoiceNumber) {
		// Extract the sequence number from the last invoice (e.g., "0005" from "INV-20260124-0005")
		const match = latestInvoice.invoiceNumber.match(/-(\d{4})$/);
		if (match) {
			nextNumber = parseInt(match[1], 10) + 1;
		}
	}
	
	return `INV-${dateStr}-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Validate invoice items and prepare for sale
 */
const validateAndPrepareInvoiceItems = async (items, req) => {
	const preparedItems = [];
	let subtotal = 0;

	for (const item of items) {
		if (!item.itemId || !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice < 0) {
			throw new Error('Invalid item data. Each item must have itemId, quantity > 0, and unitPrice >= 0');
		}

		// Fetch inventory item using shop-aware owner access
		const inventoryItem = await InventoryItem.findOne({ 
			_id: item.itemId,
			...(await buildOwnerFilter(req))
		});

		if (!inventoryItem) {
			throw new Error(`Item with ID ${item.itemId} not found`);
		}

		// Check stock availability
		if (inventoryItem.currentStock < item.quantity) {
			throw new Error(
				`Insufficient stock for item "${inventoryItem.name}". ` +
				`Available: ${inventoryItem.currentStock}, Requested: ${item.quantity}`
			);
		}

		const itemTotal = item.quantity * item.unitPrice;
		subtotal += itemTotal;

		preparedItems.push({
			itemId: inventoryItem._id,
			name: inventoryItem.name,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			itemTotal: itemTotal
		});
	}

	return { preparedItems, subtotal };
};

/**
 * Calculate totals for invoice
 */
const calculateInvoiceTotals = (subtotal, discount = 0, discountPercentage = 0, tax = 0, taxPercentage = 0) => {
	// Calculate discount
	let finalDiscount = discount;
	if (discountPercentage > 0) {
		finalDiscount = (subtotal * discountPercentage) / 100;
	}

	// Calculate taxable amount
	const afterDiscount = Math.max(0, subtotal - finalDiscount);

	// Calculate tax
	let finalTax = tax;
	if (taxPercentage > 0) {
		finalTax = (afterDiscount * taxPercentage) / 100;
	}

	const grandTotal = afterDiscount + finalTax;

	return {
		subtotal: Math.round(subtotal * 100) / 100,
		discount: Math.round(finalDiscount * 100) / 100,
		discountPercentage: Math.round(discountPercentage * 100) / 100,
		tax: Math.round(finalTax * 100) / 100,
		taxPercentage: Math.round(taxPercentage * 100) / 100,
		grandTotal: Math.round(grandTotal * 100) / 100
	};
};

/**
 * Update inventory stock after sale using the comprehensive sync function
 */
const updateInventoryStock = async (invoiceItems, req) => {
	try {
		const result = await syncInventoryFromSale(req, invoiceItems, 'sale');
		if (!result.success) {
			console.error('⚠️ Inventory sync had errors:', result.errors);
		}
		return result;
	} catch (error) {
		console.error('❌ Failed to sync inventory:', error);
		throw error;
	}
};

/**
 * Update customer purchase data
 */
const updateCustomerData = async (customerId, ownerId, grandTotal) => {
	if (!customerId) return;

	await Customer.findOneAndUpdate(
		{ _id: customerId, owner: ownerId },
		{
			$inc: {
				totalPurchases: grandTotal,
				outstanding: grandTotal
			}
		}
	);
};

// ============= API Endpoints =============

/**
 * List sales invoices
 */
exports.list = async (req, res, next) => {
	try {
		const q = req.query.q || '';
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
		const baseFilter = await buildOwnerFilter(req);
		
		const searchFilter = buildSearchFilter(q, ['invoiceNumber', 'status', 'items.name']);
		const filter = Object.assign({}, baseFilter, q ? searchFilter : {});
		
		const total = await SalesInvoice.countDocuments(filter);
		const items = await SalesInvoice.find(filter)
			.populate('customer', 'name contact')
			.populate('items.itemId', 'name')
			.populate('owner', 'shop_name shop_email phone_number website_link shop_logo')
			.sort({ invoiceDate: -1 })
			.skip((page - 1) * limit)
			.limit(limit);
		
		res.json({ items, total, page, limit });
	} catch (err) {
		next(err);
	}
};

/**
 * Get a single invoice
 */
exports.get = async (req, res, next) => {
	try {
		const q = Object.assign({ _id: req.params.id }, await buildOwnerFilter(req));
			const invoice = await SalesInvoice.findOne(q)
				.populate('customer', 'name contact')
				.populate('items.itemId', 'name sellingPrice')
				.populate('owner', 'shop_name shop_email phone_number website_link shop_logo');
		
		if (!invoice) {
			return res.status(404).json({ message: 'Invoice not found' });
		}
		
		res.json(invoice);
	} catch (err) {
		next(err);
	}
};

/**
 * Create a new sales invoice
 * Body should contain: items (array), customer (optional), paymentMethod, discount, discountPercentage, tax, taxPercentage, notes
 */
exports.create = async (req, res, next) => {
	try {
		const { items, customer, customerName, paymentMethod = 'cash', discount = 0, discountPercentage = 0, tax = 0, taxPercentage = 0, notes = '', status = 'pending', received = 0 } = req.body;

		// Validate input
		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ message: 'Invoice must contain at least one item' });
		}

		// Validate and prepare items
		const { preparedItems, subtotal } = await validateAndPrepareInvoiceItems(items, req);

		// Calculate totals
		const totals = calculateInvoiceTotals(subtotal, discount, discountPercentage, tax, taxPercentage);

		// Validate customer if provided
		if (customer) {
			const customerExists = await Customer.findOne({ _id: customer, ...(await buildOwnerFilter(req)) });
			if (!customerExists) {
				return res.status(404).json({ message: 'Customer not found' });
			}
		}

		// Generate invoice number
	const invoiceNumber = await generateInvoiceNumber(req);
		const normalizedPaymentMethod = String(paymentMethod || 'cash').toLowerCase();
		const receivedAmount = Math.max(0, Number(received) || 0);
		const balanceAmount = Math.max(0, totals.grandTotal - receivedAmount);
		const computedStatus = balanceAmount === 0 && totals.grandTotal > 0
			? 'paid'
			: receivedAmount > 0
				? 'partial'
				: 'pending';

		// Create invoice
		const invoice = new SalesInvoice({
			owner: req.user.id,
			shop_id: await getCurrentShopId(req),
			invoiceNumber,
			customer: customer || null,
			customerName: customerName || null,
			items: preparedItems,
			paymentMethod: normalizedPaymentMethod,
			...totals,
			received: receivedAmount,
			balance: balanceAmount,
			notes,
			status: status || computedStatus
		});

		await invoice.save();

		// Update inventory stock
		await updateInventoryStock(preparedItems, req);

		// Update customer data if provided
		if (customer) {
			await updateCustomerData(customer, req.user.id, totals.grandTotal);
		}

		// Populate references
			await invoice.populate('customer', 'name contact');
			await invoice.populate('items.itemId', 'name');
			await invoice.populate('owner', 'shop_name shop_email phone_number website_link shop_logo');

		res.status(201).json(invoice);
	} catch (err) {
		next(err);
	}
};

/**
 * Update an invoice (can update non-locked fields and handle returns)
 */
exports.update = async (req, res, next) => {
	try {
		const q = Object.assign({ _id: req.params.id }, await buildOwnerFilter(req));
		const invoice = await SalesInvoice.findOne(q);

		if (!invoice) {
			return res.status(404).json({ message: 'Invoice not found' });
		}

		// Handle items update (for returns/quantity changes)
		if (req.body.items && Array.isArray(req.body.items)) {
			// Process returned items and restore inventory stock
			for (let i = 0; i < invoice.items.length; i++) {
				const oldItem = invoice.items[i];
				const newItem = req.body.items.find(item => 
					(item.itemId && item.itemId.toString() === oldItem.itemId.toString()) ||
					(item._id && item._id.toString() === oldItem._id.toString())
				);

				if (newItem) {
					const returnedQty = (newItem.returnedQuantity || 0);
					const oldReturnedQty = (oldItem.returnedQuantity || 0);
					const qtyDifference = returnedQty - oldReturnedQty;

					// If items were returned, restore stock
					if (qtyDifference > 0) {
						await InventoryItem.findOneAndUpdate(
							{ _id: oldItem.itemId, ...(await buildOwnerFilter(req)) },
							{
								$inc: {
									currentStock: qtyDifference,
									totalQuantitySold: -qtyDifference,
									totalRevenue: -(qtyDifference * oldItem.unitPrice)
								}
							}
						);
					}
				}
			}

			// Calculate new subtotal based on updated items
			let newSubtotal = 0;
			const updatedItems = req.body.items.map(item => {
				const remainingQty = Math.max(0, (item.quantity || 0) - (item.returnedQuantity || 0));
				const itemTotal = remainingQty * (item.unitPrice || 0);
				newSubtotal += itemTotal;
				return {
					itemId: item.itemId,
					name: item.name,
					quantity: item.quantity || 0,
					returnedQuantity: item.returnedQuantity || 0,
					unitPrice: item.unitPrice || 0,
					itemTotal: itemTotal
				};
			});

			// Recalculate totals with new subtotal
			const totals = calculateInvoiceTotals(
				newSubtotal,
				req.body.discount || invoice.discount,
				req.body.discountPercentage || invoice.discountPercentage,
				req.body.tax || invoice.tax,
				req.body.taxPercentage || invoice.taxPercentage
			);

			// Update invoice with new items and totals
			invoice.items = updatedItems;
			Object.assign(invoice, totals);
		}

		// Allow updating other fields (but not customer field directly - use customerName instead)
		const allowedFields = ['paymentMethod', 'discount', 'discountPercentage', 'tax', 'taxPercentage', 'received', 'notes', 'customerName', 'invoiceDate'];
		
		for (const field of allowedFields) {
			if (req.body.hasOwnProperty(field)) {
				invoice[field] = req.body[field];
			}
		}

		// Calculate balance
		if (req.body.received !== undefined || invoice.grandTotal !== undefined) {
			invoice.balance = Math.max(0, invoice.grandTotal - (req.body.received !== undefined ? req.body.received : invoice.received));
		}

		// Update status based on balance (use valid enum values)
		if (invoice.balance === 0 && invoice.grandTotal > 0) {
			invoice.status = 'paid';
		} else if (invoice.balance > 0 && invoice.received > 0) {
			invoice.status = 'partial';
		} else if (invoice.received === 0) {
			invoice.status = 'pending';
		} else if (req.body.status && ['draft', 'pending', 'paid', 'cancelled'].includes(req.body.status)) {
			invoice.status = req.body.status;
		}

		await invoice.save();

			const updated = await SalesInvoice.findOne(Object.assign({ _id: invoice._id }, await buildOwnerFilter(req)))
				.populate('customer', 'name contact')
				.populate('items.itemId', 'name')
				.populate('owner', 'shop_name shop_email phone_number website_link shop_logo');

		res.json(updated);
	} catch (err) {
		console.error('Update error:', err);
		next(err);
	}
};

/**
 * Delete an invoice and reverse stock updates
 */
exports.remove = async (req, res, next) => {
	try {
		const q = Object.assign({ _id: req.params.id }, await buildOwnerFilter(req));
		const invoice = await SalesInvoice.findOne(q);

		if (!invoice) {
			return res.status(404).json({ message: 'Invoice not found' });
		}

		// Reverse inventory stock updates using the sync function
		await syncInventoryFromSale(req, invoice.items, 'return');

		// Reverse customer data if exists
		if (invoice.customer) {
			await Customer.findOneAndUpdate(
				{ _id: invoice.customer, ...(await buildOwnerFilter(req)) },
				{
					$inc: {
						totalPurchases: -invoice.grandTotal,
						outstanding: -invoice.grandTotal
					}
				}
			);
		}

		await SalesInvoice.findOneAndDelete(q);
		res.json({ message: 'Invoice deleted and stock reversed' });
	} catch (err) {
		next(err);
	}
};

/**
 * Get sales statistics for a specific item
 * Returns: totalQuantitySold, totalTransactions, totalRevenue for an item
 */
exports.getItemSalesStats = async (req, res, next) => {
	try {
		const itemId = req.params.itemId;

		// Verify item exists
		const item = await InventoryItem.findOne(Object.assign({ _id: itemId }, await buildOwnerFilter(req)));

		if (!item) {
			return res.status(404).json({ message: 'Item not found' });
		}

		// Get stats directly from inventory item
		const stats = {
			itemId: item._id,
			itemName: item.name,
			totalQuantitySold: item.totalQuantitySold,
			totalTransactions: item.totalTransactions,
			totalRevenue: item.totalRevenue,
			currentStock: item.currentStock,
			averageRevenuePerTransaction: item.totalTransactions > 0 
				? Math.round((item.totalRevenue / item.totalTransactions) * 100) / 100 
				: 0
		};

		res.json(stats);
	} catch (err) {
		next(err);
	}
};

/**
 * Get sales statistics for all items
 */
exports.getAllItemsSalesStats = async (req, res, next) => {
	try {
		const items = await InventoryItem.find(await buildOwnerFilter(req))
			.select('name totalQuantitySold totalTransactions totalRevenue currentStock sellingPrice')
			.sort({ totalRevenue: -1 });

		const stats = items.map(item => ({
			itemId: item._id,
			itemName: item.name,
			currentStock: item.currentStock,
			sellingPrice: item.sellingPrice,
			totalQuantitySold: item.totalQuantitySold,
			totalTransactions: item.totalTransactions,
			totalRevenue: item.totalRevenue,
			averageRevenuePerTransaction: item.totalTransactions > 0 
				? Math.round((item.totalRevenue / item.totalTransactions) * 100) / 100 
				: 0
		}));

		res.json(stats);
	} catch (err) {
		next(err);
	}
};

/**
 * Get invoice summary/dashboard data
 */
exports.getSalesMetrics = async (req, res, next) => {
	try {
		const baseFilter = await buildOwnerFilter(req);
		const invoices = await SalesInvoice.find(baseFilter);

		const metrics = {
			totalInvoices: invoices.length,
			paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
			pendingInvoices: invoices.filter(inv => inv.status === 'pending').length,
			totalRevenue: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
			totalDiscount: invoices.reduce((sum, inv) => sum + inv.discount, 0),
			totalTax: invoices.reduce((sum, inv) => sum + inv.tax, 0),
			totalOutstanding: invoices.reduce((sum, inv) => sum + inv.balance, 0),
			totalReceived: invoices.reduce((sum, inv) => sum + inv.received, 0)
		};

		res.json(metrics);
	} catch (err) {
		next(err);
	}
};
