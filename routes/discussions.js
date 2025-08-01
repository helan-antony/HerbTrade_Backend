const express = require('express');
const Discussion = require('../models/Discussion');
const DiscussionReply = require('../models/DiscussionReply');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all discussions with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const discussions = await Discussion.find(query)
      .populate('author', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get reply counts for each discussion
    const discussionsWithCounts = await Promise.all(
      discussions.map(async (discussion) => {
        const replyCount = await DiscussionReply.countDocuments({ 
          discussion: discussion._id 
        });
        return {
          ...discussion,
          replyCount
        };
      })
    );

    const total = await Discussion.countDocuments(query);

    res.json({
      discussions: discussionsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
});

// Get single discussion with replies
router.get('/:id', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name email');

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Increment view count
    discussion.views += 1;
    await discussion.save();

    // Get replies with nested structure
    const replies = await DiscussionReply.find({ 
      discussion: req.params.id,
      parentReply: null 
    })
    .populate('author', 'name email')
    .sort({ createdAt: 1 });

    const repliesWithNested = await Promise.all(
      replies.map(async (reply) => {
        const nestedReplies = await DiscussionReply.find({ 
          parentReply: reply._id 
        })
        .populate('author', 'name email')
        .sort({ createdAt: 1 });
        
        return {
          ...reply.toObject(),
          replies: nestedReplies
        };
      })
    );

    res.json({
      ...discussion.toObject(),
      replies: repliesWithNested
    });
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ error: 'Failed to fetch discussion' });
  }
});

// Create new discussion
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be less than 200 characters' });
    }

    // Process tags
    const processedTags = tags ? 
      tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag) : 
      [];

    const discussion = new Discussion({
      title: title.trim(),
      content: content.trim(),
      author: req.user.id,
      category: category || 'general',
      tags: processedTags
    });

    await discussion.save();
    await discussion.populate('author', 'name email');

    res.status(201).json(discussion);
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ error: 'Failed to create discussion' });
  }
});

// Like/Unlike discussion
router.post('/:id/like', auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    const userIndex = discussion.likes.indexOf(req.user.id);
    
    if (userIndex > -1) {
      discussion.likes.splice(userIndex, 1);
    } else {
      discussion.likes.push(req.user.id);
    }

    discussion.updatedAt = new Date();
    await discussion.save();
    
    res.json({ 
      likes: discussion.likes.length, 
      liked: userIndex === -1,
      message: userIndex === -1 ? 'Discussion liked!' : 'Like removed!'
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add reply to discussion
router.post('/:id/replies', auth, async (req, res) => {
  try {
    const { content, parentReply } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    if (discussion.isClosed) {
      return res.status(400).json({ error: 'This discussion is closed for replies' });
    }

    // Validate parent reply if provided
    if (parentReply) {
      const parent = await DiscussionReply.findById(parentReply);
      if (!parent || parent.discussion.toString() !== req.params.id) {
        return res.status(400).json({ error: 'Invalid parent reply' });
      }
    }

    const reply = new DiscussionReply({
      discussion: req.params.id,
      author: req.user.id,
      content: content.trim(),
      parentReply: parentReply || null
    });

    await reply.save();
    await reply.populate('author', 'name email');

    // Update discussion's last activity
    discussion.lastActivity = new Date();
    await discussion.save();

    res.status(201).json(reply);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Like/Unlike reply
router.post('/replies/:replyId/like', auth, async (req, res) => {
  try {
    const reply = await DiscussionReply.findById(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const userIndex = reply.likes.indexOf(req.user.id);
    
    if (userIndex > -1) {
      reply.likes.splice(userIndex, 1);
    } else {
      reply.likes.push(req.user.id);
    }

    reply.updatedAt = new Date();
    await reply.save();
    
    res.json({ 
      likes: reply.likes.length, 
      liked: userIndex === -1,
      message: userIndex === -1 ? 'Reply liked!' : 'Like removed!'
    });
  } catch (error) {
    console.error('Error toggling reply like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get discussion categories with counts
router.get('/stats/categories', async (req, res) => {
  try {
    const categories = await Discussion.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const total = await Discussion.countDocuments();

    res.json({
      categories,
      total
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

module.exports = router;
