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
      // Instead of returning 404, return empty object to allow frontend to create profile
      return res.json({
        qualifications: [],
        specializations: [],
        experience: 0,
        certifications: [],
        consultationMethods: ['video'],
        consultationFee: 0,
        bio: '',
        rating: 0,
        totalReviews: 0,
        isAvailable: true,
        languages: [],
        availability: {},
        clients: [],
        wellnessPrograms: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.json(coach);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create coach profile
router.post('/profile', auth, async (req, res) => {
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

    // Check if coach profile already exists
    const existingCoach = await WellnessCoach.findOne({ userId: req.user.id });
    if (existingCoach) {
      return res.status(409).json({ message: 'Coach profile already exists' });
    }

    const coach = new WellnessCoach({
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

    res.status(201).json({ message: 'Profile created successfully', coach });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update coach profile
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

    const coach = await WellnessCoach.findOne({ userId: req.user.id });

    if (!coach) {
      return res.status(404).json({ message: 'Coach profile not found' });
    }

    // Update coach profile
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

// Get all wellness programs for a coach
router.get('/programs', auth, async (req, res) => {
  try {
    const coach = await WellnessCoach.findOne({ userId: req.user.id });
    if (!coach) {
      // If coach profile doesn't exist yet, return empty list instead of 404 to avoid frontend errors
      return res.json({ programs: [] });
    }

    const programs = await WellnessProgram.find({ coachId: coach._id })
      .populate('clientId', 'name email profilePic');

    res.json({ programs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all available wellness programs for users (both assigned and unassigned)
router.get('/programs/available', auth, async (req, res) => {
  try {
    // Check if user is a regular user
    const user = await User.findById(req.user.id);
    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Access denied. Users only.' });
    }

    // Get all published wellness programs
    const programs = await WellnessProgram.find({ status: 'active' })
      .populate('coachId', 'userId qualifications specializations')
      .populate('clientId', 'name email profilePic')
      .sort({ createdAt: -1 });

    // Separate assigned and unassigned programs
    const assignedPrograms = programs.filter(program => 
      program.clientId && program.clientId._id.toString() === req.user.id
    );
    
    const unassignedPrograms = programs.filter(program => 
      !program.clientId
    );

    res.json({ 
      assignedPrograms,
      unassignedPrograms,
      allPrograms: programs
    });
  } catch (error) {
    console.error('Error fetching available programs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create wellness program (admin/coach only)
router.post('/programs', auth, async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      category,
      duration,
      difficulty,
      targetAudience,
      prerequisites,
      benefits,
      status,
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


    // Find the coach profile associated with the user
    const coach = await WellnessCoach.findOne({ userId: req.user.id });
    if (!coach) {
      return res.status(404).json({ message: 'Coach profile not found. Please complete your profile first.' });
    }

    const program = new WellnessProgram({
      name: name || title,
      title,
      description,
      category,
      duration,
      difficulty,
      targetAudience: targetAudience || [],
      prerequisites: prerequisites || [],
      benefits: benefits || [],
      status: status || 'active',
      coachId: coach._id, // Use coach._id, not req.user.id
      clientId: clientId || null, // Make clientId optional
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
      coach._id,
      { $push: { wellnessPrograms: program._id } }
    );

    res.status(201).json({ message: 'Program created successfully', program });
  } catch (error) {
    console.error('Program creation error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users for wellness coach to assign to programs
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is a wellness coach
    const user = await User.findById(req.user.id);
    if (user.role !== 'wellness_coach') {
      return res.status(403).json({ error: 'Access denied. Wellness coaches only.' });
    }

    // Get all users with role 'user'
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle task completion status
router.put('/programs/:programId/tasks/:taskId/toggle', auth, async (req, res) => {
  try {
    const { programId, taskId } = req.params;

    // Find the program
    const program = await WellnessProgram.findById(programId);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check authorization (must be the client or the coach)
    if (program.clientId.toString() !== req.user.id && program.coachId.toString() !== req.user.id) {
      // Also check if the user is the coach (since coachId in program refers to the WellnessCoach document, not the User)
      // We need to fetch the WellnessCoach document for the logged in user to check if they are the coach
      const coach = await WellnessCoach.findOne({ userId: req.user.id });
      if (!coach || coach._id.toString() !== program.coachId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Find the task
    const task = program.dailyTasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Toggle completion
    task.completed = !task.completed;

    // Recalculate progress
    const totalTasks = program.dailyTasks.length;
    const completedTasks = program.dailyTasks.filter(t => t.completed).length;

    const totalMilestones = program.weeklyMilestones.length;
    const completedMilestones = program.weeklyMilestones.filter(m => m.achieved).length;

    // Avoid division by zero
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const totalItems = totalTasks + totalMilestones;
    const totalCompleted = completedTasks + completedMilestones;
    const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    program.progress = {
      overall: overallProgress,
      dailyGoals: taskProgress,
      weeklyMilestones: milestoneProgress
    };

    await program.save();

    res.json(program);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;