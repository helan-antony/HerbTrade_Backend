const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');

// Create a new appointment
router.post('/', auth, async (req, res) => {
  try {
    const { 
      doctorId, 
      hospitalId, 
      date, 
      time, 
      reason, 
      patientName, 
      patientPhone, 
      patientEmail,
      doctorName,
      hospitalName
    } = req.body;

    // Find the hospital
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Find the doctor
    const doctor = hospital.doctors.find(doc => doc._id.toString() === doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Create appointment object
    const appointment = {
      patient: req.user._id,
      doctor: {
        id: doctorId,
        name: doctorName || doctor.name,
        specialty: doctor.specialty
      },
      hospital: {
        id: hospitalId,
        name: hospitalName || hospital.name,
        address: hospital.address,
        phone: hospital.phone
      },
      appointmentDate: new Date(date),
      appointmentTime: time,
      reason: reason,
      patientDetails: {
        name: patientName,
        phone: patientPhone,
        email: patientEmail
      },
      status: 'pending',
      createdAt: new Date()
    };

    // Add appointment to hospital
    if (!hospital.appointments) {
      hospital.appointments = [];
    }
    hospital.appointments.push(appointment);
    await hospital.save();

    // Log for admin notification
    console.log('New appointment booked - Admin should be notified');

    res.status(201).json({
      message: 'Appointment request submitted successfully! This is a demo - no real booking is made.',
      appointment: appointment,
      demo: true,
      adminNotification: true
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Get user's appointments
router.get('/user', auth, async (req, res) => {
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

    // Sort appointments by date (newest first)
    userAppointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

    res.json(userAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get appointment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      'appointments._id': req.params.id,
      'appointments.patient': req.user._id
    });

    if (hospitals.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const hospital = hospitals[0];
    const appointment = hospital.appointments.find(
      apt => apt._id.toString() === req.params.id && 
             apt.patient.toString() === req.user._id.toString()
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Update appointment status (for demo purposes)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const hospitals = await Hospital.find({
      'appointments._id': req.params.id,
      'appointments.patient': req.user._id
    });

    if (hospitals.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const hospital = hospitals[0];
    const appointmentIndex = hospital.appointments.findIndex(
      apt => apt._id.toString() === req.params.id && 
             apt.patient.toString() === req.user._id.toString()
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    hospital.appointments[appointmentIndex].status = status;
    await hospital.save();

    res.json({
      message: 'Appointment status updated successfully',
      appointment: hospital.appointments[appointmentIndex]
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      'appointments._id': req.params.id,
      'appointments.patient': req.user._id
    });

    if (hospitals.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const hospital = hospitals[0];
    const appointmentIndex = hospital.appointments.findIndex(
      apt => apt._id.toString() === req.params.id && 
             apt.patient.toString() === req.user._id.toString()
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update status to cancelled instead of deleting
    hospital.appointments[appointmentIndex].status = 'cancelled';
    await hospital.save();

    res.json({
      message: 'Appointment cancelled successfully',
      appointment: hospital.appointments[appointmentIndex]
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

module.exports = router;
