require('./config/env');
const mongoose = require('mongoose');
const Admin = require('./models/Admin.model');

async function listAdmins() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database\n');

    const admins = await Admin.find();
    
    if (admins.length === 0) {
      console.log('❌ No admins found in database!\n');
      console.log('To create a super admin, run:');
      console.log('node seedSuperAdmin.js\n');
    } else {
      console.log(`✓ Found ${admins.length} admin(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Email: ${admin.email}`);
        console.log(`   Full Name: ${admin.fullName || 'N/A'}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Setup Complete: ${admin.isSetupComplete}`);
        console.log(`   Active: ${admin.isActive}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAdmins();
