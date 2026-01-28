const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const HospitalBooking = require('../models/HospitalBooking');
const Hospital = require('../models/Hospital');
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');
const router = express.Router();

// Transporter will be created inside route handlers to avoid env variable issues

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
    const { name, email, role, department, currentLocation, maxDeliveryRadius, vehicleType, licenseNumber } = req.body;

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

    const employeeData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'employee',
      department: department || '',
      isActive: true,
      createdBy: adminUser._id,
      createdAt: new Date()
    };

    // Add location-specific fields for delivery agents
    if (role === 'delivery') {
      if (currentLocation) {
        employeeData.currentLocation = currentLocation;
      }
      employeeData.maxDeliveryRadius = maxDeliveryRadius || 10;
      employeeData.vehicleType = vehicleType || 'bike';
      employeeData.licenseNumber = licenseNumber || '';
      employeeData.isAvailable = true;
    }

    const employee = new Seller(employeeData);

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
              
              <a href="\${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to Dashboard</a>
              
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

      // Create transporter inside the route handler
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });

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
      role: { $in: ['employee', 'manager', 'supervisor', 'delivery'] }
    }).select('-password').sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Add delivery personnel (same flow as add-employee but role defaults to 'delivery')
router.post('/add-delivery', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const exists = await Seller.findOne({ email });
    if (exists) return res.status(400).json({ error: 'User with this email already exists' });
    const existsUser = await User.findOne({ email });
    if (existsUser) return res.status(400).json({ error: 'Email already exists in the system' });

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const delivery = new Seller({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'delivery',
      isActive: true,
      createdBy: req.user._id,
      createdAt: new Date()
    });

    const saved = await delivery.save();

    try {
      const emailHTML = `
        <html><body>
          <h2>Welcome to HerbTrade Delivery</h2>
          <p>Your delivery account has been created.</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Password:</b> ${password}</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">Login</a>
        </body></html>
      `;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@herbtrade.com',
        to: email,
        subject: 'Your HerbTrade Delivery Account',
        html: emailHTML
      });
    } catch (e) {
      console.error('Email send failed (add-delivery):', e.message);
    }

    res.json({
      success: true,
      message: 'Delivery user added successfully',
      delivery: {
        id: saved._id,
        name: saved.name,
        email: saved.email,
        role: saved.role,
        isActive: saved.isActive,
        createdAt: saved.createdAt
      }
    });
  } catch (error) {
    console.error('Error adding delivery user:', error);
    res.status(500).json({ error: 'Failed to add delivery user', details: error.message });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get nearest available delivery agents for an order
router.get('/orders/:orderId/nearest-deliveries', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!order.deliveryLocation || !order.deliveryLocation.coordinates) {
      return res.status(400).json({ error: 'Order delivery location not set' });
    }

    const [orderLon, orderLat] = order.deliveryLocation.coordinates;

    // Find all available delivery agents
    const deliveries = await Seller.find({
      role: 'delivery',
      isActive: true,
      isAvailable: true
    });

    // Calculate distances and sort by proximity
    const deliveriesWithDistance = deliveries.map(delivery => {
      const [deliveryLon, deliveryLat] = delivery.currentLocation.coordinates;
      const distance = calculateDistance(orderLat, orderLon, deliveryLat, deliveryLon);

      return {
        ...delivery.toObject(),
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        isInServiceArea: delivery.maxDeliveryRadius >= distance
      };
    });

    // Sort by distance and filter by service area
    const sortedDeliveries = deliveriesWithDistance
      .filter(d => d.isInServiceArea)
      .sort((a, b) => a.distance - b.distance);

    res.json(sortedDeliveries);
  } catch (error) {
    console.error('Error finding nearest deliveries:', error);
    res.status(500).json({ error: 'Failed to find nearest delivery agents' });
  }
});

