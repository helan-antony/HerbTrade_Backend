const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: {
    type: String,
    enum: ['general', 'herbs', 'health', 'recipes', 'experiences', 'questions', 'research'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  views: { 
    type: Number, 
    default: 0 
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
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

// Index for better search performance
discussionSchema.index({ title: 'text', content: 'text', tags: 'text' });
discussionSchema.index({ category: 1, createdAt: -1 });
discussionSchema.index({ lastActivity: -1 });

// Virtual for reply count
discussionSchema.virtual('replyCount', {
  ref: 'DiscussionReply',
  localField: '_id',
  foreignField: 'discussion',
  count: true
});

// Ensure virtual fields are serialized
discussionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Discussion', discussionSchema);
