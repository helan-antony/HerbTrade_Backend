const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'seasonal', 'specific_condition', 'wellness_tips'],
    default: 'general'
  },
  author: {
    type: String,
    default: 'HerbTrade Health Team'
  },
  publishedDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  // Wellness Program specific fields
  programType: {
    type: String,
    enum: ['newsletter'],
    default: 'newsletter'
  },
  programName: {
    type: String,
    trim: true
  },
  programDescription: {
    type: String
  },
  programCategory: {
    type: String,
    enum: ['stress-management', 'sleep-hygiene', 'weight-loss', 'fitness', 'nutrition', 'mindfulness', 'detox', 'general-wellness']
  },
  programDuration: {
    type: Number
  },
  programDifficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  programStartDate: {
    type: Date
  },
  programEndDate: {
    type: Date
  },
  programGoals: [{
    type: String,
    trim: true
  }],
  programTargetAudience: [{
    type: String,
    trim: true
  }],
  programPrerequisites: [{
    type: String,
    trim: true
  }],
  programBenefits: [{
    type: String,
    trim: true
  }],
  programDailyTasks: [{
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
  programWeeklyMilestones: [{
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
  programStatus: {
    type: String,
    enum: ['draft', 'published', 'archived', 'active'],
    default: 'draft'
  },
  programAssignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  programCoachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Post-enrollment data
  postEnrollmentData: [{
    type: {
      type: String,
      enum: ['video', 'article', 'resource', 'tip', 'exercise', 'recipe'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    url: {
      type: String,
      trim: true
    },
    duration: {
      type: String
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    tags: [{
      type: String,
      trim: true
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  enrolledUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  // User progress tracking
  userProgress: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contentProgress: [{
      contentId: {
        type: String,
        required: true
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completed: {
        type: Boolean,
        default: false
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('Newsletter', newsletterSchema);