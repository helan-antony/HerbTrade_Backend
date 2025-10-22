const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Debug information
    console.log('Token decoded:', decoded);
    
    let user;
    if (decoded.collection === 'sellers') {
      user = await Seller.findById(decoded.id).select('-password');
    } else {
      user = await User.findById(decoded.id).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    
    // Debug information
    console.log('User found:', {
      id: user._id,
      role: user.role,
      collection: decoded.collection
    });
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};