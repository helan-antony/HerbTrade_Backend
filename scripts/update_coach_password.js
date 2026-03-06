const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: __dirname + '/../.env' });

async function updateCoachPassword() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const coachEmail = 'coach@gmail.com';
        const newPassword = 'Coach@222003';

        console.log(`👤 Finding coach user: ${coachEmail}`);
        const coach = await User.findOne({ email: coachEmail });

        if (!coach) {
            console.error('❌ Coach user not found in database.');
            process.exit(1);
        }

        console.log('🔒 Hashing new password...');
        const hash = await bcrypt.hash(newPassword, 10);

        coach.password = hash;
        await coach.save();

        console.log('✅ Password updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating password:', error);
        process.exit(1);
    }
}

updateCoachPassword();
