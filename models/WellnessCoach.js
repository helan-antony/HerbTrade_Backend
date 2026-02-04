const mongoose = require('mongoose');

const wellnessCoachSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  qualifications: [{
    type: String,
    trim: true
  }],
  specializations: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  certifications: [{
    name: { type: String, required: true },
    issuingBody: { type: String, required: true },
    date: { type: Date },
    validUntil: { type: Date }
  }],
  consultationMethods: [{
    type: String,
    enum: ['in-person', 'video', 'phone', 'chat'],
    default: ['video']
  }],
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  languages: [{
    type: String,
    trim: true
  }],
  availability: {
    monday: {
      start: String,
      end: String
    },
    tuesday: {
      start: String,
      end: String
    },
    wednesday: {
      start: String,
      end: String
    },
    thursday: {
      start: String,
      end: String
    },
    friday: {
      start: String,
      end: String
    },
    saturday: {
      start: String,
      end: String
    },
    sunday: {
      start: String,
      end: String
    }
  },
  clients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    }
  }],
  newsletterPrograms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newsletter'
  }],
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
wellnessCoachSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WellnessCoach', wellnessCoachSchema);