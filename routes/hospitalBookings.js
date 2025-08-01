const express = require('express');
const router = express.Router();
const HospitalBooking = require('../models/HospitalBooking');
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');

// Get user's hospital bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await HospitalBooking.find({ userId: req.user._id })
      .populate('hospitalId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// Get specific booking by ID
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const booking = await HospitalBooking.findOne({
      _id: req.params.bookingId,
      userId: req.user._id
    }).populate('hospitalId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// Create new hospital booking
router.post('/create', auth, async (req, res) => {
  try {
    const {
      hospitalId,
      patientDetails,
      appointmentDetails,
      medicalInfo,
      notes
    } = req.body;

    // Validate required fields
    if (!hospitalId || !patientDetails || !appointmentDetails || !medicalInfo) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Create new booking
    const booking = new HospitalBooking({
      userId: req.user.id,
      hospitalId,
      patientDetails,
      appointmentDetails,
      medicalInfo,
      hospitalDetails: {
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email
      },
      paymentDetails: {
        consultationFee: appointmentDetails.consultationFee || 500,
        paymentStatus: 'Pending',
        paymentMethod: 'Cash'
      },
      notes
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully! The hospital has been notified and will confirm your appointment shortly.',
      data: booking,
      note: 'You will receive a confirmation email with appointment details. Please arrive 15 minutes before your scheduled time.'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// Update booking status
router.put('/:bookingId/status', auth, async (req, res) => {
  try {
    const { bookingStatus } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rescheduled'];

    if (!validStatuses.includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status'
      });
    }

    const booking = await HospitalBooking.findOne({
      _id: req.params.bookingId,
      userId: req.user.id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.bookingStatus = bookingStatus;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking status updated',
      data: booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
});

// Update payment status
router.put('/:bookingId/payment', auth, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, transactionId } = req.body;
    const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];

    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const booking = await HospitalBooking.findOne({
      _id: req.params.bookingId,
      userId: req.user.id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.paymentDetails.paymentStatus = paymentStatus;
    if (paymentMethod) booking.paymentDetails.paymentMethod = paymentMethod;
    if (transactionId) booking.paymentDetails.transactionId = transactionId;

    await booking.save();

    res.json({
      success: true,
      message: 'Payment status updated',
      data: booking
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
});

// Cancel booking
router.put('/:bookingId/cancel', auth, async (req, res) => {
  try {
    const booking = await HospitalBooking.findOne({
      _id: req.params.bookingId,
      userId: req.user._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.bookingStatus === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    booking.bookingStatus = 'Cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
});

// Get booking statistics for user
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await HospitalBooking.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBookings = await HospitalBooking.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: {
        totalBookings,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking statistics'
    });
  }
});

module.exports = router;