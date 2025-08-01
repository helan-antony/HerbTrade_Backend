// Test each route file individually to find the problematic one

console.log('Testing route imports...');

try {
  console.log('Testing auth routes...');
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes imported successfully');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

try {
  console.log('Testing product routes...');
  const productRoutes = require('./routes/products');
  console.log('✅ Product routes imported successfully');
} catch (error) {
  console.error('❌ Product routes failed:', error.message);
}

try {
  console.log('Testing cart routes...');
  const cartRoutes = require('./routes/cart');
  console.log('✅ Cart routes imported successfully');
} catch (error) {
  console.error('❌ Cart routes failed:', error.message);
}

try {
  console.log('Testing admin routes...');
  const adminRoutes = require('./routes/admin');
  console.log('✅ Admin routes imported successfully');
} catch (error) {
  console.error('❌ Admin routes failed:', error.message);
}

try {
  console.log('Testing wishlist routes...');
  const wishlistRoutes = require('./routes/wishlist');
  console.log('✅ Wishlist routes imported successfully');
} catch (error) {
  console.error('❌ Wishlist routes failed:', error.message);
}

try {
  console.log('Testing blog routes...');
  const blogRoutes = require('./routes/blog');
  console.log('✅ Blog routes imported successfully');
} catch (error) {
  console.error('❌ Blog routes failed:', error.message);
}

try {
  console.log('Testing order routes...');
  const orderRoutes = require('./routes/orders');
  console.log('✅ Order routes imported successfully');
} catch (error) {
  console.error('❌ Order routes failed:', error.message);
}

try {
  console.log('Testing comment routes...');
  const commentRoutes = require('./routes/comments');
  console.log('✅ Comment routes imported successfully');
} catch (error) {
  console.error('❌ Comment routes failed:', error.message);
}

try {
  console.log('Testing hospital routes...');
  const hospitalRoutes = require('./routes/hospitals');
  console.log('✅ Hospital routes imported successfully');
} catch (error) {
  console.error('❌ Hospital routes failed:', error.message);
}

try {
  console.log('Testing appointment routes...');
  const appointmentRoutes = require('./routes/appointments');
  console.log('✅ Appointment routes imported successfully');
} catch (error) {
  console.error('❌ Appointment routes failed:', error.message);
}

try {
  console.log('Testing chatbot routes...');
  const chatbotRoutes = require('./routes/chatbot');
  console.log('✅ Chatbot routes imported successfully');
} catch (error) {
  console.error('❌ Chatbot routes failed:', error.message);
}

try {
  console.log('Testing hospital booking routes...');
  const hospitalBookingRoutes = require('./routes/hospitalBookings');
  console.log('✅ Hospital booking routes imported successfully');
} catch (error) {
  console.error('❌ Hospital booking routes failed:', error.message);
}

console.log('Route import testing completed.');