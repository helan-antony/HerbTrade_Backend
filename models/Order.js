const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  // Delivery assignment
  deliveryAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  deliveryStatus: {
    type: String,
    enum: ['unassigned', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'],
    default: 'unassigned'
  },
  deliveryNotes: String,
  deliveryEvents: [
    {
      status: String,
      message: String,
      at: { type: Date, default: Date.now }
    }
  ],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    fullName: String,
    address: String,
    phone: String
  },
  deliveryLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  paymentMethod: { type: String, enum: ['cod', 'online'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderDate: { type: Date, default: Date.now },
  deliveryDate: Date,
  trackingNumber: String,
  notes: String
});

// Add geospatial index for delivery location queries
orderSchema.index({ deliveryLocation: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);