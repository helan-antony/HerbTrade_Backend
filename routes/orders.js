const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User'); // Import User model to update address
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes, totalAmount: providedTotal } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.phone) {
      return res.status(400).json({ error: 'Complete shipping address is required' });
    }

    let calculatedTotal = 0;
    const orderItems = [];

    // Validate items and calculate total
    for (const item of items) {
      // Handle both formats: {product, quantity} and {product: {_id, price, ...}, quantity}
      const productId = item.product && typeof item.product === 'object' ? item.product._id : item.product;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({ error: `Product ${productId} not found` });
      }

      if (product.inStock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.inStock}, Requested: ${item.quantity}` });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      // Update product stock (only deduct for COD or if payment is confirmed - strict way)
      // For now, deducting stock on order creation to reserve items
      // Ideally, for online payments, we should reserve and only deduct strictly on payment success hook
      product.inStock -= item.quantity;
      await product.save();
    }

    // Add tax (18%)
    const finalTotal = calculatedTotal * 1.18;

    // Validate total amount (allow small rounding differences)
    if (providedTotal && Math.abs(finalTotal - providedTotal) > 1) {
      console.warn(`Total amount mismatch: calculated ${finalTotal}, provided ${providedTotal}`);
      return res.status(400).json({ error: `Total amount mismatch. Calculated: ₹${finalTotal.toFixed(2)}, Provided: ₹${providedTotal.toFixed(2)}` });
    }

    let razorpayOrderId = null;
    let razorpayKey = null;

    if (paymentMethod === 'online' || paymentMethod === 'razorpay') {
      try {
        const isDummyKey = process.env.RAZORPAY_KEY_ID && (
          process.env.RAZORPAY_KEY_ID.includes('dummy') ||
          process.env.RAZORPAY_KEY_ID.includes('test_dummy')
        );

        if (isDummyKey) {
          // Mock Response for Testing
          console.log("Mocking Razorpay Order for Dummy Keys");
          razorpayOrderId = `order_mock_${Date.now()}`;
          razorpayKey = process.env.RAZORPAY_KEY_ID;
        } else {
          const options = {
            amount: Math.round(finalTotal * 100), // amount in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`
          };
          const orderResponse = await razorpay.orders.create(options);
          razorpayOrderId = orderResponse.id;
          razorpayKey = process.env.RAZORPAY_KEY_ID;
        }
      } catch (rzpError) {
        console.error("Razorpay Order Creation Failed:", rzpError);
        // If dummy keys are used or network fails, we'll return a specific error
        return res.status(500).json({
          error: 'Payment Gateway Error',
          details: 'Failed to initiate payment. Please verify backend Razorpay keys or try COD.'
        });
      }
    }

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      totalAmount: providedTotal || finalTotal,
      shippingAddress,
      paymentMethod: (paymentMethod === 'mock_online') ? 'online' : (paymentMethod || 'cod'),
      paymentStatus: (paymentMethod === 'mock_online') ? 'paid' : ((paymentMethod === 'online' || paymentMethod === 'razorpay') ? 'pending' : 'pending'),
      notes: notes || '',
      orderDate: new Date(),
      status: (paymentMethod === 'mock_online') ? 'confirmed' : 'pending',
      razorpayOrderId: razorpayOrderId
    });

    // Update user's default address with the new one used in this order
    if (req.user && req.user.id) {
      try {
        await User.findByIdAndUpdate(req.user.id, {
          $set: {
            address: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: shippingAddress.country || 'India'
          }
        });
        // Only update phone if not already present or if user wants it (simplified here for "last used")
        if (shippingAddress.phone && shippingAddress.phone !== req.user.phone) {
          await User.findByIdAndUpdate(req.user.id, { $set: { phone: shippingAddress.phone } });
        }
      } catch (userUpdateError) {
        console.error('Failed to update user address profile:', userUpdateError);
      }
    }

    await order.save();
    await order.populate('items.product', 'name image category');
    await order.populate('user', 'name email phone');

    // Return the response
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id,
      razorpayOrderId: razorpayOrderId,
      razorpayKey: razorpayKey,
      amount: Math.round(finalTotal * 100), // Amount in paisa for frontend
      currency: "INR",
      order: order.toObject()
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name image')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name image description')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, trackingNumber } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === 'delivered') order.deliveryDate = new Date();

    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel order in current status' });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.inStock += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;