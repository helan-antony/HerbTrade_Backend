# Hospital Setup Guide

## Problem
Users are getting "Hospital not found" errors when trying to book appointments because the hospital collection in the database is empty or doesn't have the correct data structure.

## Solution
We've created a comprehensive hospital seeding system that will populate your database with sample Ayurvedic hospitals.

## Quick Fix - Seed Sample Hospitals

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Run the Hospital Seeding Script
```bash
npm run seed-hospitals
```

Or directly:
```bash
node seedHospitals.js
```

### Step 3: Verify Hospitals Were Added
You can check if hospitals were added by:

1. **Using the debug endpoint** (in browser or Postman):
   ```
   GET http://localhost:5000/api/hospitals/debug/list
   ```

2. **Checking the regular hospitals endpoint**:
   ```
   GET http://localhost:5000/api/hospitals
   ```

## What the Seeding Script Does

The script adds 5 comprehensive Ayurvedic hospitals with:

### 🏥 **Shree Ayurvedic Medical Center** (Mumbai)
- **Specialties**: Panchakarma, Ayurvedic Medicine, Herbal Therapy
- **Doctors**: Dr. Rajesh Sharma, Dr. Priya Patel, Dr. Amit Kumar
- **Facilities**: Panchakarma Center, Herbal Pharmacy, Yoga Hall

### 🏥 **Vedic Wellness Hospital** (Delhi)
- **Specialties**: Traditional Ayurveda, Rasayana Therapy, Detoxification
- **Doctors**: Dr. Sunita Rao, Dr. Vikram Singh
- **Facilities**: Detox Center, Herbal Garden, Yoga Studio

### 🏥 **Ayurveda Healing Center** (Bangalore)
- **Specialties**: Chronic Disease Management, Skin & Hair Care, Mental Wellness
- **Doctors**: Dr. Meera Gupta, Dr. Arjun Nair, Dr. Kavitha Reddy
- **Facilities**: Specialized Treatment Rooms, Herbal Laboratory

### 🏥 **Kerala Ayurveda Institute** (Kochi)
- **Specialties**: Authentic Kerala Treatments, Abhyanga Therapy, Shirodhara
- **Doctors**: Dr. Radhika Menon, Dr. Suresh Pillai
- **Facilities**: Traditional Treatment Rooms, Herbal Steam Chambers

### 🏥 **Himalayan Ayurveda Clinic** (Rishikesh)
- **Specialties**: High Altitude Medicine, Respiratory Health, Spiritual Healing
- **Doctors**: Dr. Himalaya Sharma, Dr. Ganga Devi
- **Facilities**: Mountain View Treatment Rooms, Meditation Caves

## Features of Each Hospital

Each hospital includes:
- ✅ **Complete Contact Information** (phone, email, address)
- ✅ **Multiple Qualified Doctors** with specialties and consultation fees
- ✅ **Comprehensive Facilities** list
- ✅ **Working Hours** for all days
- ✅ **Geographic Coordinates** for location services
- ✅ **Verified Status** for trust indicators
- ✅ **Rating System** (4.3 - 4.8 stars)

## Troubleshooting

### If you still get "Hospital not found" errors:

1. **Check if the backend is running**:
   ```bash
   cd backend
   npm start
   ```

2. **Verify database connection**:
   - Make sure MongoDB is running
   - Check your `.env` file for correct `MONGODB_URI`

3. **Check hospital IDs**:
   - Visit: `http://localhost:5000/api/hospitals/debug/list`
   - Copy the correct hospital ID from the response

4. **Clear browser cache**:
   - Sometimes old data gets cached
   - Try refreshing the page or clearing browser cache

### If seeding fails:

1. **Check MongoDB connection**:
   ```bash
   # Make sure MongoDB is running
   mongosh # or mongo
   ```

2. **Check environment variables**:
   ```bash
   # In backend/.env file
   MONGODB_URI=mongodb://localhost:27017/herbtrade
   ```

3. **Manual database check**:
   ```javascript
   // In MongoDB shell
   use herbtrade
   db.hospitals.find().count()
   db.hospitals.find({}, {name: 1, _id: 1})
   ```

## Testing the Fix

After seeding:

1. **Go to Hospital Discovery page**: `/hospital-discovery`
2. **You should see 5 hospitals** listed
3. **Click "Book" on any hospital**
4. **You should be redirected** to the booking page without errors
5. **The hospital details** should load properly

## API Endpoints for Testing

- `GET /api/hospitals` - List all hospitals
- `GET /api/hospitals/debug/list` - Debug info with IDs
- `GET /api/hospitals/:id` - Get specific hospital
- `GET /api/hospitals/test` - Test if API is working

## Next Steps

Once hospitals are seeded and working:

1. **Test the booking flow** end-to-end
2. **Verify appointment creation** works
3. **Check the admin dashboard** for new bookings
4. **Test different hospitals** and doctors

The hospital booking system should now work perfectly with real Ayurvedic hospital data!
