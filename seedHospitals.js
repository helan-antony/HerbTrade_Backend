const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

// Sample Ayurvedic hospitals data
const sampleHospitals = [
  {
    name: "Shree Ayurvedic Medical Center",
    address: "123 Wellness Street, Ayurveda Nagar, Mumbai, Maharashtra 400001",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400001",
    phone: "+91-9876543210",
    email: "info@shreeayurvedic.com",
    website: "https://shreeayurvedic.com",
    specialties: [
      "Panchakarma",
      "Ayurvedic Medicine",
      "Herbal Therapy",
      "Yoga Therapy",
      "Pulse Diagnosis"
    ],
    doctors: [
      {
        name: "Dr. Rajesh Sharma",
        specialty: "Panchakarma Specialist",
        phone: "+91-9876543211",
        email: "dr.rajesh@shreeayurvedic.com",
        experience: 15,
        consultationFee: 500,
        qualifications: ["BAMS", "MD (Ayurveda)", "PhD (Panchakarma)"]
      },
      {
        name: "Dr. Priya Patel",
        specialty: "Ayurvedic Physician",
        phone: "+91-9876543212",
        email: "dr.priya@shreeayurvedic.com",
        experience: 12,
        consultationFee: 450,
        qualifications: ["BAMS", "MD (Ayurveda)"]
      },
      {
        name: "Dr. Amit Kumar",
        specialty: "Herbal Medicine Expert",
        phone: "+91-9876543213",
        email: "dr.amit@shreeayurvedic.com",
        experience: 10,
        consultationFee: 400,
        qualifications: ["BAMS", "Diploma in Herbal Medicine"]
      }
    ],
    location: {
      type: "Point",
      coordinates: [72.8777, 19.0760] // Mumbai coordinates
    },
    rating: 4.5,
    facilities: [
      "Panchakarma Center",
      "Herbal Pharmacy",
      "Yoga Hall",
      "Meditation Room",
      "Consultation Rooms",
      "Steam Bath",
      "Oil Massage Rooms"
    ],
    workingHours: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 6:00 PM",
      saturday: "9:00 AM - 2:00 PM",
      sunday: "Closed"
    },
    pincode: "400001",
    isVerified: true
  },
  {
    name: "Vedic Wellness Hospital",
    address: "456 Traditional Lane, Herbal Gardens, Delhi, Delhi 110001",
    city: "Delhi",
    state: "Delhi",
    zipCode: "110001",
    phone: "+91-9876543220",
    email: "contact@vedicwellness.com",
    website: "https://vedicwellness.com",
    specialties: [
      "Traditional Ayurveda",
      "Rasayana Therapy",
      "Detoxification",
      "Stress Management",
      "Women's Health"
    ],
    doctors: [
      {
        name: "Dr. Sunita Rao",
        specialty: "Rasayana Specialist",
        phone: "+91-9876543221",
        email: "dr.sunita@vedicwellness.com",
        experience: 18,
        consultationFee: 600,
        qualifications: ["BAMS", "MD (Ayurveda)", "PhD (Rasayana)"]
      },
      {
        name: "Dr. Vikram Singh",
        specialty: "Detox Specialist",
        phone: "+91-9876543222",
        email: "dr.vikram@vedicwellness.com",
        experience: 14,
        consultationFee: 550,
        qualifications: ["BAMS", "MD (Ayurveda)", "Diploma in Detox Therapy"]
      }
    ],
    location: {
      type: "Point",
      coordinates: [77.2090, 28.6139] // Delhi coordinates
    },
    rating: 4.3,
    facilities: [
      "Detox Center",
      "Herbal Garden",
      "Yoga Studio",
      "Meditation Center",
      "Consultation Rooms",
      "Therapy Rooms",
      "Herbal Kitchen"
    ],
    workingHours: {
      monday: "8:00 AM - 7:00 PM",
      tuesday: "8:00 AM - 7:00 PM",
      wednesday: "8:00 AM - 7:00 PM",
      thursday: "8:00 AM - 7:00 PM",
      friday: "8:00 AM - 7:00 PM",
      saturday: "8:00 AM - 4:00 PM",
      sunday: "10:00 AM - 2:00 PM"
    },
    pincode: "110001",
    isVerified: true
  },
  {
    name: "Ayurveda Healing Center",
    address: "789 Holistic Avenue, Natural Health District, Bangalore, Karnataka 560001",
    city: "Bangalore",
    state: "Karnataka",
    zipCode: "560001",
    phone: "+91-9876543230",
    email: "info@ayurvedahealing.com",
    website: "https://ayurvedahealing.com",
    specialties: [
      "Chronic Disease Management",
      "Skin & Hair Care",
      "Digestive Health",
      "Mental Wellness",
      "Immunity Boosting"
    ],
    doctors: [
      {
        name: "Dr. Meera Gupta",
        specialty: "Chronic Disease Specialist",
        phone: "+91-9876543231",
        email: "dr.meera@ayurvedahealing.com",
        experience: 20,
        consultationFee: 700,
        qualifications: ["BAMS", "MD (Ayurveda)", "PhD (Chronic Diseases)"]
      },
      {
        name: "Dr. Arjun Nair",
        specialty: "Skin & Hair Specialist",
        phone: "+91-9876543232",
        email: "dr.arjun@ayurvedahealing.com",
        experience: 8,
        consultationFee: 350,
        qualifications: ["BAMS", "Diploma in Dermatology"]
      },
      {
        name: "Dr. Kavitha Reddy",
        specialty: "Mental Wellness Expert",
        phone: "+91-9876543233",
        email: "dr.kavitha@ayurvedahealing.com",
        experience: 16,
        consultationFee: 500,
        qualifications: ["BAMS", "MD (Ayurveda)", "Diploma in Psychology"]
      }
    ],
    location: {
      type: "Point",
      coordinates: [77.5946, 12.9716] // Bangalore coordinates
    },
    rating: 4.7,
    facilities: [
      "Specialized Treatment Rooms",
      "Herbal Laboratory",
      "Yoga & Meditation Hall",
      "Counseling Rooms",
      "Pharmacy",
      "Diagnostic Center",
      "Wellness Cafe"
    ],
    workingHours: {
      monday: "9:00 AM - 8:00 PM",
      tuesday: "9:00 AM - 8:00 PM",
      wednesday: "9:00 AM - 8:00 PM",
      thursday: "9:00 AM - 8:00 PM",
      friday: "9:00 AM - 8:00 PM",
      saturday: "9:00 AM - 5:00 PM",
      sunday: "10:00 AM - 3:00 PM"
    },
    pincode: "560001",
    isVerified: true
  },
  {
    name: "Kerala Ayurveda Institute",
    address: "321 Coconut Grove, Backwater Road, Kochi, Kerala 682001",
    city: "Kochi",
    state: "Kerala",
    zipCode: "682001",
    phone: "+91-9876543240",
    email: "contact@keralaayurveda.org",
    website: "https://keralaayurveda.org",
    specialties: [
      "Authentic Kerala Treatments",
      "Abhyanga Therapy",
      "Shirodhara",
      "Kizhi Treatments",
      "Marma Therapy"
    ],
    doctors: [
      {
        name: "Dr. Radhika Menon",
        specialty: "Kerala Ayurveda Expert",
        phone: "+91-9876543241",
        email: "dr.radhika@keralaayurveda.org",
        experience: 25,
        consultationFee: 800,
        qualifications: ["BAMS", "MD (Ayurveda)", "Traditional Kerala Therapy Certification"]
      },
      {
        name: "Dr. Suresh Pillai",
        specialty: "Marma Therapy Specialist",
        phone: "+91-9876543242",
        email: "dr.suresh@keralaayurveda.org",
        experience: 22,
        consultationFee: 650,
        qualifications: ["BAMS", "MD (Ayurveda)", "Marma Therapy Certification"]
      }
    ],
    location: {
      type: "Point",
      coordinates: [76.2673, 9.9312] // Kochi coordinates
    },
    rating: 4.8,
    facilities: [
      "Traditional Treatment Rooms",
      "Herbal Steam Chambers",
      "Oil Preparation Unit",
      "Yoga Pavilion",
      "Meditation Garden",
      "Ayurvedic Kitchen",
      "Research Library"
    ],
    workingHours: {
      monday: "7:00 AM - 7:00 PM",
      tuesday: "7:00 AM - 7:00 PM",
      wednesday: "7:00 AM - 7:00 PM",
      thursday: "7:00 AM - 7:00 PM",
      friday: "7:00 AM - 7:00 PM",
      saturday: "7:00 AM - 5:00 PM",
      sunday: "8:00 AM - 4:00 PM"
    },
    pincode: "682001",
    isVerified: true
  },
  {
    name: "Himalayan Ayurveda Clinic",
    address: "567 Mountain View, Herbal Valley, Rishikesh, Uttarakhand 249201",
    city: "Rishikesh",
    state: "Uttarakhand",
    zipCode: "249201",
    phone: "+91-9876543250",
    email: "info@himalayanayurveda.com",
    website: "https://himalayanayurveda.com",
    specialties: [
      "High Altitude Medicine",
      "Respiratory Health",
      "Joint & Bone Care",
      "Spiritual Healing",
      "Meditation Therapy"
    ],
    doctors: [
      {
        name: "Dr. Himalaya Sharma",
        specialty: "High Altitude Specialist",
        phone: "+91-9876543251",
        email: "dr.himalaya@himalayanayurveda.com",
        experience: 30,
        consultationFee: 900,
        qualifications: ["BAMS", "MD (Ayurveda)", "High Altitude Medicine Certification"]
      },
      {
        name: "Dr. Ganga Devi",
        specialty: "Respiratory Health Expert",
        phone: "+91-9876543252",
        email: "dr.ganga@himalayanayurveda.com",
        experience: 19,
        consultationFee: 550,
        qualifications: ["BAMS", "MD (Ayurveda)", "Respiratory Therapy Certification"]
      }
    ],
    location: {
      type: "Point",
      coordinates: [78.2676, 30.0869] // Rishikesh coordinates
    },
    rating: 4.6,
    facilities: [
      "Mountain View Treatment Rooms",
      "Herbal Garden",
      "Meditation Caves",
      "Yoga Deck",
      "Natural Spring Water Therapy",
      "Organic Pharmacy",
      "Spiritual Counseling Center"
    ],
    workingHours: {
      monday: "6:00 AM - 6:00 PM",
      tuesday: "6:00 AM - 6:00 PM",
      wednesday: "6:00 AM - 6:00 PM",
      thursday: "6:00 AM - 6:00 PM",
      friday: "6:00 AM - 6:00 PM",
      saturday: "6:00 AM - 4:00 PM",
      sunday: "7:00 AM - 3:00 PM"
    },
    pincode: "249201",
    isVerified: true
  }
];

async function seedHospitals() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/herbtrade', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing hospitals (optional - comment out if you want to keep existing ones)
    // await Hospital.deleteMany({});
    // console.log('Cleared existing hospitals');

    // Check if hospitals already exist
    const existingCount = await Hospital.countDocuments();
    console.log(`Found ${existingCount} existing hospitals`);

    if (existingCount < 3) {
      // Insert sample hospitals
      const insertedHospitals = await Hospital.insertMany(sampleHospitals);
      console.log(`Successfully seeded ${insertedHospitals.length} hospitals`);
      
      // Display the inserted hospital IDs for reference
      insertedHospitals.forEach((hospital, index) => {
        console.log(`${index + 1}. ${hospital.name} - ID: ${hospital._id}`);
      });
    } else {
      console.log('Hospitals already exist. Skipping seeding.');
      
      // Display existing hospital IDs
      const existingHospitals = await Hospital.find({}, 'name _id');
      console.log('Existing hospitals:');
      existingHospitals.forEach((hospital, index) => {
        console.log(`${index + 1}. ${hospital.name} - ID: ${hospital._id}`);
      });
    }

    console.log('Hospital seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding hospitals:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedHospitals();
