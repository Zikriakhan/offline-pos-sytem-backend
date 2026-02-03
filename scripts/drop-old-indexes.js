/**
 * Drop Old Duplicate Indexes
 * 
 * The old unique index is still causing issues.
 * This script will find and drop it.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digi-khata';

async function dropOldIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix PurchaseOrder indexes
    console.log('📦 Current PurchaseOrder indexes:');
    const poCollection = db.collection('purchaseorders');
    const poIndexes = await poCollection.indexes();
    
    poIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });

    // Drop the old poNumber_1_owner_1 index (wrong order)
    try {
      await poCollection.dropIndex('poNumber_1_owner_1');
      console.log('  ✅ Dropped old poNumber_1_owner_1 index');
    } catch (err) {
      console.log('  ℹ️  poNumber_1_owner_1 not found');
    }

    // Try dropping any poNumber_1 if it exists
    try {
      await poCollection.dropIndex('poNumber_1');
      console.log('  ✅ Dropped old poNumber_1 index');
    } catch (err) {
      console.log('  ℹ️  poNumber_1 not found');
    }

    console.log('\n📄 Current SalesInvoice indexes:');
    const siCollection = db.collection('salesinvoices');
    const siIndexes = await siCollection.indexes();
    
    siIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
    });

    // Drop the old invoiceNumber_1_owner_1 index (wrong order)
    try {
      await siCollection.dropIndex('invoiceNumber_1_owner_1');
      console.log('  ✅ Dropped old invoiceNumber_1_owner_1 index');
    } catch (err) {
      console.log('  ℹ️  invoiceNumber_1_owner_1 not found');
    }

    // Try dropping any invoiceNumber_1 if it exists
    try {
      await siCollection.dropIndex('invoiceNumber_1');
      console.log('  ✅ Dropped old invoiceNumber_1 index');
    } catch (err) {
      console.log('  ℹ️  invoiceNumber_1 not found');
    }

    console.log('\n✅ Cleanup completed!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

dropOldIndexes();
