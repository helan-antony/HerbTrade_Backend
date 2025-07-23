const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

let resetTokens = {};

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, phone, password: hash, role: 'user' });
    await user.save();
    res.status(201).json({ message: 'User registered', user: { name, email, phone, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/profile', async (req, res) => {
  const { email, name, phone, profilePic } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { name, phone, profilePic },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update email
router.patch('/update-email', async (req, res) => {
  const { currentEmail, newEmail } = req.body;
  try {
    if (!currentEmail || !newEmail) return res.status(400).json({ error: 'Both current and new email are required' });
    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(400).json({ error: 'New email already in use' });
    const user = await User.findOneAndUpdate(
      { email: currentEmail },
      { email: newEmail },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Email updated', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update password
router.patch('/update-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    if (!email || !currentPassword || !newPassword) return res.status(400).json({ error: 'All fields are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Only allow gmail.com and mca.ajce.in emails
  if (!/^([a-zA-Z0-9._%+-]+@(gmail\.com|mca\.ajce\.in))$/.test(email)) {
    return res.status(400).json({ error: 'Only Gmail and mca.ajce.in emails are allowed' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Email does not exist' });
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens[token] = { email, expires: Date.now() + 1000 * 60 * 15 };
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'helanantony03@gmail.com',
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: 'helanantony03@gmail.com',
      to: email,
      subject: 'Password Reset from HerbTrade',
      text: `You requested a password reset for your HerbTrade account. Click the link to reset your password: ${resetLink}\nThis link will expire in 15 minutes.`,
      html: `
        <p>You requested a password reset for your HerbTrade account.</p>
        <p>
          <a href="${resetLink}" style="font-size:18px; color:#2a7ae2;">Click here to reset your password</a>
        </p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `
    });
    res.json({ message: 'A reset link has been sent to your email.' });
  } catch (err) {
    console.error('Nodemailer error:', err);
    if (err && err.stack) console.error('Nodemailer stack:', err.stack);
    res.status(500).json({ error: 'Failed to send reset email', details: err && (err.message || JSON.stringify(err)) });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const data = resetTokens[token];
    if (!data || data.expires < Date.now()) return res.status(400).json({ error: 'Invalid or expired token' });
    const user = await User.findOne({ email: data.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();
    delete resetTokens[token];
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router; 