// Auto-assign order to nearest available delivery agent
router.post('/orders/:orderId/auto-assign-delivery', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.deliveryAssignee) {
      return res.status(400).json({ error: 'Order already assigned' });
    }

    if (!order.deliveryLocation || !order.deliveryLocation.coordinates) {
      return res.status(400).json({ error: 'Order delivery location not set' });
    }

    const [orderLon, orderLat] = order.deliveryLocation.coordinates;

    // Find nearest available delivery agent
    const deliveries = await Seller.find({
      role: 'delivery',
      isActive: true,
      isAvailable: true
    });

    let nearestDelivery = null;
    let minDistance = Infinity;

    for (const delivery of deliveries) {
      const [deliveryLon, deliveryLat] = delivery.currentLocation.coordinates;
      const distance = calculateDistance(orderLat, orderLon, deliveryLat, deliveryLon);

      if (distance <= delivery.maxDeliveryRadius && distance < minDistance) {
        minDistance = distance;
        nearestDelivery = delivery;
      }
    }

    if (!nearestDelivery) {
      return res.status(404).json({ error: 'No available delivery agent found in service area' });
    }

    // Assign the order
    order.deliveryAssignee = nearestDelivery._id;
    order.deliveryStatus = 'assigned';
    order.status = 'confirmed'; // Auto-confirm order when delivery agent is assigned
    order.deliveryEvents = order.deliveryEvents || [];
    order.deliveryEvents.push({
      status: 'assigned',
      message: `Auto-assigned to ${nearestDelivery.name} (${minDistance.toFixed(2)} km away)`
    });
    await order.save();

    // Send assignment email
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });
      const emailHTML = `
        <html><body>
          <h2>New Delivery Auto-Assigned</h2>
          <p>Hi ${nearestDelivery.name}, a new order has been automatically assigned to you.</p>
          <p><b>Order:</b> #${String(order._id).slice(-6).toUpperCase()}</p>
          <p><b>Distance:</b> ${minDistance.toFixed(2)} km</p>
          <p><b>Status:</b> ${order.status}</p>
          <p>Please check your Delivery Dashboard for details.</p>
        </body></html>
      `;
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@herbtrade.com',
        to: nearestDelivery.email,
        subject: 'New Delivery Auto-Assignment - HerbTrade',
        html: emailHTML
      });
    } catch (e) {
      console.error('Assignment email error:', e.message);
    }

    res.json({
      message: 'Order auto-assigned successfully',
      delivery: nearestDelivery,
      distance: minDistance,
      order
    });
  } catch (error) {
    console.error('Error auto-assigning delivery:', error);
    res.status(500).json({ error: 'Failed to auto-assign delivery' });
  }
});

// Assign an order to a delivery user
router.post('/orders/:orderId/assign-delivery', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deliveryId } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const delivery = await Seller.findById(deliveryId);
    if (!delivery || delivery.role !== 'delivery') {
      return res.status(400).json({ error: 'Invalid delivery user' });
    }

    // Calculate distance if both locations are available
    let distance = null;
    if (order.deliveryLocation && order.deliveryLocation.coordinates &&
      delivery.currentLocation && delivery.currentLocation.coordinates) {
      const [orderLon, orderLat] = order.deliveryLocation.coordinates;
      const [deliveryLon, deliveryLat] = delivery.currentLocation.coordinates;
      distance = calculateDistance(orderLat, orderLon, deliveryLat, deliveryLon);
    }

    order.deliveryAssignee = delivery._id;
    order.deliveryStatus = 'assigned';
    order.status = 'confirmed'; // Auto-confirm order when delivery agent is assigned
    order.deliveryEvents = order.deliveryEvents || [];
    order.deliveryEvents.push({
      status: 'assigned',
      message: `Assigned to ${delivery.name}${distance ? ` (${distance.toFixed(2)} km away)` : ''}`
    });
    await order.save();

    // Send assignment email to delivery person
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });
      const emailHTML = `
        <html><body>
          <h2>New Delivery Assigned</h2>
          <p>Hi ${delivery.name}, a new order has been assigned to you.</p>
          <p><b>Order:</b> #${String(order._id).slice(-6).toUpperCase()}</p>
          <p><b>Status:</b> ${order.status}</p>
          <p>Please check your Delivery Dashboard for details.</p>
        </body></html>
      `;
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@herbtrade.com',
        to: delivery.email,
        subject: 'New Delivery Assignment - HerbTrade',
        html: emailHTML
      });
    } catch (e) {
      console.error('Assignment email error:', e.message);
    }

    res.json({ message: 'Order assigned to delivery', order });
  } catch (error) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// Toggle employee status (enable/disable)
