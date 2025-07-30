const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');
const auth = require('../middleware/auth');
const router = express.Router();

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
  const { name, email, picture, googleId } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        password: await bcrypt.hash(googleId, 10),
        profilePic: picture,
        externalLogin: 'google'
      });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, role: user.role, collection: 'users' }, 'your-secret-key', { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePic: user.profilePic } });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

module.exports = router; 


