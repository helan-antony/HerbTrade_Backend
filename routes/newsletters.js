const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');

// Create a new newsletter (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { title, content, category, tags } = req.body;

    const newsletter = new Newsletter({
      title,
      content,
      category,
      tags: tags || [],
      author: req.user.name
    });

    await newsletter.save();
    res.status(201).json({ message: 'Newsletter created successfully', newsletter });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    res.status(500).json({ error: 'Failed to create newsletter' });
  }
});

// Get all newsletters
router.get('/', async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    
    let query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const newsletters = await Newsletter.find(query)
      .sort({ publishedDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Newsletter.countDocuments(query);

    res.json({
      newsletters,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ error: 'Failed to fetch newsletters' });
  }
});

// Get a specific newsletter
router.get('/:id', async (req, res) => {
  try {
    const newsletter = await Newsletter.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });

    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    res.json(newsletter);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter' });
  }
});

// Update a newsletter (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { title, content, category, tags, isActive } = req.body;

    const newsletter = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { title, content, category, tags, isActive },
      { new: true }
    );

    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    res.json({ message: 'Newsletter updated successfully', newsletter });
  } catch (error) {
    console.error('Error updating newsletter:', error);
    res.status(500).json({ error: 'Failed to update newsletter' });
  }
});

// Delete a newsletter (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const newsletter = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    res.json({ message: 'Newsletter deleted successfully' });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    res.status(500).json({ error: 'Failed to delete newsletter' });
  }
});

// Send newsletter to all users
router.post('/send/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    // Get all active users who subscribed to newsletter
    const users = await User.find({ 
      isActive: true,
      email: { $ne: null, $ne: '' },
      newsletterSubscribed: { $ne: false } // Include users who haven't unsubscribed
    });

    if (users.length === 0) {
      return res.json({ message: 'No users to send newsletter to' });
    }

    // Configure email transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `[HerbTrade Health] ${newsletter.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #2d5016; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }
                .unsubscribe { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>HerbTrade Health Newsletter</h1>
                <p>${new Date(newsletter.publishedDate).toLocaleDateString()}</p>
              </div>
              <div class="content">
                <h2>${newsletter.title}</h2>
                <div>${newsletter.content}</div>
              </div>
              <div class="footer">
                <p>This email was sent to ${user.email}</p>
                <div class="unsubscribe">
                  <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(user.email)}">Unsubscribe</a> from future newsletters</p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        failureCount++;
      }
    }

    res.json({
      message: 'Newsletter sent successfully',
      recipients: users.length,
      successCount,
      failureCount
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
});

module.exports = router;