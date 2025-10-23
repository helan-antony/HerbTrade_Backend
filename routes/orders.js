const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

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

      // Update product stock
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

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      totalAmount: providedTotal || finalTotal,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
      notes: notes || '',
      orderDate: new Date(),
      status: 'pending'
    });

    await order.save();
    await order.populate('items.product', 'name image category');
    await order.populate('user', 'name email phone');

    // Return the order ID for frontend navigation
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id,
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