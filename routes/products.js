const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, quality, sort } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { uses: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (quality) {
      query.quality = quality;
    }

    let sortOption = {};
    switch (sort) {
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const products = await Product.find(query)
      .populate('seller', 'name email')
      .sort(sortOption)
      .limit(50);

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email phone')
      .populate('ratings.user', 'name');
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { 
      name, description, price, image, category, uses, quality, inStock, grade, quantityUnit,
      // Medicine-specific fields
      dosageForm, strength, activeIngredients, indications, dosage, contraindications, 
      sideEffects, expiryDate, batchNumber, manufacturer, licenseNumber,
      geoIndication
    } = req.body;

    if (!name || !description || !price || !image || !category) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const productData = {
      name,
      description,
      price: parseFloat(price),
      image,
      category,
      uses: uses || [],
      quality: quality || 'Standard',
      grade: grade || 'A',
      inStock: parseInt(inStock) || 0,
      quantityUnit: quantityUnit || 'grams',
      seller: req.user.id
    };

    // Add medicine-specific fields if category is Medicines
    if (category === 'Medicines') {
      productData.dosageForm = dosageForm;
      productData.strength = strength;
      productData.activeIngredients = activeIngredients || [];
      productData.indications = indications || [];
      productData.dosage = dosage;
      productData.contraindications = contraindications;
      productData.sideEffects = sideEffects;
      productData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      productData.batchNumber = batchNumber;
      productData.manufacturer = manufacturer;
      productData.licenseNumber = licenseNumber;
    }

    // GI
    if (geoIndication) productData.geoIndication = String(geoIndication).trim();

    const product = new Product(productData);

    await product.save();
    await product.populate('seller', 'name email');

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (partial)
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const updatable = ['name','description','price','image','category','uses','quality','inStock','grade','quantityUnit','geoIndication'];
    updatable.forEach(k => {
      if (req.body[k] !== undefined) product[k] = req.body[k];
    });

    if ((req.body.category === 'Medicines') || product.category === 'Medicines') {
      const med = ['dosageForm','strength','activeIngredients','indications','dosage','contraindications','sideEffects','expiryDate','batchNumber','manufacturer','licenseNumber'];
      med.forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
    }

    await product.save();
    await product.populate('seller','name email');
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.post('/:id/rating', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const productId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingRating = product.ratings.find(r => r.user.toString() === req.user.id);
    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this product' });
    }

    product.ratings.push({
      user: req.user.id,
      rating: parseInt(rating),
      review: review || ''
    });

    await product.save();
    await product.populate('ratings.user', 'name');

    res.json(product);
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;