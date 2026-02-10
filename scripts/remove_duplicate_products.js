const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected for cleanup');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const removeDuplicateProducts = async () => {
  try {
    console.log('🔍 Identifying duplicate products...');
    
    // Find all products (without populating seller to avoid model registration issues)
    const allProducts = await Product.find({}, '_id name seller').lean();
    console.log(`📋 Total products in database: ${allProducts.length}`);
    
    // Create a map to track products by name and seller
    const productMap = new Map();
    const duplicates = [];
    
    for (const product of allProducts) {
      const key = `${product.seller.toString()}_${product.name.toLowerCase().trim()}`;
      
      if (productMap.has(key)) {
        // This is a duplicate - add to duplicates array
        duplicates.push(product._id);
        console.log(`📝 Found duplicate: "${product.name}" for seller ${product.seller}`);
      } else {
        // First occurrence - add to map
        productMap.set(key, product._id);
      }
    }
    
    console.log(`📊 Total duplicates found: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      // Remove duplicates
      console.log(`🗑️ Removing ${duplicates.length} duplicate products...`);
      const result = await Product.deleteMany({ _id: { $in: duplicates } });
      console.log(`✅ Removed ${result.deletedCount} duplicate products`);
      
      // Show remaining products count
      const remainingCount = await Product.countDocuments();
      console.log(`📊 Remaining products after cleanup: ${remainingCount}`);
    } else {
      console.log('✅ No duplicates found to remove');
    }
    
    // Show summary of products by seller (without populate to avoid model issues)
    console.log('\n📈 Counting products per seller...');
    const products = await Product.aggregate([
      {
        $group: {
          _id: "$seller",
          count: { $sum: 1 },
          names: { $push: "$name" }
        }
      }
    ]);
    
    console.log(`📊 Found products from ${products.length} different sellers:`);
    for (const productGroup of products) {
      console.log(`- Seller ID ${productGroup._id}: ${productGroup.count} products`);
    }
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
    console.error('Stack trace:', error.stack);
  }
};

const runCleanup = async () => {
  console.log('🚀 Starting duplicate product removal process...');
  await connectDB();
  await removeDuplicateProducts();
  await mongoose.connection.close();
  console.log('🔒 Database connection closed');
  console.log('✅ Duplicate removal process completed!');
};

runCleanup();