const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const HospitalBooking = require('../models/HospitalBooking');
const auth = require('../middleware/auth');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

router.post('/add-employee', auth, async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    let adminUser = req.user;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const existingSeller = await Seller.findOne({ email });
    if (existingSeller) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists in the system' });
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = new Seller({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'employee',
      department: department || '',
      isActive: true,
      createdBy: adminUser._id,
      createdAt: new Date()
    });

    const savedEmployee = await employee.save();

    try {
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #f8f6f0; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #232F3E 0%, #FF9900 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .credentials { background: #f8f6f0; padding: 20px; border-radius: 15px; margin: 20px 0; border-left: 5px solid #FF9900; }
            .button { display: inline-block; background: linear-gradient(135deg, #FF9900 0%, #E68900 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f6f0; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌿 Welcome to HerbTrade AI</h1>
              <p>Your employee account has been created!</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Welcome to the HerbTrade AI team! Your employee account has been successfully created.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>Role:</strong> ${role}</p>
                <p><strong>Department:</strong> ${department}</p>
              </div>
              
              <p>Please keep these credentials secure and change your password after your first login.</p>
              
              <a href="http://localhost:3000/login" class="button">Login to Dashboard</a>
              
              <p>If you have any questions, please contact your administrator.</p>
            </div>
            <div class="footer">
              <p>© 2024 HerbTrade AI. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@herbtrade.com',
        to: email,
        subject: '🌿 Welcome to HerbTrade AI - Your Account Details',
        html: emailHTML
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Employee added successfully to sellers collection',
      employee: {
        id: savedEmployee._id,
        name: savedEmployee.name,
        email: savedEmployee.email,
        role: savedEmployee.role,
        department: savedEmployee.department,
        isActive: savedEmployee.isActive,
        createdAt: savedEmployee.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ 
      error: 'Failed to add employee', 
      details: error.message
    });
  }
});

router.get('/employees', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const employees = await Seller.find({ 
      role: { $in: ['employee', 'manager', 'supervisor'] } 
    }).select('-password').sort({ createdAt: -1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Get additional user statistics
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const [cartItems, wishlistItems, bookings] = await Promise.all([
        Cart.findOne({ userId: user._id }),
        Wishlist.findOne({ userId: user._id }),
        HospitalBooking.countDocuments({ userId: user._id })
      ]);

      return {
        ...user.toObject(),
        stats: {
          cartItems: cartItems ? cartItems.totalItems : 0,
          wishlistItems: wishlistItems ? wishlistItems.items.length : 0,
          totalBookings: bookings,
          lastActivity: user.updatedAt || user.createdAt
        }
      };
    }));

    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
router.put('/users/:userId/toggle-status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get detailed user information
router.get('/users/:userId/details', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's cart, wishlist, and bookings
    const [cart, wishlist, bookings] = await Promise.all([
      Cart.findOne({ userId }).populate('items.productId'),
      Wishlist.findOne({ userId }).populate('items.productId'),
      HospitalBooking.find({ userId }).populate('hospitalId').sort({ createdAt: -1 })
    ]);

    const userDetails = {
      ...user.toObject(),
      cart: cart || { items: [], totalItems: 0, totalAmount: 0 },
      wishlist: wishlist || { items: [] },
      bookings: bookings || [],
      stats: {
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.bookingStatus === 'Pending').length,
        completedBookings: bookings.filter(b => b.bookingStatus === 'Completed').length,
        cartValue: cart ? cart.totalAmount : 0,
        wishlistCount: wishlist ? wishlist.items.length : 0
      }
    };

    res.json({
      success: true,
      data: userDetails
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

router.get('/sellers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sellers = await Seller.find({ role: 'seller' }).select('-password').sort({ createdAt: -1 });
    res.json(sellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [totalUsers, totalSellers, totalEmployees] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Seller.countDocuments({ role: 'seller' }),
      Seller.countDocuments({ role: { $in: ['employee', 'manager', 'supervisor'] } })
    ]);
    
    const stats = {
      totalUsers,
      totalSellers,
      totalEmployees,
      totalRevenue: '125,000',
      ordersToday: '45'
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = [
      {
        _id: '1',
        orderNumber: 'ORD-001',
        customer: 'John Doe',
        total: 150,
        status: 'Completed',
        date: new Date()
      }
    ];
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;

