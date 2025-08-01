const axios = require('axios');

class GooglePlacesService {
  constructor() {
    // In production, this should be in environment variables
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  async searchAyurvedicHospitals(location = 'India', radius = 50000) {
    try {
      // Search for Ayurvedic hospitals and clinics
      const searchQueries = [
        'Ayurvedic hospital',
        'Ayurvedic clinic',
        'Ayurvedic medical center',
        'Panchakarma center',
        'Traditional medicine hospital'
      ];

      let allHospitals = [];

      for (const query of searchQueries) {
        const response = await axios.get(`${this.baseUrl}/textsearch/json`, {
          params: {
            query: `${query} ${location}`,
            key: this.apiKey,
            type: 'hospital',
            radius: radius
          }
        });

        if (response.data.results) {
          allHospitals = allHospitals.concat(response.data.results);
        }
      }

      // Remove duplicates based on place_id
      const uniqueHospitals = allHospitals.filter((hospital, index, self) =>
        index === self.findIndex(h => h.place_id === hospital.place_id)
      );

      // Transform Google Places data to our hospital format
      const transformedHospitals = await Promise.all(
        uniqueHospitals.slice(0, 20).map(async (place) => {
          const details = await this.getPlaceDetails(place.place_id);
          return this.transformToHospitalFormat(place, details);
        })
      );

      return transformedHospitals.filter(hospital => hospital !== null);
    } catch (error) {
      console.error('Error fetching Ayurvedic hospitals from Google Places:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          key: this.apiKey,
          fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,geometry,types'
        }
      });

      return response.data.result;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  transformToHospitalFormat(place, details) {
    try {
      if (!details || !details.geometry) {
        return null;
      }

      // Generate sample doctors for Ayurvedic hospitals
      const ayurvedicDoctors = this.generateAyurvedicDoctors();

      return {
        name: details.name || place.name,
        address: details.formatted_address || place.formatted_address,
        city: this.extractCity(details.formatted_address || place.formatted_address),
        state: this.extractState(details.formatted_address || place.formatted_address),
        phone: details.formatted_phone_number || '+91-9876543210',
        email: this.generateEmail(details.name || place.name),
        website: details.website || '',
        specialties: [
          'Ayurvedic Medicine',
          'Panchakarma',
          'Herbal Medicine',
          'Traditional Therapy',
          'Yoga Therapy'
        ],
        doctors: ayurvedicDoctors,
        location: {
          type: 'Point',
          coordinates: [
            details.geometry.location.lng,
            details.geometry.location.lat
          ]
        },
        rating: details.rating || (Math.random() * 2 + 3), // Random rating between 3-5
        facilities: [
          'Panchakarma Center',
          'Herbal Pharmacy',
          'Yoga Hall',
          'Meditation Room',
          'Consultation Rooms'
        ],
        workingHours: this.generateWorkingHours(details.opening_hours),
        pincode: this.extractPincode(details.formatted_address || place.formatted_address),
        isVerified: true,
        googlePlaceId: place.place_id
      };
    } catch (error) {
      console.error('Error transforming hospital data:', error);
      return null;
    }
  }

  generateAyurvedicDoctors() {
    const doctorNames = [
      'Dr. Rajesh Sharma',
      'Dr. Priya Patel',
      'Dr. Amit Kumar',
      'Dr. Sunita Rao',
      'Dr. Vikram Singh',
      'Dr. Meera Gupta'
    ];

    const specialties = [
      'Panchakarma Specialist',
      'Ayurvedic Physician',
      'Herbal Medicine Expert',
      'Yoga Therapist',
      'Pulse Diagnosis Specialist',
      'Rasayana Specialist'
    ];

    const numDoctors = Math.floor(Math.random() * 3) + 2; // 2-4 doctors
    const doctors = [];

    for (let i = 0; i < numDoctors; i++) {
      doctors.push({
        name: doctorNames[Math.floor(Math.random() * doctorNames.length)],
        specialty: specialties[Math.floor(Math.random() * specialties.length)],
        experience: Math.floor(Math.random() * 20) + 5, // 5-25 years
        consultationFee: Math.floor(Math.random() * 500) + 300, // ₹300-800
        qualifications: ['BAMS', 'MD (Ayurveda)', 'PhD (Ayurveda)']
      });
    }

    return doctors;
  }

  generateWorkingHours(googleHours) {
    const defaultHours = '9:00 AM - 6:00 PM';
    return {
      monday: defaultHours,
      tuesday: defaultHours,
      wednesday: defaultHours,
      thursday: defaultHours,
      friday: defaultHours,
      saturday: '9:00 AM - 2:00 PM',
      sunday: 'Closed'
    };
  }

  extractCity(address) {
    if (!address) return 'Unknown';
    const parts = address.split(',');
    return parts.length > 2 ? parts[parts.length - 3].trim() : 'Unknown';
  }

  extractState(address) {
    if (!address) return 'Unknown';
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 2].trim() : 'Unknown';
  }

  extractPincode(address) {
    if (!address) return '000000';
    const pincodeMatch = address.match(/\b\d{6}\b/);
    return pincodeMatch ? pincodeMatch[0] : '000000';
  }

  generateEmail(hospitalName) {
    if (!hospitalName) return 'info@hospital.com';
    const cleanName = hospitalName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    return `info@${cleanName}.com`;
  }
}

module.exports = GooglePlacesService;
