const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Seller = require('./models/Seller');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/herbtrade', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestSeller() {
  try {
    // Check if test seller already exists
    const existingSeller = await Seller.findOne({ email: 'testseller@example.com' });
    if (existingSeller) {
      console.log('Test seller already exists');
      console.log('Email: testseller@example.com');
      console.log('Password: password123');
      return;
    }

    // Create test seller
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testSeller = new Seller({
      name: 'Test Seller',
      email: 'testseller@example.com',
      password: hashedPassword,
      role: 'seller',
      phone: '+1234567890',
      isActive: true,
      createdAt: new Date()
    });

    await testSeller.save();
    console.log('✅ Test seller created successfully!');
    console.log('Email: testseller@example.com');
    console.log('Password: password123');
    console.log('Role: seller');
    
  } catch (error) {
    console.error('❌ Error creating test seller:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestSeller();