router.put('/employees/:employeeId/toggle-status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const employee = await Seller.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Toggle the isActive status
    employee.isActive = !employee.isActive;
    await employee.save();

    res.json({
      success: true,
      message: `Employee ${employee.isActive ? 'enabled' : 'disabled'} successfully`,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        isActive: employee.isActive,
        role: employee.role,
        department: employee.department
      }
    });
  } catch (error) {
    console.error('Error toggling employee status:', error);
    res.status(500).json({
      error: 'Failed to toggle employee status',
      details: error.message
    });
  }
});

// Update employee details
router.put('/employees/:employeeId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email, role, department } = req.body;

    const employee = await Seller.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Seller.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: req.params.employeeId }
      });
      if (existingEmployee) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase().trim()
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists in the system' });
      }
    }

    // Update employee fields
    if (name) employee.name = name.trim();
    if (email) employee.email = email.toLowerCase().trim();
    if (role) employee.role = role;
    if (department !== undefined) employee.department = department;
    employee.updatedAt = new Date();

    const updatedEmployee = await employee.save();

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: {
        id: updatedEmployee._id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        role: updatedEmployee.role,
        department: updatedEmployee.department,
        isActive: updatedEmployee.isActive,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      error: 'Failed to update employee',
      details: error.message
    });
  }
});

