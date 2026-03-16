require('./config/env');
const mongoose = require('mongoose');
const Admin = require('./models/Admin.model');
const connectDB = require('./config/db');

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email: 'ishelfishelfishelf@gmail.com' });
    
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const superAdmin = new Admin({
      email: 'ishelfishelfishelf@gmail.com',
      password: null,
      fullName: 'Super Admin',
      role: 'superadmin',
      isActive: true,
      isSetupComplete: true
    });

    await superAdmin.save();
    console.log('Super admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
