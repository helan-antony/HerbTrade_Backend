const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

const router = express.Router();

function assertDeliveryRole(req, res) {
  if (req.user?.role !== 'delivery') {
    res.status(403).json({ error: 'Access denied. Delivery role required.' });
    return false;
  }
  return true;
}

// Get assigned orders for delivery person
router.get('/orders', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const orders = await Order.find({ deliveryAssignee: req.user._id })
      .populate('user', 'name email')
      .populate('items.product', 'name price image')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ error: 'Failed to fetch assigned orders' });
  }
});

// Get all orders (delivery can view all)
router.get('/orders/available', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.product', 'name price image')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching available delivery orders:', error);
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

// Claim an available order
router.post('/orders/:id/claim', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.deliveryAssignee) {
      return res.status(400).json({ error: 'Order already assigned' });
    }

    order.deliveryAssignee = req.user._id;
    order.deliveryStatus = 'assigned';
    order.deliveryEvents = order.deliveryEvents || [];
    order.deliveryEvents.push({ status: 'assigned', message: `Claimed by ${req.user.name}` });
    await order.save();
    await order.populate('user', 'name email');

    res.json({ message: 'Order claimed successfully', order });
  } catch (error) {
    console.error('Error claiming order:', error);
    res.status(500).json({ error: 'Failed to claim order' });
  }
});

// Update delivery status for an assigned order
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const { status, note } = req.body;
    const valid = ['picked_up', 'out_for_delivery', 'delivered', 'failed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const order = await Order.findOne({ _id: req.params.id, deliveryAssignee: req.user._id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not assigned to you' });
    }

    order.deliveryStatus = status;
    order.deliveryNotes = note || order.deliveryNotes;
    order.deliveryEvents = order.deliveryEvents || [];
    order.deliveryEvents.push({ status, message: note || '' });

    // Update main order status based on delivery status (e-commerce workflow)
    if (status === 'picked_up') {
      order.status = 'processing';
    } else if (status === 'out_for_delivery') {
      order.status = 'shipped';
    } else if (status === 'delivered') {
      order.status = 'delivered';
      order.deliveryDate = new Date();
    } else if (status === 'failed') {
      order.status = 'processing'; // Keep as processing for retry
    }

    await order.save();
    await order.populate('user', 'name email');
    res.json({ message: 'Delivery status updated', order });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Update delivery location
router.put('/location', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const delivery = await Seller.findById(req.user._id);
    if (!delivery) return res.status(404).json({ error: 'User not found' });

    delivery.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await delivery.save();

    res.json({ 
      message: 'Location updated successfully', 
      location: delivery.currentLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Toggle availability status
router.put('/availability', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const delivery = await Seller.findById(req.user._id);
    if (!delivery) return res.status(404).json({ error: 'User not found' });

    delivery.isAvailable = !delivery.isAvailable;
    await delivery.save();

    res.json({
      success: true,
      message: `You are now ${delivery.isAvailable ? 'available' : 'unavailable'} for deliveries`,
      isAvailable: delivery.isAvailable
    });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// Get delivery profile
router.get('/profile', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profilePic: req.user.profilePic,
      role: req.user.role,
      isActive: req.user.isActive,
      isAvailable: req.user.isAvailable,
      currentLocation: req.user.currentLocation,
      maxDeliveryRadius: req.user.maxDeliveryRadius,
      vehicleType: req.user.vehicleType,
      licenseNumber: req.user.licenseNumber,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    console.error('Error fetching delivery profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update delivery profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const { name, phone, profilePic } = req.body;
    const delivery = await Seller.findById(req.user._id);
    if (!delivery) return res.status(404).json({ error: 'User not found' });

    delivery.name = name || delivery.name;
    delivery.phone = phone || delivery.phone;
    delivery.profilePic = profilePic || delivery.profilePic;
    await delivery.save();

    res.json({
      id: delivery._id,
      name: delivery.name,
      email: delivery.email,
      phone: delivery.phone,
      profilePic: delivery.profilePic,
      role: delivery.role
    });
  } catch (error) {
    console.error('Error updating delivery profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password (delivery)
router.post('/change-password', auth, async (req, res) => {
  try {
    if (!assertDeliveryRole(req, res)) return;

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const delivery = await Seller.findById(req.user._id);
    if (!delivery) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, delivery.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    delivery.password = await bcrypt.hash(newPassword, 10);
    await delivery.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;


