const mongoose = require('mongoose');

const wellnessProgramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WellnessCoach',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  goals: [{
    type: String,
    trim: true
  }],
  dailyTasks: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['diet', 'exercise', 'meditation', 'lifestyle', 'herbs'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    youtubeVideoUrl: {
      type: String,
      trim: true
    }
  }],
  weeklyMilestones: [{
    week: {
      type: Number,
      required: true
    },
    goal: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    achieved: {
      type: Boolean,
      default: false
    }
  }],
  recommendations: [{
    category: {
      type: String,
      enum: ['diet', 'exercise', 'lifestyle', 'herbs'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    items: [{
      type: String,
      trim: true
    }]
  }],
  progress: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dailyGoals: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    weeklyMilestones: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
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
wellnessProgramSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WellnessProgram', wellnessProgramSchema);