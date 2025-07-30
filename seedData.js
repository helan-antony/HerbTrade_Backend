const mongoose = require('mongoose');
const Product = require('./models/Product');
const Hospital = require('./models/Hospital');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const sampleProducts = [
  {
    name: 'Premium Organic Tulsi Powder',
    description: 'Pure organic Tulsi (Holy Basil) powder for immunity and respiratory health. Sourced from certified organic farms.',
    price: 299,
    image: '/assets/tulsi.png',
    category: 'Immunity Boosters',
    uses: ['Immunity booster', 'Respiratory health', 'Stress relief', 'Fever reduction'],
    quality: 'Organic',
    inStock: 50
  },
  {
    name: 'Ashwagandha Root Extract Capsules',
    description: 'High-potency Ashwagandha root extract capsules for stress relief and energy enhancement.',
    price: 599,
    image: '/assets/ashwagandha.png',
    category: 'Stress Relief',
    uses: ['Stress relief', 'Energy boost', 'Sleep improvement', 'Muscle strength'],
    quality: 'Premium',
    inStock: 30
  },
  {
    name: 'Pure Neem Leaf Powder',
    description: 'Natural Neem leaf powder for skin care and blood purification. 100% pure and natural.',
    price: 199,
    image: '/assets/neem.png',
    category: 'Skin Care',
    uses: ['Skin care', 'Blood purification', 'Detoxification', 'Dental health'],
    quality: 'Standard',
    inStock: 75
  },
  {
    name: 'Brahmi Memory Enhancement Tablets',
    description: 'Brahmi tablets for cognitive enhancement and memory improvement. Clinically tested formula.',
    price: 449,
    image: '/assets/brahmi.png',
    category: 'Brain Health',
    uses: ['Memory enhancement', 'Cognitive function', 'Anxiety relief', 'Mental clarity'],
    quality: 'Premium',
    inStock: 40
  },
  {
    name: 'Organic Turmeric Powder',
    description: 'High-curcumin organic turmeric powder with anti-inflammatory properties.',
    price: 249,
    image: '/assets/organic turmeric.png',
    category: 'Anti-inflammatory',
    uses: ['Anti-inflammatory', 'Joint health', 'Digestive health', 'Wound healing'],
    quality: 'Organic',
    inStock: 60
  },
  {
    name: 'Fresh Ginger Root Extract',
    description: 'Concentrated ginger root extract for digestive health and nausea relief.',
    price: 179,
    image: '/assets/ginger.png',
    category: 'Digestive Health',
    uses: ['Nausea relief', 'Digestive health', 'Inflammation reduction', 'Cold relief'],
    quality: 'Standard',
    inStock: 45
  }
];

const sampleHospitals = [
  {
    name: 'Ayurveda Wellness Center',
    address: '123 Wellness Street, Connaught Place',
    city: 'Delhi',
    state: 'Delhi',
    zipCode: '110001',
    phone: '+91-9876543210',
    email: 'info@ayurvedawellness.com',
    website: 'www.ayurvedawellness.com',
    specialties: ['Immunity Boosters', 'Stress Relief', 'Digestive Health'],
    doctors: [
      {
        name: 'Dr. Rajesh Sharma',
        specialty: 'Ayurvedic Medicine',
        phone: '+91-9876543211',
        email: 'dr.sharma@ayurvedawellness.com'
      },
      {
        name: 'Dr. Priya Gupta',
        specialty: 'Herbal Medicine',
        phone: '+91-9876543212',
        email: 'dr.gupta@ayurvedawellness.com'
      }
    ],
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139] 
    },
    rating: 4.5,
    facilities: ['Consultation', 'Herbal Pharmacy', 'Panchakarma', 'Yoga Therapy'],
    workingHours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '9:00 AM - 2:00 PM',
      sunday: 'Closed'
    },
    isVerified: true
  },
  {
    name: 'Herbal Health Hospital',
    address: '456 Health Avenue, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400050',
    phone: '+91-9123456780',
    email: 'contact@herbalhealth.com',
    website: 'www.herbalhealth.com',
    specialties: ['Skin Care', 'Brain Health', 'Anti-inflammatory'],
    doctors: [
      {
        name: 'Dr. Amit Patel',
        specialty: 'Integrative Medicine',
        phone: '+91-9123456781',
        email: 'dr.patel@herbalhealth.com'
      },
      {
        name: 'Dr. Sunita Mehta',
        specialty: 'Naturopathy',
        phone: '+91-9123456782',
        email: 'dr.mehta@herbalhealth.com'
      }
    ],
    location: {
      type: 'Point',
      coordinates: [72.8777, 19.0760] 
    },
    rating: 4.2,
    facilities: ['Emergency Care', 'Herbal Treatments', 'Detox Programs', 'Wellness Counseling'],
    workingHours: {
      monday: '8:00 AM - 8:00 PM',
      tuesday: '8:00 AM - 8:00 PM',
      wednesday: '8:00 AM - 8:00 PM',
      thursday: '8:00 AM - 8:00 PM',
      friday: '8:00 AM - 8:00 PM',
      saturday: '8:00 AM - 4:00 PM',
      sunday: '10:00 AM - 2:00 PM'
    },
    isVerified: true
  },
  {
    name: 'Natural Healing Clinic',
    address: '789 Green Valley Road, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    zipCode: '560034',
    phone: '+91-8765432109',
    email: 'info@naturalhealing.com',
    website: 'www.naturalhealing.com',
    specialties: ['Digestive Health', 'Immunity Boosters', 'Stress Relief'],
    doctors: [
      {
        name: 'Dr. Kavitha Reddy',
        specialty: 'Ayurvedic Physician',
        phone: '+91-8765432110',
        email: 'dr.reddy@naturalhealing.com'
      }
    ],
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    rating: 4.7,
    facilities: ['Herbal Consultation', 'Meditation Center', 'Organic Pharmacy'],
    workingHours: {
      monday: '9:00 AM - 7:00 PM',
      tuesday: '9:00 AM - 7:00 PM',
      wednesday: '9:00 AM - 7:00 PM',
      thursday: '9:00 AM - 7:00 PM',
      friday: '9:00 AM - 7:00 PM',
      saturday: '9:00 AM - 1:00 PM',
      sunday: 'Closed'
    },
    isVerified: true
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/herbtrade', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    let seller = await User.findOne({ email: 'seller@herbtrade.com' });
    if (!seller) {
      const hashedPassword = await bcrypt.hash('seller123', 10);
      seller = await User.create({
        name: 'Sample Seller',
        email: 'seller@herbtrade.com',
        phone: '9999999999',
        password: hashedPassword,
        role: 'seller',
        isActive: true
      });
      console.log('Sample seller created');
    }

    await Product.deleteMany({});
    await Hospital.deleteMany({});
    console.log('Cleared existing data');

    const productsWithSeller = sampleProducts.map(product => ({
      ...product,
      seller: seller._id
    }));

    await Product.insertMany(productsWithSeller);
    console.log(`Inserted ${sampleProducts.length} sample products`);

    await Hospital.insertMany(sampleHospitals);
    console.log(`Inserted ${sampleHospitals.length} sample hospitals`);

    console.log('Database seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();