// Disable employee (legacy endpoint - use toggle-status instead)
router.put('/employees/:employeeId/disable', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const employee = await Seller.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.isActive = false;
    await employee.save();

    res.json({
      success: true,
      message: 'Employee disabled successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        isActive: employee.isActive,
        role: employee.role,
        department: employee.department
      }
    });
  } catch (error) {
    console.error('Error disabling employee:', error);
    res.status(500).json({
      error: 'Failed to disable employee',
      details: error.message
    });
  }
});
router.get('/users', auth, async (req, res) => {
  try {
    // Allow admin and wellness_coach roles to access users
    if (req.user.role !== 'admin' && req.user.role !== 'wellness_coach') {
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

    const [totalUsers, totalSellers, totalEmployees, orders] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Seller.countDocuments({ role: 'seller' }),
      Seller.countDocuments({ role: { $in: ['employee', 'manager', 'supervisor'] } }),
      Order.find({})
    ]);

    const totalRevenue = orders.reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0);
    const ordersToday = orders.filter(o => {
      const d = new Date(o.orderDate || o.createdAt || 0);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;

    // --- Analytics Data Generation ---
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueOverTime = last7Days.map(date => {
      const dayOrders = orders.filter(o => (o.orderDate || o.createdAt || '').startsWith(date));
      return {
        date,
        revenue: dayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
      };
    });

    const ordersOverTime = last7Days.map(date => {
      const dayOrders = orders.filter(o => (o.orderDate || o.createdAt || '').startsWith(date));
      return {
        date,
        orders: dayOrders.length
      };
    });

    const statusCounts = orders.reduce((acc, o) => {
      const status = o.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const orderStatusDist = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const stats = {
      totalUsers,
      totalSellers,
      totalEmployees,
      totalRevenue,
      ordersToday,
      revenueOverTime,
      ordersOverTime,
      orderStatusDist
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

    // Fetch all orders including cancelled ones
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .populate('deliveryAssignee', 'name email')
      .sort({ orderDate: -1 });

    console.log(`Admin orders fetch: Found ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// List delivery users
router.get('/deliveries', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const deliveries = await Seller.find({ role: 'delivery' }).select('-password').sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Approve an order (set confirmed)
router.patch('/orders/:orderId/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'confirmed';
    await order.save();
    await order.populate('user', 'name email');
    res.json({ message: 'Order approved', order });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// Update order status (admin)
router.patch('/orders/:orderId/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = status;
    if (status === 'delivered') order.deliveryDate = new Date();
    await order.save();
    res.json({ message: 'Status updated', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get all hospital bookings for admin
router.get('/hospital-bookings', auth, async (req, res) => {
  try {
    console.log('Fetching hospital bookings for admin...');
    console.log('User making request:', req.user);

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const bookings = await HospitalBooking.find({})
      .populate('userId', 'name email')
      .populate('hospitalId', 'name address phone')
      .sort({ createdAt: -1 });

    console.log('Found bookings:', bookings.length);
    if (bookings.length > 0) {
      console.log('Sample booking:', JSON.stringify(bookings[0], null, 2));
    }

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching hospital bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospital bookings',
      details: error.message
    });
  }
});

// Test route to check if HospitalBooking data exists
router.get('/test-bookings', auth, async (req, res) => {
  try {
    const count = await HospitalBooking.countDocuments();
    const allBookings = await HospitalBooking.find({}).limit(5);

    res.json({
      message: 'Test route working',
      totalBookings: count,
      sampleBookings: allBookings
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple test route without auth
router.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('HospitalBooking model:', HospitalBooking);

    const count = await HospitalBooking.countDocuments();
    console.log('Total bookings count:', count);

    const sample = await HospitalBooking.findOne();
    console.log('Sample booking:', sample);

    const allBookings = await HospitalBooking.find({}).limit(3);
    console.log('All bookings (first 3):', allBookings);

    res.json({
      message: 'Database test successful',
      totalBookings: count,
      sampleBooking: sample,
      allBookings: allBookings,
      modelName: HospitalBooking.modelName,
      collectionName: HospitalBooking.collection.name
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Update hospital booking status (approve/reject)
router.patch('/hospital-bookings/:id/status', auth, async (req, res) => {
  try {
    const { bookingStatus } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rescheduled'];

    if (!validStatuses.includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status'
      });
    }

    const booking = await HospitalBooking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus, updatedAt: new Date() },
      { new: true }
    ).populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Send confirmation email if confirmed
    if (bookingStatus === 'Confirmed') {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const emailHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; background: #f8f6f0; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 15px; margin: 20px 0; border-left: 5px solid #10B981; }
              .footer { background: #f8f6f0; padding: 20px; text-align: center; color: #666; }
              .button { display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌿 HerbTrade</h1>
                <p>Hospital Booking Confirmed</p>
              </div>
              <div class="content">
                <p>Dear ${booking.userId?.name || 'User'},</p>
                <p>Your hospital appointment has been <strong>confirmed</strong>. Here are the details:</p>
                <div class="details">
                  <p><strong>Hospital:</strong> ${booking.hospitalDetails?.name || 'N/A'}</p>
                  <p><strong>Doctor:</strong> ${booking.appointmentDetails?.doctorName || 'N/A'}</p>
                  <p><strong>Date:</strong> ${booking.appointmentDetails?.appointmentDate ? new Date(booking.appointmentDetails.appointmentDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Time:</strong> ${booking.appointmentDetails?.appointmentTime || 'N/A'}</p>
                </div>
                <p>Please arrive 10 minutes early and bring any relevant medical records.</p>
                <div style="text-align:center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/view-bookings" class="button">View Booking</a>
                </div>
              </div>
              <div class="footer">
                <p>© 2024 HerbTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: booking.userId?.email,
          subject: 'Your Hospital Booking is Confirmed - HerbTrade',
          html: emailHTML
        });
      } catch (emailErr) {
        console.error('Error sending booking confirmation email:', emailErr.message);
      }
    }

    res.json({
      success: true,
      message: `Booking ${bookingStatus.toLowerCase()} successfully`,
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking status'
    });
  }
});

// Update hospital booking details
router.put('/hospital-bookings/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientDetails, appointmentDetails, bookingStatus } = req.body;

    const booking = await HospitalBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking fields
    if (patientDetails) {
      booking.patientDetails = { ...booking.patientDetails, ...patientDetails };
    }
    if (appointmentDetails) {
      booking.appointmentDetails = { ...booking.appointmentDetails, ...appointmentDetails };
    }
    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;
    }
    booking.updatedAt = new Date();

    const updatedBooking = await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      error: 'Failed to update booking',
      details: error.message
    });
  }
});

// Test route for debugging
router.get('/test-delete/:id', (req, res) => {
  console.log('Test route called with ID:', req.params.id);
  res.json({ message: 'Test route working', id: req.params.id });
});

// Delete hospital booking
router.delete('/hospital-bookings/:id', auth, async (req, res) => {
  try {
    console.log('DELETE /hospital-bookings/:id called with ID:', req.params.id);

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if the ID is a valid MongoDB ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({
        error: 'Invalid booking ID format',
        message: 'This appears to be demo data. In a real application, bookings would have valid database IDs.'
      });
    }

    const booking = await HospitalBooking.findById(req.params.id);
    if (!booking) {
      console.log('Booking not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Booking not found' });
    }

    await HospitalBooking.findByIdAndDelete(req.params.id);
    console.log('Booking deleted successfully:', req.params.id);

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      error: 'Failed to delete booking',
      details: error.message
    });
  }
});

// Notification Schema (in-memory for now, should be moved to a separate model)
let notifications = [];

// Get all appointments for admin
router.get('/appointments', auth, async (req, res) => {
  try {
    const hospitals = await Hospital.find({});
    let allAppointments = [];

    hospitals.forEach(hospital => {
      if (hospital.appointments && hospital.appointments.length > 0) {
        const hospitalAppointments = hospital.appointments.map(appointment => ({
          ...appointment.toObject(),
          hospitalName: hospital.name,
          hospitalId: hospital._id
        }));
        allAppointments.push(...hospitalAppointments);
      }
    });

    // Sort by creation date (newest first)
    allAppointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get notifications for admin
router.get('/notifications', auth, async (req, res) => {
  try {
    // Get recent appointments (last 24 hours) as notifications
    const hospitals = await Hospital.find({});
    let recentAppointments = [];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    hospitals.forEach(hospital => {
      if (hospital.appointments && hospital.appointments.length > 0) {
        const recent = hospital.appointments.filter(appointment =>
          new Date(appointment.createdAt) > yesterday && appointment.status === 'pending'
        );

        recent.forEach(appointment => {
          recentAppointments.push({
            _id: appointment._id,
            title: 'New Appointment Booking',
            message: `${appointment.patientDetails.name} booked an appointment with Dr. ${appointment.doctor.name} at ${hospital.name}`,
            type: 'appointment',
            appointmentId: appointment._id,
            hospitalId: hospital._id,
            createdAt: appointment.createdAt,
            read: false
          });
        });
      }
    });

    // Sort by creation date (newest first)
    recentAppointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadCount = recentAppointments.filter(notif => !notif.read).length;

    res.json({
      notifications: recentAppointments,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    // In a real implementation, you would update the notification in the database
    // For now, we'll just return success
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/notifications/mark-all-read', auth, async (req, res) => {
  try {
    // In a real implementation, you would update all notifications in the database
    // For now, we'll just return success
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Leave Management Routes for Admin

// Get all leave applications
router.get('/leaves', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const leaves = await Leave.find()
      .populate('seller', 'name email role department')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
});

// Approve/Reject leave application
router.put('/leaves/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { status, adminComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    }

    const leave = await Leave.findById(req.params.id).populate('seller', 'name email');
    if (!leave) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    leave.status = status;
    leave.adminComment = adminComment || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();

    await leave.save();

    // Send email notification to seller
    try {
      const smtpUser = process.env.EMAIL_USER || 'helanantony03@gmail.com';
      const smtpPass = process.env.EMAIL_PASS || 'vwwxdszgvdsztvze';
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      try {
        await transporter.verify();
        console.log('SMTP ready for leave status emails');
      } catch (verErr) {
        console.error('SMTP verification failed for leave emails:', verErr.message);
      }

      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const statusColor = status === 'approved' ? '#10B981' : '#EF4444';

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #f8f6f0; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; background: ${statusColor}; }
            .details-box { background: #f8f9fa; padding: 20px; border-radius: 15px; margin: 20px 0; border-left: 5px solid ${statusColor}; }
            .footer { background: #f8f6f0; padding: 20px; text-align: center; color: #666; }
            .button { display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌿 HerbTrade AI</h1>
              <p>Leave Management System</p>
            </div>
            <div class="content">
              <h2>Leave Application Update</h2>
              <p><strong>Dear ${leave.seller.name},</strong></p>
              <p>Your leave application has been:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span class="status-badge">${status.toUpperCase()}</span>
              </div>
              
              <div class="details-box">
                <h3 style="margin: 0 0 15px 0; color: #333;">📋 Leave Details:</h3>
                <p><strong>🏷️ Type:</strong> ${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}</p>
                <p><strong>📅 Duration:</strong> ${leave.startDate.toLocaleDateString()} - ${leave.endDate.toLocaleDateString()}</p>
                <p><strong>📝 Reason:</strong> ${leave.reason}</p>
                <p><strong>📄 Description:</strong> ${leave.description}</p>
                ${adminComment ? `<p><strong>💬 Admin Comment:</strong> ${adminComment}</p>` : ''}
                <p><strong>⏰ Reviewed On:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              ${status === 'approved' ?
          '<p style="color: #10B981; font-weight: bold;">✅ Your leave has been approved. Please plan accordingly and ensure proper handover of your responsibilities.</p>' :
          '<p style="color: #EF4444; font-weight: bold;">❌ Your leave application has been rejected. Please contact your supervisor for more details.</p>'
        }
              
              <p>If you have any questions or need clarification, please contact the admin team or your supervisor.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/seller-dashboard?tab=leaves" class="button">View Leave Status</a>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 HerbTrade AI. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
              <p>📧 For support, contact: ${process.env.EMAIL_USER}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: smtpUser,
        to: leave.seller.email,
        subject: `🌿 Leave Application ${statusText} - HerbTrade AI`,
        html: emailHTML
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Leave ${status} email sent successfully to ${leave.seller.email} (messageId: ${info.messageId})`);
    } catch (emailError) {
      console.error('❌ Error sending email notification:', emailError.message);
      // Don't fail the request if email fails, but log the error
    }

    res.json({
      message: `Leave application ${status} successfully. Email notification sent to ${leave.seller.email}.`,
      leave
    });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

// Get leave statistics
router.get('/leaves/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const stats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Leave.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    res.json({
      totalLeaves,
      pendingLeaves,
      statusStats: stats,
      typeStats: typeStats
    });
  } catch (error) {
    console.error('Error fetching leave stats:', error);
    res.status(500).json({ error: 'Failed to fetch leave statistics' });
  }
});

// Update delivery agent location
router.put('/deliveries/:deliveryId/location', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { latitude, longitude, serviceAreas, maxDeliveryRadius, vehicleType, licenseNumber } = req.body;

    const delivery = await Seller.findById(req.params.deliveryId);
    if (!delivery || delivery.role !== 'delivery') {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    if (latitude && longitude) {
      delivery.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    if (serviceAreas) {
      delivery.serviceAreas = serviceAreas;
    }

    if (maxDeliveryRadius) {
      delivery.maxDeliveryRadius = maxDeliveryRadius;
    }

    if (vehicleType) {
      delivery.vehicleType = vehicleType;
    }

    if (licenseNumber) {
      delivery.licenseNumber = licenseNumber;
    }

    await delivery.save();

    res.json({
      message: 'Delivery agent location updated successfully',
      delivery: {
        id: delivery._id,
        name: delivery.name,
        currentLocation: delivery.currentLocation,
        serviceAreas: delivery.serviceAreas,
        maxDeliveryRadius: delivery.maxDeliveryRadius,
        vehicleType: delivery.vehicleType,
        licenseNumber: delivery.licenseNumber
      }
    });
  } catch (error) {
    console.error('Error updating delivery location:', error);
    res.status(500).json({ error: 'Failed to update delivery location' });
  }
});

// Toggle delivery agent availability
router.put('/deliveries/:deliveryId/availability', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const delivery = await Seller.findById(req.params.deliveryId);
    if (!delivery || delivery.role !== 'delivery') {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    delivery.isAvailable = !delivery.isAvailable;
    await delivery.save();

    res.json({
      success: true,
      message: `Delivery agent ${delivery.isAvailable ? 'marked as available' : 'marked as unavailable'}`,
      delivery: {
        id: delivery._id,
        name: delivery.name,
        email: delivery.email,
        isAvailable: delivery.isAvailable
      }
    });
  } catch (error) {
    console.error('Error toggling delivery availability:', error);
    res.status(500).json({ error: 'Failed to toggle delivery availability' });
  }
});

module.exports = router;

