const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');
const router = express.Router();

// Get seller's products
router.get('/products', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const products = await Product.find({ seller: req.user._id })
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get seller's orders
router.get('/orders', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    // Find products by this seller
    const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    // Find orders containing these products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    })
    .populate('user', 'name email')
    .populate('items.product', 'name price image')
    .sort({ createdAt: -1 });

    // Filter orders to only include items from this seller
    const sellerOrders = orders.map(order => {
      const sellerItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product._id.toString())
      );
      
      return {
        ...order.toObject(),
        items: sellerItems,
        totalAmount: sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
    }).filter(order => order.items.length > 0);

    res.json(sellerOrders);
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get seller statistics
router.get('/stats', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    // Get seller's products
    const products = await Product.find({ seller: req.user._id });
    const productIds = products.map(p => p._id);

    // Get orders for seller's products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    });

    // Calculate statistics
    let totalSales = 0;
    let totalOrders = 0;
    let pendingOrders = 0;

    orders.forEach(order => {
      const sellerItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product.toString())
      );
      
      if (sellerItems.length > 0) {
        totalOrders++;
        if (order.status === 'pending') pendingOrders++;
        
        sellerItems.forEach(item => {
          totalSales += item.price * item.quantity;
        });
      }
    });

    const activeProducts = products.filter(p => p.inStock > 0).length;
    const totalProducts = products.length;

    res.json({
      totalSales: Number(totalSales.toFixed(2)),
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      outOfStockProducts: totalProducts - activeProducts
    });
  } catch (error) {
    console.error('Error fetching seller stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Update product
router.put('/products/:id', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const { 
      name, description, price, category, uses, quality, inStock, image, grade, quantityUnit,
      // Medicine-specific fields
      dosageForm, strength, activeIngredients, indications, dosage, contraindications, 
      sideEffects, expiryDate, batchNumber, manufacturer, licenseNumber
    } = req.body;

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? parseFloat(price) : product.price;
    product.category = category || product.category;
    product.uses = uses || product.uses;
    product.quality = quality || product.quality;
    product.grade = grade || product.grade;
    product.inStock = inStock !== undefined ? parseInt(inStock) : product.inStock;
    product.image = image || product.image;
    product.quantityUnit = quantityUnit || product.quantityUnit;

    // Update medicine-specific fields if category is Medicines
    if (category === 'Medicines' || product.category === 'Medicines') {
      product.dosageForm = dosageForm || product.dosageForm;
      product.strength = strength || product.strength;
      product.activeIngredients = activeIngredients || product.activeIngredients;
      product.indications = indications || product.indications;
      product.dosage = dosage || product.dosage;
      product.contraindications = contraindications || product.contraindications;
      product.sideEffects = sideEffects || product.sideEffects;
      product.expiryDate = expiryDate ? new Date(expiryDate) : product.expiryDate;
      product.batchNumber = batchNumber || product.batchNumber;
      product.manufacturer = manufacturer || product.manufacturer;
      product.licenseNumber = licenseNumber || product.licenseNumber;
    }

    await product.save();
    await product.populate('seller', 'name email');

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update order status
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify seller owns products in this order
    const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
    const productIds = sellerProducts.map(p => p._id.toString());
    
    const hasSellerProducts = order.items.some(item => 
      productIds.includes(item.product.toString())
    );

    if (!hasSellerProducts) {
      return res.status(403).json({ error: 'Access denied. No products from this seller in order.' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get seller profile
router.get('/profile', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profilePic: req.user.profilePic,
      role: req.user.role,
      department: req.user.department,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update seller profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const { name, phone, profilePic } = req.body;
    const Seller = require('../models/Seller');
    
    const seller = await Seller.findById(req.user._id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    seller.name = name || seller.name;
    seller.phone = phone || seller.phone;
    seller.profilePic = profilePic || seller.profilePic;

    await seller.save();

    res.json({
      id: seller._id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
      profilePic: seller.profilePic,
      role: seller.role
    });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change seller password
router.post('/change-password', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcryptjs');
    const Seller = require('../models/Seller');

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get seller with password field
    const seller = await Seller.findById(req.user._id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, seller.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    seller.password = hashedPassword;
    await seller.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing seller password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Leave Management Routes

// Get seller's leave applications
router.get('/leaves', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const leaves = await Leave.find({ seller: req.user._id })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
});

// Apply for leave
router.post('/leaves', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const { type, reason, description, startDate, endDate } = req.body;

    // Validation
    if (!type || !reason || !description || !startDate || !endDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (start < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const leave = new Leave({
      seller: req.user._id,
      type,
      reason,
      description,
      startDate: start,
      endDate: end
    });

    await leave.save();
    await leave.populate('seller', 'name email');

    res.status(201).json({
      message: 'Leave application submitted successfully. Admin will review and send email notification.',
      leave
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ error: 'Failed to submit leave application' });
  }
});

// Update leave application (only pending leaves)
router.put('/leaves/:id', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const leave = await Leave.findOne({ _id: req.params.id, seller: req.user._id });
    if (!leave) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot modify leave application that has been reviewed' });
    }

    const { type, reason, description, startDate, endDate } = req.body;

    if (type) leave.type = type;
    if (reason) leave.reason = reason;
    if (description) leave.description = description;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);

    await leave.save();
    res.json({ message: 'Leave application updated successfully', leave });
  } catch (error) {
    console.error('Error updating leave:', error);
    res.status(500).json({ error: 'Failed to update leave application' });
  }
});

// Cancel leave application (only pending leaves)
router.delete('/leaves/:id', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const leave = await Leave.findOne({ _id: req.params.id, seller: req.user._id });
    if (!leave) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel leave application that has been reviewed' });
    }

    // Mark as cancelled instead of deleting to preserve history
    leave.status = 'cancelled';
    await leave.save();

    res.json({ message: 'Leave application cancelled successfully', leave });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    res.status(500).json({ error: 'Failed to cancel leave application' });
  }
});

// Cancel an approved leave (before it starts)
router.put('/leaves/:id/cancel', auth, async (req, res) => {
  try {
    if (!['seller', 'employee', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
    }

    const leave = await Leave.findOne({ _id: req.params.id, seller: req.user._id });
    if (!leave) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    if (leave.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved leaves can be cancelled by the seller' });
    }

    const now = new Date();
    if (now >= leave.startDate) {
      return res.status(400).json({ error: 'Cannot cancel an approved leave on/after the start date' });
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json({ message: 'Leave cancelled successfully', leave });
  } catch (error) {
    console.error('Error cancelling approved leave:', error);
    res.status(500).json({ error: 'Failed to cancel approved leave' });
  }
});

module.exports = router;
