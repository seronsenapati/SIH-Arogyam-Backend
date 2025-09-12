const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Profile = require('../models/Profile');
const AvailabilityTemplate = require('../models/AvailabilityTemplate');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');

  try {
    // Clear existing data
    await User.deleteMany({});
    await Profile.deleteMany({});
    await AvailabilityTemplate.deleteMany({});
    
    console.log('Cleared existing data');

    // Create sample users
    const patient = new User({
      email: 'patient@example.com',
      passwordHash: 'password123',
      role: 'patient',
      isVerified: true
    });
    
    const doctor = new User({
      email: 'doctor@example.com',
      passwordHash: 'password123',
      role: 'doctor',
      isVerified: true
    });
    
    const admin = new User({
      email: 'admin@example.com',
      passwordHash: 'password123',
      role: 'admin',
      isVerified: true
    });
    
    await Promise.all([
      patient.save(),
      doctor.save(),
      admin.save()
    ]);
    
    console.log('Created sample users');

    // Create sample profiles
    const patientProfile = new Profile({
      userId: patient._id,
      firstName: 'John',
      lastName: 'Patient',
      bio: 'Sample patient profile',
      phone: '+1234567890'
    });
    
    const doctorProfile = new Profile({
      userId: doctor._id,
      firstName: 'Bob',
      lastName: 'Doctor',
      bio: 'Sample doctor profile',
      phone: '+1234567892',
      specialization: 'Cardiology'
    });
    
    const adminProfile = new Profile({
      userId: admin._id,
      firstName: 'Admin',
      lastName: 'User',
      bio: 'Sample admin profile',
      phone: '+1234567893'
    });
    
    await Promise.all([
      patientProfile.save(),
      doctorProfile.save(),
      adminProfile.save()
    ]);
    
    console.log('Created sample profiles');

    console.log('Sample data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
});