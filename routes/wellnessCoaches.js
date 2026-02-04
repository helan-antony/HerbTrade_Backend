const express = require('express');
const router = express.Router();
const WellnessCoach = require('../models/WellnessCoach');
const Newsletter = require('../models/Newsletter');
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
        newsletterPrograms: [],
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
    const program = await Newsletter.findOne({
      programAssignedUserId: req.user.id,
      programType: 'wellness_program',
      programStatus: 'active'
    }).populate('programCoachId', 'name email qualifications specializations');

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

    const programs = await Newsletter.find({ 
      programCoachId: req.user.id,
      programType: 'wellness_program' 
    }).populate('programAssignedUserId', 'name email profilePic');

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
    const programs = await Newsletter.find({ 
      programType: 'wellness_program',
      programStatus: { $in: ['active', 'published'] } 
    })
      .populate('programCoachId', 'name email qualifications specializations')
      .populate('programAssignedUserId', 'name email profilePic')
      .sort({ publishedDate: -1 });

    // Separate assigned and unassigned programs
    const assignedPrograms = programs.filter(program => 
      program.programAssignedUserId && program.programAssignedUserId._id.toString() === req.user.id
    );
    
    const unassignedPrograms = programs.filter(program => 
      !program.programAssignedUserId
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
    console.log('Program creation request received');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);
    
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
      assignedUserId,
      startDate,
      endDate,
      goals,
      dailyTasks,
      weeklyMilestones
    } = req.body;

    // Check if user is coach or admin
    const user = await User.findById(req.user.id);
    console.log('User role:', user.role);
    if (user.role !== 'wellness_coach' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the coach profile associated with the user
    const coach = await WellnessCoach.findOne({ userId: req.user.id });
    console.log('Coach found:', coach ? 'Yes' : 'No');
    if (!coach) {
      return res.status(404).json({ message: 'Coach profile not found. Please complete your profile first.' });
    }

    const program = new Newsletter({
      title: title || name,
      content: description,
      category: 'wellness_program',
      author: user.name,
      programType: 'wellness_program',
      programName: name || title,
      programDescription: description,
      programCategory: category,
      programDuration: duration,
      programDifficulty: difficulty,
      programStartDate: startDate,
      programEndDate: endDate,
      programGoals: goals || [],
      programTargetAudience: targetAudience || [],
      programPrerequisites: prerequisites || [],
      programBenefits: benefits || [],
      programDailyTasks: dailyTasks || [],
      programWeeklyMilestones: weeklyMilestones || [],
      programStatus: status || 'draft',
      programAssignedUserId: assignedUserId || null,
      programCoachId: req.user.id
    });

    console.log('Saving program to database...');
    await program.save();
    console.log('Program saved successfully:', program._id);

    // Add program to coach's programs
    await WellnessCoach.findByIdAndUpdate(
      coach._id,
      { $push: { newsletterPrograms: program._id } }
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
    const program = await Newsletter.findById(programId);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check authorization (must be the assigned user or the coach)
    if (program.programAssignedUserId && program.programAssignedUserId.toString() !== req.user.id && 
        program.programCoachId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the task
    const task = program.programDailyTasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Toggle completion
    task.completed = !task.completed;

    // Recalculate progress
    const totalTasks = program.programDailyTasks.length;
    const completedTasks = program.programDailyTasks.filter(t => t.completed).length;

    const totalMilestones = program.programWeeklyMilestones.length;
    const completedMilestones = program.programWeeklyMilestones.filter(m => m.achieved).length;

    // Avoid division by zero
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const totalItems = totalTasks + totalMilestones;
    const totalCompleted = completedTasks + completedMilestones;
    const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    // Update progress in the program
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

// Add post-enrollment data to newsletter
router.post('/newsletters/:newsletterId/post-enrollment', auth, async (req, res) => {
  try {
    console.log('Post-enrollment data request received');
    console.log('Newsletter ID:', req.params.newsletterId);
    console.log('Request body:', req.body);
    
    // Check if user is a wellness coach
    const user = await User.findById(req.user.id);
    if (user.role !== 'wellness_coach') {
      return res.status(403).json({ error: 'Access denied. Wellness coaches only.' });
    }

    const { type, title, content, url, duration, difficulty, tags } = req.body;

    // Validate required fields
    if (!type || !title || !content) {
      return res.status(400).json({ error: 'Type, title, and content are required' });
    }

    // Find the newsletter and verify coach ownership
    const newsletter = await Newsletter.findById(req.params.newsletterId);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    // Check if coach owns this newsletter
    if (newsletter.programCoachId && newsletter.programCoachId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this newsletter.' });
    }

    // Add post-enrollment data
    const postData = {
      type,
      title,
      content,
      url: url || '',
      duration: duration || '',
      difficulty: difficulty || 'beginner',
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date()
    };

    newsletter.postEnrollmentData.push(postData);
    await newsletter.save();

    console.log('Post-enrollment data added successfully');
    res.status(201).json({ 
      message: 'Post-enrollment data added successfully', 
      postData: postData,
      totalItems: newsletter.postEnrollmentData.length 
    });
  } catch (error) {
    console.error('Error adding post-enrollment data:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get post-enrollment data for a newsletter
router.get('/newsletters/:newsletterId/post-enrollment', auth, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.newsletterId);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    // Check authorization
    const user = await User.findById(req.user.id);
    if (user.role !== 'wellness_coach' && user.role !== 'admin') {
      // Regular users can only see their own enrolled content
      const enrollment = newsletter.enrolledUsers.find(e => e.userId.toString() === req.user.id);
      if (!enrollment) {
        return res.status(403).json({ error: 'Access denied. Not enrolled in this newsletter.' });
      }
    }

    res.json({
      postEnrollmentData: newsletter.postEnrollmentData || [],
      enrolledUsersCount: newsletter.enrolledUsers ? newsletter.enrolledUsers.length : 0
    });
  } catch (error) {
    console.error('Error fetching post-enrollment data:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Enroll user in newsletter
router.post('/newsletters/:newsletterId/enroll', auth, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.newsletterId);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    // Check if already enrolled
    const existingEnrollment = newsletter.enrolledUsers.find(e => e.userId.toString() === req.user.id);
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Already enrolled in this newsletter' });
    }

    // Add enrollment
    newsletter.enrolledUsers.push({
      userId: req.user.id,
      enrolledAt: new Date(),
      progress: 0
    });

    await newsletter.save();

    res.status(201).json({ 
      message: 'Successfully enrolled in newsletter',
      postEnrollmentData: newsletter.postEnrollmentData || [],
      newsletter: newsletter
    });
  } catch (error) {
    console.error('Error enrolling in newsletter:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get enrolled newsletters for a user
router.get('/my-enrollments', auth, async (req, res) => {
  try {
    // Find all newsletters where the user is enrolled
    const enrolledNewsletters = await Newsletter.find({
      'enrolledUsers.userId': req.user.id
    }).populate('programCoachId', 'name email');

    res.json({
      enrolledNewsletters,
      count: enrolledNewsletters.length
    });
  } catch (error) {
    console.error('Error fetching enrolled newsletters:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get a specific enrolled newsletter with its post-enrollment content
router.get('/enrolled-newsletters/:newsletterId', auth, async (req, res) => {
  try {
    const newsletter = await Newsletter.findOne({
      _id: req.params.newsletterId,
      'enrolledUsers.userId': req.user.id
    });
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Not enrolled in this newsletter or newsletter not found' });
    }

    res.json({
      newsletter,
      postEnrollmentData: newsletter.postEnrollmentData || []
    });
  } catch (error) {
    console.error('Error fetching enrolled newsletter:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Save user progress for enrolled content
router.post('/newsletters/:newsletterId/save-progress', auth, async (req, res) => {
  try {
    const { contentId, progress, completed, viewedAt } = req.body;
    
    // Find newsletter by ID (regardless of enrollment status for now)
    const newsletter = await Newsletter.findById(req.params.newsletterId);
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    // Check if user is enrolled, and if not, enroll them first
    let enrollment = newsletter.enrolledUsers.find(e => e.userId.toString() === req.user.id);
    if (!enrollment) {
      newsletter.enrolledUsers.push({
        userId: req.user.id,
        enrolledAt: new Date(),
        progress: 0
      });
      await newsletter.save();
      console.log('User automatically enrolled in newsletter for progress tracking');
    }
    
    // Find or create user progress record
    let userProgress = newsletter.userProgress?.find(p => p.userId.toString() === req.user.id);
    
    if (!userProgress) {
      userProgress = {
        userId: req.user.id,
        contentProgress: [],
        overallProgress: 0,
        lastAccessed: new Date()
      };
      if (!newsletter.userProgress) newsletter.userProgress = [];
      newsletter.userProgress.push(userProgress);
    }
    
    // Update or create content progress
    const contentIndex = userProgress.contentProgress.findIndex(cp => cp.contentId === contentId);
    
    const contentProgress = {
      contentId,
      progress: progress || 0,
      completed: completed || false,
      viewedAt: viewedAt || new Date(),
      lastUpdated: new Date()
    };
    
    if (contentIndex >= 0) {
      userProgress.contentProgress[contentIndex] = contentProgress;
    } else {
      userProgress.contentProgress.push(contentProgress);
    }
    
    // Calculate overall progress
    const totalItems = newsletter.postEnrollmentData.length;
    const completedItems = userProgress.contentProgress.filter(cp => cp.completed).length;
    userProgress.overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    userProgress.lastAccessed = new Date();
    
    await newsletter.save();
    
    res.json({ 
      message: 'Progress saved successfully',
      progress: userProgress.overallProgress,
      contentProgress
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get user progress for a newsletter
router.get('/newsletters/:newsletterId/progress', auth, async (req, res) => {
  try {
    const newsletter = await Newsletter.findOne({
      _id: req.params.newsletterId,
      'enrolledUsers.userId': req.user.id
    });
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Not enrolled in this newsletter' });
    }
    
    const userProgress = newsletter.userProgress?.find(p => p.userId.toString() === req.user.id);
    
    res.json({
      overallProgress: userProgress?.overallProgress || 0,
      contentProgress: userProgress?.contentProgress || [],
      totalContentItems: newsletter.postEnrollmentData.length
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;