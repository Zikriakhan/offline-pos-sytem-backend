/**
 * Fix Multi-User Indexes Migration Script
 * 
 * This script fixes the duplicate key error issue by:
 * 1. Dropping old global unique indexes on poNumber and invoiceNumber
 * 2. Creating new compound unique indexes (owner + poNumber/invoiceNumber)
 * 
 * This allows multiple users to have the same PO/Invoice numbers without conflicts.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digi-khata';

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix PurchaseOrder indexes
    console.log('📦 Fixing PurchaseOrder indexes...');
    const purchaseOrdersCollection = db.collection('purchaseorders');
    
    try {
      // Drop old unique index on poNumber
      await purchaseOrdersCollection.dropIndex('poNumber_1');
      console.log('  ✅ Dropped old poNumber_1 index');
    } catch (err) {
      console.log('  ℹ️  poNumber_1 index not found (already dropped or never existed)');
    }

    try {
      // Create new compound unique index
      await purchaseOrdersCollection.createIndex(
        { owner: 1, poNumber: 1 }, 
        { unique: true, name: 'owner_1_poNumber_1_unique' }
      );
      console.log('  ✅ Created compound index: owner_1_poNumber_1_unique');
    } catch (err) {
      console.log('  ℹ️  Compound index already exists');
    }

    // Fix SalesInvoice indexes
    console.log('\n📄 Fixing SalesInvoice indexes...');
    const salesInvoicesCollection = db.collection('salesinvoices');
    
    try {
      // Drop old unique index on invoiceNumber
      await salesInvoicesCollection.dropIndex('invoiceNumber_1');
      console.log('  ✅ Dropped old invoiceNumber_1 index');
    } catch (err) {
      console.log('  ℹ️  invoiceNumber_1 index not found (already dropped or never existed)');
    }

    try {
      // Create new compound unique index
      await salesInvoicesCollection.createIndex(
        { owner: 1, invoiceNumber: 1 }, 
        { unique: true, name: 'owner_1_invoiceNumber_1_unique' }
      );
      console.log('  ✅ Created compound index: owner_1_invoiceNumber_1_unique');
    } catch (err) {
      console.log('  ℹ️  Compound index already exists');
    }

    // Show current indexes
    console.log('\n📊 Current PurchaseOrder Indexes:');
    const poIndexes = await purchaseOrdersCollection.indexes();
    poIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key));
    });

    console.log('\n📊 Current SalesInvoice Indexes:');
    const siIndexes = await salesInvoicesCollection.indexes();
    siIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key));
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('💡 Now multiple users can have the same PO/Invoice numbers.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the migration
fixIndexes();
