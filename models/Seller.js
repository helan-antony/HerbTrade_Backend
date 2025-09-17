const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },
  role: { type: String, enum: ['seller', 'employee', 'manager', 'supervisor', 'delivery'], default: 'seller' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  lastLogin: { type: Date },
  // Payroll settings
  baseSalary: { type: Number, default: 0 }, // monthly base salary
  paidLeavesPerMonth: { type: Number, default: 0 },
  deductionMode: { type: String, enum: ['perDay'], default: 'perDay' },
  // Location fields for delivery agents
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  serviceAreas: [{
    name: String, // Area name like "Downtown", "North Zone"
    coordinates: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: [[[Number]]] // Array of polygon coordinates
    },
    radius: { type: Number, default: 5 } // Service radius in km
  }],
  maxDeliveryRadius: { type: Number, default: 10 }, // Maximum delivery radius in km
  isAvailable: { type: Boolean, default: true }, // Whether delivery agent is available for new assignments
  vehicleType: { type: String, enum: ['bike', 'scooter', 'car', 'van'], default: 'bike' },
  licenseNumber: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  createdAt: { type: Date, default: Date.now }
});

// Add geospatial index for location-based queries
sellerSchema.index({ currentLocation: '2dsphere' });
sellerSchema.index({ 'serviceAreas.coordinates': '2dsphere' });

module.exports = mongoose.model('Seller', sellerSchema); 
