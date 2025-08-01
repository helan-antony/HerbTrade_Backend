const mongoose = require('mongoose');

const discussionReplySchema = new mongoose.Schema({
  discussion: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discussion', 
    required: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  parentReply: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DiscussionReply',
    default: null
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
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

// Index for better performance
discussionReplySchema.index({ discussion: 1, createdAt: 1 });
discussionReplySchema.index({ author: 1 });

module.exports = mongoose.model('DiscussionReply', discussionReplySchema);
