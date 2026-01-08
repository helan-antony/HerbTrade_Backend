const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },
  externalLogin: { type: String, default: '' },
  providerId: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  app: { type: String, default: 'herbtrade' },
  role: { type: String, enum: ['user', 'seller', 'hospital', 'admin', 'employee', 'manager', 'supervisor', 'delivery'], default: 'user' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  country: { type: String, default: 'India' }
});

module.exports = mongoose.model('User', userSchema); 
