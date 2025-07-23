const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/herbtrade', { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/api/auth', authRoutes);
app.use('/api/blog', blogRoutes);

// Create inbuilt admin user if not exists
async function ensureAdminUser() {
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'admin@123';
  const existing = await User.findOne({ email: adminEmail, role: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: 'Admin',
      email: adminEmail,
      phone: '0000000000',
      password: hash,
      role: 'admin'
    });
    console.log('Admin user created:', adminEmail, 'Password:', adminPassword);
  }
}
ensureAdminUser();

app.listen(5000, () => console.log('Server running on port 5000'));