const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
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
      totalSales: totalSales.toFixed(2),
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

    const { name, description, price, category, uses, quality, inStock } = req.body;

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? parseFloat(price) : product.price;
    product.category = category || product.category;
    product.uses = uses || product.uses;
    product.quality = quality || product.quality;
    product.inStock = inStock !== undefined ? parseInt(inStock) : product.inStock;

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

module.exports = router;
