const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },
  role: { type: String, enum: ['user', 'seller', 'hospital', 'admin', 'employee', 'manager', 'supervisor', 'delivery', 'wellness_coach'], default: 'user' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  newsletterSubscribed: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  address: { type: String, default: '' },
  externalLogin: { type: String, enum: ['google', 'facebook', 'apple'], default: null },
  emailVerified: { type: Boolean, default: false },
  providerId: { type: String, default: '' },
  app: { type: String, default: 'herbtrade' }
});

module.exports = mongoose.model('User', userSchema);