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
  }]
});

module.exports = mongoose.model('Newsletter', newsletterSchema);