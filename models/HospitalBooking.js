const mongoose = require('mongoose');

const hospitalBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  patientDetails: {
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  appointmentDetails: {
    doctorName: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    appointmentTime: {
      type: String,
      required: true
    },
    consultationType: {
      type: String,
      enum: ['In-Person', 'Online', 'Phone'],
      default: 'In-Person'
    }
  },
  medicalInfo: {
    symptoms: {
      type: String,
      required: true
    },
    medicalHistory: String,
    currentMedications: String,
    allergies: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String
    }
  },
  bookingStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rescheduled'],
    default: 'Pending'
  },
  paymentDetails: {
    consultationFee: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Net Banking'],
      default: 'Cash'
    },
    transactionId: String
  },
  hospitalDetails: {
    name: String,
    address: String,
    phone: String,
    email: String
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
hospitalBookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
hospitalBookingSchema.index({ userId: 1 });
hospitalBookingSchema.index({ hospitalId: 1 });
hospitalBookingSchema.index({ bookingStatus: 1 });
hospitalBookingSchema.index({ 'appointmentDetails.appointmentDate': 1 });

module.exports = mongoose.model('HospitalBooking', hospitalBookingSchema);