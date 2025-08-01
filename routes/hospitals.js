const express = require('express');
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');
const router = express.Router();

console.log('🏥 Hospitals routes file loaded!');

// Test route to verify hospitals routes are working
router.get('/test', (req, res) => {
  console.log('🏥 Hospitals test route hit!');
  res.json({ message: 'Hospitals routes are working!' });
});

// Debug route to list all hospitals with their IDs
router.get('/debug/list', async (req, res) => {
  try {
    const hospitals = await Hospital.find({}, 'name _id city state doctors.name doctors.specialty');
    console.log(`Found ${hospitals.length} hospitals in database`);

    res.json({
      message: `Found ${hospitals.length} hospitals`,
      hospitals: hospitals.map(h => ({
        id: h._id,
        name: h.name,
        city: h.city,
        state: h.state,
        doctorCount: h.doctors?.length || 0,
        doctors: h.doctors?.map(d => ({ name: d.name, specialty: d.specialty })) || []
      }))
    });
  } catch (error) {
    console.error('Error listing hospitals:', error);
    res.status(500).json({ error: 'Failed to list hospitals' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, specialty, city, search } = req.query;
    let query = {};

    if (lat && lng) {
      const radiusInMeters = radius ? parseFloat(radius) * 1000 : 10000; // Default 10km
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      };
    }

    if (specialty) {
      query.specialties = { $in: [new RegExp(specialty, 'i')] };
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialties: { $in: [new RegExp(search, 'i')] } },
        { 'doctors.name': { $regex: search, $options: 'i' } },
        { 'doctors.specialty': { $regex: search, $options: 'i' } }
      ];
    }

    const hospitals = await Hospital.find(query)
      .select('-reviews')
      .sort({ rating: -1 })
      .limit(50);

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('reviews.user', 'name');

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ error: 'Failed to fetch hospital' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name, address, city, state, zipCode, phone, email, website,
      specialties, doctors, latitude, longitude, facilities, workingHours
    } = req.body;

    if (!name || !address || !city || !state || !latitude || !longitude) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const hospital = new Hospital({
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      specialties: specialties || [],
      doctors: doctors || [],
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      facilities: facilities || [],
      workingHours: workingHours || {}
    });

    await hospital.save();
    res.status(201).json(hospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    res.status(500).json({ error: 'Failed to create hospital' });
  }
});

router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const existingReview = hospital.reviews.find(r => r.user.toString() === req.user.id);
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this hospital' });
    }

    hospital.reviews.push({
      user: req.user.id,
      rating: parseInt(rating),
      review: review || ''
    });

    const totalRating = hospital.reviews.reduce((sum, r) => sum + r.rating, 0);
    hospital.rating = totalRating / hospital.reviews.length;

    await hospital.save();
    await hospital.populate('reviews.user', 'name');

    res.json(hospital);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 10; // Default 10km

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      }
    })
    .select('name address city phone specialties rating location')
    .limit(20);

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
  }
});

router.get('/specialties/list', async (req, res) => {
  try {
    const specialties = await Hospital.distinct('specialties');
    res.json(specialties);
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

router.post('/appointments', auth, async (req, res) => {
  try {
    const { 
      doctorId, 
      hospitalId, 
      date, 
      time, 
      reason, 
      patientName, 
      patientPhone, 
      patientEmail 
    } = req.body;

    if (!doctorId || !hospitalId || !date || !time || !patientName || !patientPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const doctor = hospital.doctors.find(doc => doc._id.toString() === doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found in this hospital' });
    }

    const appointment = {
      _id: new mongoose.Types.ObjectId(),
      patient: req.user._id,
      doctor: {
        id: doctorId,
        name: doctor.name,
        specialty: doctor.specialty
      },
      hospital: {
        id: hospitalId,
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone
      },
      appointmentDate: new Date(date),
      appointmentTime: time,
      reason: reason || '',
      patientDetails: {
        name: patientName,
        phone: patientPhone,
        email: patientEmail || ''
      },
      status: 'pending',
      createdAt: new Date()
    };

    if (!hospital.appointments) {
      hospital.appointments = [];
    }
    hospital.appointments.push(appointment);
    await hospital.save();

    // Trigger notification event for admin dashboard
    // In a real application, you might use WebSockets or a message queue
    console.log('New appointment booked - Admin should be notified');

    res.status(201).json({
      message: 'Appointment request submitted successfully! The hospital has been notified.',
      appointment: {
        id: appointment._id,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        doctor: appointment.doctor.name,
        hospital: appointment.hospital.name,
        status: appointment.status
      },
      note: 'You will receive a confirmation email shortly. Please arrive 15 minutes before your scheduled appointment.',
      adminNotification: true
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

router.get('/appointments/my', auth, async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      'appointments.patient': req.user._id
    });

    const userAppointments = [];
    hospitals.forEach(hospital => {
      const appointments = hospital.appointments.filter(
        apt => apt.patient.toString() === req.user._id.toString()
      );
      userAppointments.push(...appointments);
    });

    userAppointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

    res.json(userAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

module.exports = router;