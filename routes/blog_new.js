const express = require('express');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all blog posts
router.get('/', async (req, res) => {
  try {
    console.log('📄 Getting all blog posts');
    const posts = await Blog.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${posts.length} blog posts`);
    res.json(posts);
  } catch (err) {
    console.error('❌ Error fetching blog posts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new blog post
router.post('/', async (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  try {
    console.log('📝 Creating new blog post:', title);
    const post = new Blog({ title, content, author, likes: [], views: 0 });
    await post.save();
    console.log('✅ Blog post created:', post._id);
    res.status(201).json(post);
  } catch (err) {
    console.error('❌ Error creating blog post:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get blog post stats (likes, views, comments count) - MUST be before /:id route
router.get('/:id/stats', async (req, res) => {
  try {
    console.log('📊 Stats endpoint hit for blog ID:', req.params.id);
    
    const post = await Blog.findById(req.params.id);
    if (!post) {
      console.log('❌ Blog post not found:', req.params.id);
      return res.status(404).json({ error: 'Blog post not found' });
    }

    console.log('✅ Blog post found:', post.title);

    // Get comments count
    const commentsCount = await Comment.countDocuments({ blog: req.params.id });
    console.log('📝 Comments count:', commentsCount);

    const stats = {
      likes: post.likes?.length || 0,
      views: post.views || 0,
      comments: commentsCount,
      likedBy: post.likes || []
    };

    console.log('📊 Returning stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('❌ Error fetching blog stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Like/Unlike a blog post
router.post('/:id/like', auth, async (req, res) => {
  try {
    console.log('❤️ Like endpoint hit for blog ID:', req.params.id);
    
    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Initialize likes array if it doesn't exist
    if (!post.likes) {
      post.likes = [];
    }

    const userIndex = post.likes.indexOf(req.user.id);

    if (userIndex > -1) {
      // Unlike the post
      post.likes.splice(userIndex, 1);
    } else {
      // Like the post
      post.likes.push(req.user.id);
    }

    post.updatedAt = new Date();
    await post.save();

    res.json({
      likes: post.likes.length,
      liked: userIndex === -1,
      message: userIndex === -1 ? 'Post liked!' : 'Post unliked!'
    });
  } catch (err) {
    console.error('❌ Error liking blog post:', err);
    res.status(500).json({ error: err.message });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    console.log('👁️ View endpoint hit for blog ID:', req.params.id);
    
    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    post.views = (post.views || 0) + 1;
    post.updatedAt = new Date();
    await post.save();

    res.json({
      views: post.views,
      message: 'View count updated'
    });
  } catch (err) {
    console.error('❌ Error updating view count:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single blog post - MUST be after specific routes like /stats, /like, /view
router.get('/:id', async (req, res) => {
  try {
    console.log('📄 Single blog endpoint hit for ID:', req.params.id);
    
    const post = await Blog.findById(req.params.id);
    if (!post) {
      console.log('❌ Blog post not found:', req.params.id);
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    console.log('✅ Blog post found:', post.title);
    res.json(post);
  } catch (err) {
    console.error('❌ Error fetching blog post:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
