const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Seller = require('../models/Seller');
const auth = require('../middleware/auth');
const router = express.Router();

// Test endpoint to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// Nodemailer will be configured inside the route handlers

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    let isFromSellerCollection = false;
    
    if (!user) {
      user = await Seller.findOne({ email });
      isFromSellerCollection = true;
    }
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        collection: isFromSellerCollection ? 'sellers' : 'users'
      }, 
      'your-secret-key', 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        department: user.department || '',
        profilePic: user.profilePic || ''
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/google-login', async (req, res) => {
  const { name, email, picture, googleId, emailVerified } = req.body;
  
  try {
    console.log('🔍 Google login attempt for:', email);
    
    // Validate required fields
    if (!name || !email || !googleId) {
      return res.status(400).json({ 
        error: 'Missing required fields from Google authentication' 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log('👤 Creating new user for Google login:', email);
      
      // Create new user
      user = new User({
        name,
        email,
        password: await bcrypt.hash(googleId, 10), // Use googleId as password hash
        profilePic: picture || '',
        externalLogin: 'google',
        emailVerified: emailVerified || false,
        role: 'user' // Default role
      });
      
      await user.save();
      console.log('✅ New Google user created successfully');
    } else {
      console.log('👤 Existing user found for Google login:', email);
      
      // Update user info if needed
      let updated = false;
      if (user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (picture && user.profilePic !== picture) {
        user.profilePic = picture;
        updated = true;
      }
      if (!user.externalLogin) {
        user.externalLogin = 'google';
        updated = true;
      }
      
      if (updated) {
        await user.save();
        console.log('📝 User info updated from Google');
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, 
        collection: 'users' 
      }, 
      'your-secret-key', 
      { expiresIn: '24h' }
    );

    console.log('🎫 JWT token generated for Google user');

    // Return success response
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        profilePic: user.profilePic || '',
        department: user.department || ''
      } 
    });

  } catch (err) {
    console.error('❌ Google login error:', err);
    res.status(500).json({ 
      error: 'Google authentication failed', 
      details: err.message 
    });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, phone, password, profilePic } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, phone, password: hash, profilePic });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, collection: 'users' }, 'your-secret-key', { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePic: user.profilePic } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



router.post('/add-seller', async (req, res) => {
  const { name, email, phone, password, profilePic } = req.body;
  try {
    const existing = await Seller.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Seller already exists' });
    const hash = await bcrypt.hash(password, 10);
    const seller = new Seller({ name, email, phone, password: hash, profilePic, role: 'seller' });
    await seller.save();
    res.status(201).json({ message: 'Seller added', seller });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/profile', async (req, res) => {
  const { name, phone, profilePic, email } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await Seller.findOne({ email });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.profilePic = profilePic || user.profilePic;
    
    await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePic: user.profilePic } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    console.log('🔄 Forgot password request for:', email);

    // Check if user exists in User collection
    let user = await User.findOne({ email });
    let isFromSellerCollection = false;

    // If not found in User collection, check Seller collection
    if (!user) {
      user = await Seller.findOne({ email });
      isFromSellerCollection = true;
    }

    console.log('User found:', user ? 'Yes' : 'No');

    // For security, always return success message even if user doesn't exist
    if (!user) {
      return res.status(200).json({
        message: 'If this email address exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        collection: isFromSellerCollection ? 'sellers' : 'users'
      },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    // Create reset URL
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    console.log('📧 Attempting to send email...');

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'helanantony03@gmail.com',
        pass: 'vwwxdszgvdsztvze'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email content
    const mailOptions = {
      from: 'helanantony03@gmail.com',
      to: email,
      subject: 'Password Reset - HerbTrade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0;">HerbTrade</h1>
            <p style="color: #6b7280; margin: 5px 0;">Natural Healing Made Simple</p>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Hello ${user.name},
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              We received a request to reset your password for your HerbTrade account.
              Click the button below to reset your password:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background: linear-gradient(to right, #059669, #0d9488);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>



            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>© 2024 HerbTrade. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);

    res.status(200).json({
      message: 'If this email address exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to send reset email',
      details: error.message
    });
  }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, 'your-secret-key');

    // Find user based on collection info from token
    let user;
    if (decoded.collection === 'sellers') {
      user = await Seller.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change Password Route (for authenticated users)
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get the user with password field (since middleware excludes it)
    let userWithPassword;
    
    // Check if user is a seller or regular user based on the role
    if (['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      userWithPassword = await Seller.findById(req.user._id);
    } else {
      userWithPassword = await User.findById(req.user._id);
    }

    if (!userWithPassword) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    userWithPassword.password = hashedPassword;
    await userWithPassword.save();

    res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
