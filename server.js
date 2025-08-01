const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const commentRoutes = require('./routes/comments');
const discussionRoutes = require('./routes/discussions');
const hospitalRoutes = require('./routes/hospitals');
const appointmentRoutes = require('./routes/appointments');
const chatbotRoutes = require('./routes/chatbot');
const wishlistRoutes = require('./routes/wishlist');
const cartRoutes = require('./routes/cart');
const hospitalBookingRoutes = require('./routes/hospitalBookings');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/herbtrade', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📁 Available Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes - Enable essential routes
console.log('Registering routes...');

// Test hospitals first - inline route for testing
// app.get('/api/hospitals/inline-test', (req, res) => {
//   console.log('🏥 Inline hospitals route hit!');
//   res.json({ message: 'Inline hospitals route working!' });
// });

// Test inline route first
app.get('/api/hospitals/inline-test', (req, res) => {
  console.log('🏥 Inline test route hit!');
  res.json({ message: 'Inline test route working!' });
});

app.use('/api/hospitals', hospitalRoutes);
console.log('✅ Hospitals routes registered');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');
app.use('/api/products', productRoutes);
console.log('✅ Products routes registered');
app.use('/api/cart', cartRoutes);
console.log('✅ Cart routes registered');
app.use('/api/wishlist', wishlistRoutes);
console.log('✅ Wishlist routes registered');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered');
// Test simple route
app.get('/api/test', (req, res) => {
  console.log('🔍 Simple test route hit!');
  res.json({ message: 'Express is working!' });
});

// Test blog route registration
app.get('/api/blog/debug', (req, res) => {
  console.log('🔍 Debug route hit!');
  res.json({ message: 'Blog routes are working from server.js!' });
});

// Temporary direct blog routes to fix 404 issues
app.get('/api/blog/:id/stats', async (req, res) => {
  try {
    console.log('📊 Direct stats route hit for:', req.params.id);
    const Blog = require('./models/Blog');
    const Comment = require('./models/Comment');

    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const commentsCount = await Comment.countDocuments({ blog: req.params.id });

    res.json({
      likes: post.likes?.length || 0,
      views: post.views || 0,
      comments: commentsCount,
      likedBy: post.likes || []
    });
  } catch (err) {
    console.error('Error in direct stats route:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/:id', async (req, res) => {
  try {
    console.log('📄 Direct blog route hit for:', req.params.id);
    const Blog = require('./models/Blog');

    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error in direct blog route:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/blog', blogRoutes);
console.log('✅ Blog routes registered');
app.use('/api/orders', orderRoutes);
console.log('✅ Orders routes registered');
app.use('/api/appointments', appointmentRoutes);
console.log('✅ Appointments routes registered');
app.use('/api/hospital-bookings', hospitalBookingRoutes);
console.log('✅ Hospital bookings routes registered');
// Temporary direct comments route to fix 404 issues
app.get('/api/comments/blog/:blogId', async (req, res) => {
  try {
    console.log('💬 Direct comments route hit for blog:', req.params.blogId);
    const Comment = require('./models/Comment');

    const comments = await Comment.find({
      blog: req.params.blogId,
      parentComment: null
    })
    .populate('user', 'name')
    .sort({ createdAt: -1 });

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('user', 'name')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json(commentsWithReplies || []);
  } catch (err) {
    console.error('Error in direct comments route:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/comments', commentRoutes);
console.log('✅ Comments routes registered');
// Temporary direct discussion routes to fix 404 issues
app.get('/api/discussions', async (req, res) => {
  try {
    console.log('💬 Direct discussions route hit');
    const Discussion = require('./models/Discussion');

    const { category, search, limit = 20 } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'name email')
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit));

    res.json({
      discussions: discussions || [],
      totalPages: 1,
      currentPage: 1,
      total: discussions.length
    });
  } catch (err) {
    console.error('Error in direct discussions route:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/discussions', discussionRoutes);
console.log('✅ Discussions routes registered');
// app.use('/api/chatbot', chatbotRoutes);

// Health check route - also serves hospitals data
app.get('/api/health', (req, res) => {
  console.log('🔍 Health route hit! Query:', req.query);

  // If hospitals data is requested
  if (req.query.type === 'hospitals') {
    console.log('🏥 Returning hospitals data');
    return res.json({
      status: 'OK',
      message: 'Hospitals API working',
      data: [
        {
          _id: '1',
          name: 'City General Hospital',
          address: '123 Main Street, City Center',
          city: 'City Center',
          phone: '1234567890',
          specialties: ['Cardiology', 'Neurology', 'Orthopedics'],
          rating: 4.5,
          image: '/api/placeholder/400/300',
          doctors: [
            { name: 'Dr. John Smith', specialty: 'Cardiology' },
            { name: 'Dr. Sarah Johnson', specialty: 'Neurology' },
            { name: 'Dr. Mike Wilson', specialty: 'Orthopedics' }
          ],
          facilities: ['Emergency Room', 'ICU', 'Surgery Center', 'Pharmacy'],
          description: 'A leading healthcare facility providing comprehensive medical services.'
        },
        {
          _id: '2',
          name: 'Metro Medical Center',
          address: '456 Oak Avenue, Downtown',
          city: 'Downtown',
          phone: '0987654321',
          specialties: ['Emergency', 'Pediatrics', 'Surgery'],
          rating: 4.2,
          image: '/api/placeholder/400/300',
          doctors: [
            { name: 'Dr. Emily Davis', specialty: 'Emergency Medicine' },
            { name: 'Dr. Robert Brown', specialty: 'Pediatrics' },
            { name: 'Dr. Lisa Garcia', specialty: 'Surgery' }
          ],
          facilities: ['24/7 Emergency', 'Pediatric Ward', 'Operating Theater', 'Lab'],
          description: 'Modern medical center specializing in emergency care and pediatric services.'
        }
      ],
      timestamp: new Date().toISOString()
    });
  }

  console.log('🔍 Returning health data');
  // Default health check
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Hospitals routes are now handled by the proper hospitalRoutes middleware above

// Test route with different name
app.get('/api/health2', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Health2 route working',
    timestamp: new Date().toISOString()
  });
});

// Removed duplicate test route

// Debug route to test HospitalBooking directly
app.get('/api/debug/bookings', async (req, res) => {
  try {
    const HospitalBooking = require('./models/HospitalBooking');
    const count = await HospitalBooking.countDocuments();
    const bookings = await HospitalBooking.find({}).limit(2);

    res.json({
      success: true,
      count: count,
      bookings: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create inbuilt admin user if not exists
async function ensureAdminUser() {
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'admin@123';
  
  try {
    const existing = await User.findOne({ email: adminEmail, role: 'admin' });
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 10);
      const admin = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        phone: '0000000000',
        password: hash,
        role: 'admin',
        isActive: true
      });
      console.log('👤 Admin user created successfully');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      console.log('👤 Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Initialize admin user after DB connection
mongoose.connection.once('open', () => {
  ensureAdminUser();
});

// Simple working API endpoints to fix 404 errors
app.get('/api/blog/:id/stats', (req, res) => {
  console.log('📊 Simple stats route hit for:', req.params.id);
  res.json({
    likes: 0,
    views: 0,
    comments: 0,
    likedBy: []
  });
});

app.get('/api/comments/blog/:blogId', (req, res) => {
  console.log('💬 Simple comments route hit for:', req.params.blogId);
  res.json([]);
});

app.get('/api/discussions', (req, res) => {
  console.log('💬 Simple discussions route hit');
  res.json({
    discussions: [],
    totalPages: 1,
    currentPage: 1,
    total: 0
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: http://localhost:3000`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});


