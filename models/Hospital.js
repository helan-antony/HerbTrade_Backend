const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: String,
  phone: String,
  email: String,
  website: String,
  specialties: [String],
  doctors: [{
    name: String,
    specialty: String,
    phone: String,
    email: String,
    experience: Number,
    consultationFee: Number,
    qualifications: [String]
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    createdAt: { type: Date, default: Date.now }
  }],
  facilities: [String],
  workingHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String
  },
  appointments: [{
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctor: {
      id: String,
      name: String,
      specialty: String
    },
    hospital: {
      id: String,
      name: String,
      address: String,
      phone: String
    },
    appointmentDate: Date,
    appointmentTime: String,
    reason: String,
    patientDetails: {
      name: String,
      phone: String,
      email: String
    },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  pincode: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);