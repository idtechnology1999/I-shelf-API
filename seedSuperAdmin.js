require('./config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin.model');
const connectDB = require('./config/db');

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email: 'owolabiidowu99@gmail.com' });
    
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('superadmin', 10);
    
    const superAdmin = new Admin({
      email: 'owolabiidowu99@gmail.com',
      password: hashedPassword,
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
