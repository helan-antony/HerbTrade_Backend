const express = require('express');
const router = express.Router();
const WellnessCoach = require('../models/WellnessCoach');
const WellnessProgram = require('../models/WellnessProgram');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all wellness coaches
router.get('/', async (req, res) => {
  try {
    const { specializations, minRating, page = 1, limit = 12 } = req.query;
    
    let filter = {};
    
    if (specializations) {
      filter.specializations = { $regex: specializations, $options: 'i' };
    }
    
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }
    
    const coaches = await WellnessCoach.find(filter)
      .populate('userId', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1 });
    
    const total = await WellnessCoach.countDocuments(filter);
    
    res.json({
      coaches,
      pagination: {
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get coach profile
router.get('/profile', auth, async (req, res) => {
  try {
    const coach = await WellnessCoach.findOne({ userId: req.user.id })
      .populate('userId', 'name email')
      .populate('clients.userId', 'name email');
    
    if (!coach) {
      return res.status(404).json({ message: 'Coach profile not found' });
    }
    
    res.json(coach);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create/update coach profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      qualifications,
      specializations,
      experience,
      certifications,
      consultationMethods,
      consultationFee,
      bio,
      languages,
      availability
    } = req.body;
    
    let coach = await WellnessCoach.findOne({ userId: req.user.id });
    
    if (coach) {
      // Update existing coach
      coach.qualifications = qualifications || coach.qualifications;
      coach.specializations = specializations || coach.specializations;
      coach.experience = experience || coach.experience;
      coach.certifications = certifications || coach.certifications;
      coach.consultationMethods = consultationMethods || coach.consultationMethods;
      coach.consultationFee = consultationFee || coach.consultationFee;
      coach.bio = bio || coach.bio;
      coach.languages = languages || coach.languages;
      coach.availability = availability || coach.availability;
      
      await coach.save();
    } else {
      // Create new coach
      coach = new WellnessCoach({
        userId: req.user.id,
        qualifications: qualifications || [],
        specializations: specializations || [],
        experience: experience || 0,
        certifications: certifications || [],
        consultationMethods: consultationMethods || ['video'],
        consultationFee: consultationFee || 0,
        bio: bio || '',
        languages: languages || [],
        availability: availability || {}
      });
      
      await coach.save();
    }
    
    res.json({ message: 'Profile updated successfully', coach });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update client status
router.put('/clients/:clientId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { clientId } = req.params;
    
    const coach = await WellnessCoach.findOne({ userId: req.user.id });
    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }
    
    const clientIndex = coach.clients.findIndex(c => c.userId.toString() === clientId);
    if (clientIndex === -1) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    coach.clients[clientIndex].status = status;
    await coach.save();
    
    res.json({ message: 'Client status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current wellness program for a client
router.get('/programs/current', auth, async (req, res) => {
  try {
    const program = await WellnessProgram.findOne({ 
      clientId: req.user.id,
      status: 'active'
    }).populate('coachId', 'userId qualifications specializations');
    
    if (!program) {
      return res.status(404).json({ message: 'No active program found' });
    }
    
    res.json(program);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create wellness program (admin/coach only)
router.post('/programs', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      clientId,
      startDate,
      endDate,
      goals,
      dailyTasks,
      weeklyMilestones,
      recommendations
    } = req.body;
    
    // Check if user is coach or admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'wellness_coach' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const program = new WellnessProgram({
      name,
      description,
      coachId: req.user.id,
      clientId,
      startDate,
      endDate,
      goals: goals || [],
      dailyTasks: dailyTasks || [],
      weeklyMilestones: weeklyMilestones || [],
      recommendations: recommendations || []
    });
    
    await program.save();
    
    // Add program to coach's programs
    await WellnessCoach.findByIdAndUpdate(
      req.user.id,
      { $push: { wellnessPrograms: program._id } }
    );
    
    res.status(201).json({ message: 'Program created successfully', program });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;