const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  uses: [String],
  quality: { type: String, enum: ['Premium', 'Standard', 'Organic'], default: 'Standard' },
  grade: { type: String, enum: ['A+', 'A', 'B', 'Premium'], default: 'A' },
  inStock: { type: Number, default: 0 },
  quantityUnit: { type: String, enum: ['grams', 'count'], default: 'grams' },
  
  // Medicine-specific fields
  dosageForm: { type: String }, // tablet, capsule, syrup, powder, oil, churna, vati, etc.
  strength: { type: String }, // e.g., 500mg, 10ml
  activeIngredients: [String], // main ingredients
  indications: [String], // what it treats
  dosage: { type: String }, // how to take
  contraindications: { type: String }, // when not to use
  sideEffects: { type: String }, // possible side effects
  expiryDate: { type: Date },
  batchNumber: { type: String },
  manufacturer: { type: String },
  licenseNumber: { type: String },
  
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  geoIndication: { type: String, default: '' }, // e.g., Malabar Pepper, Darjeeling Tea
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = sum / this.ratings.length;
    this.totalRatings = this.ratings.length;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);