const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },
  role: { type: String, enum: ['seller', 'employee', 'manager', 'supervisor'], default: 'seller' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Seller', sellerSchema); 
