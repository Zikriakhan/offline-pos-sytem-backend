/**
 * Migration Script: Fix Return Number Index
 * 
 * This script drops the old global unique index on returnNumber
 * and creates a new compound unique index on (returnNumber + owner)
 * 
 * Run this script once: node fix-return-number-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/digi-khata';

async function fixReturnNumberIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('salesreturns');

    console.log('\n📊 Current indexes on salesreturns collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the old global unique index on returnNumber if it exists
    try {
      console.log('\n🗑️  Attempting to drop old returnNumber_1 index...');
      await collection.dropIndex('returnNumber_1');
      console.log('✅ Dropped old returnNumber_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index returnNumber_1 does not exist (already dropped or never existed)');
      } else {
        throw error;
      }
    }

    // Create new compound unique index (returnNumber + owner)
    try {
      console.log('\n🔧 Creating new compound unique index (returnNumber + owner)...');
      await collection.createIndex(
        { returnNumber: 1, owner: 1 }, 
        { unique: true, name: 'returnNumber_1_owner_1_unique' }
      );
      console.log('✅ Created new compound unique index');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Index already exists with correct options');
      } else {
        throw error;
      }
    }

    console.log('\n📊 Updated indexes on salesreturns collection:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    // Check for duplicate return numbers
    console.log('\n🔍 Checking for duplicate return numbers...');
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: { returnNumber: '$returnNumber', owner: '$owner' },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('\n⚠️  Found duplicate return numbers:');
      for (const dup of duplicates) {
        console.log(`  - Return Number: ${dup._id.returnNumber}, Owner: ${dup._id.owner}`);
        console.log(`    Count: ${dup.count}, IDs:`, dup.ids);
        
        // Rename duplicates by adding a suffix
        for (let i = 1; i < dup.ids.length; i++) {
          const newReturnNumber = `${dup._id.returnNumber}-DUP${i}`;
          await collection.updateOne(
            { _id: dup.ids[i] },
            { $set: { returnNumber: newReturnNumber } }
          );
          console.log(`    ✅ Renamed duplicate ${i} to: ${newReturnNumber}`);
        }
      }
    } else {
      console.log('✅ No duplicate return numbers found');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Restart your server');
    console.log('  2. Try creating a sales return again');
    console.log('  3. The new index will prevent duplicates per owner\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixReturnNumberIndex();
