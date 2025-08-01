const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/herbtrade', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Test adding routes one by one
console.log('Testing route registration...');

try {
  console.log('Adding auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes registered successfully');
} catch (error) {
  console.error('❌ Auth routes registration failed:', error.message);
  process.exit(1);
}

try {
  console.log('Adding product routes...');
  const productRoutes = require('./routes/products');
  app.use('/api/products', productRoutes);
  console.log('✅ Product routes registered successfully');
} catch (error) {
  console.error('❌ Product routes registration failed:', error.message);
  process.exit(1);
}

try {
  console.log('Adding cart routes...');
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart routes registered successfully');
} catch (error) {
  console.error('❌ Cart routes registration failed:', error.message);
  process.exit(1);
}

try {
  console.log('Adding admin routes...');
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes registered successfully');
} catch (error) {
  console.error('❌ Admin routes registration failed:', error.message);
  process.exit(1);
}

try {
  console.log('Adding wishlist routes...');
  const wishlistRoutes = require('./routes/wishlist');
  app.use('/api/wishlist', wishlistRoutes);
  console.log('✅ Wishlist routes registered successfully');
} catch (error) {
  console.error('❌ Wishlist routes registration failed:', error.message);
  process.exit(1);
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: http://localhost:3000`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});