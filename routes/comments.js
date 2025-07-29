const express = require('express');
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/blog/:blogId', async (req, res) => {
  try {
    console.log('Fetching comments for blog:', req.params.blogId);
    
    const comments = await Comment.find({ 
      blog: req.params.blogId,
      parentComment: null 
    })
    .populate('user', 'name')
    .sort({ createdAt: -1 });

    console.log('Found comments:', comments.length);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('user', 'name')
          .sort({ createdAt: 1 });
        
        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json(commentsWithReplies);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
});

router.post('/blog/:blogId', auth, async (req, res) => {
  try {
    const { content, parentComment } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const blog = await Blog.findById(req.params.blogId);
    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.blog.toString() !== req.params.blogId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }

    const comment = new Comment({
      blog: req.params.blogId,
      user: req.user.id,
      content: content.trim(),
      parentComment: parentComment || null
    });

    await comment.save();
    await comment.populate('user', 'name');

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const userIndex = comment.likes.indexOf(req.user.id);
    
    if (userIndex > -1) {
      comment.likes.splice(userIndex, 1);
    } else {
      comment.likes.push(req.user.id);
    }

    await comment.save();
    res.json({ likes: comment.likes.length, liked: userIndex === -1 });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

router.put('/:commentId', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    comment.content = content.trim();
    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('user', 'name');

    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Comment.deleteMany({ parentComment: comment._id });
    
    await Comment.findByIdAndDelete(req.params.commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;