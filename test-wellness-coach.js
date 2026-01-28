const mongoose = require('mongoose');
const User = require('./models/User');
const WellnessCoach = require('./models/WellnessCoach');

require('dotenv').config();

async function testWellnessCoach() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if wellness coach user exists
    const coachUser = await User.findOne({ role: 'wellness_coach' });
    console.log('👤 Wellness Coach User:', coachUser ? coachUser.email : 'Not found');

    // Check if wellness coach profile exists
    const coachProfile = await WellnessCoach.findOne({ userId: coachUser?._id });
    console.log('📋 Wellness Coach Profile:', coachProfile ? 'Exists' : 'Not found');

    if (coachUser) {
      console.log('📧 Email:', coachUser.email);
      console.log('👤 Name:', coachUser.name);
      console.log('🔒 Role:', coachUser.role);
    }

    if (coachProfile) {
      console.log('📋 Bio:', coachProfile.bio);
      console.log('📋 Experience:', coachProfile.experience);
      console.log('📋 Specializations:', coachProfile.specializations);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testWellnessCoach();