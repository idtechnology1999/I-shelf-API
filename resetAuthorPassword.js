require('./config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Author = require('./models/Author.model');
const connectDB = require('./config/db');

async function resetAuthorPassword(email, newPassword) {
  try {
    await connectDB();
    
    const author = await Author.findOne({ email });
    if (!author) {
      console.log('Author not found');
      process.exit(1);
    }

    console.log('Found author:', author.email);
    console.log('Current isVerified:', author.isVerified);
    console.log('Current password hash:', author.password?.substring(0, 20) + '...');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    author.password = hashedPassword;
    await author.save();

    console.log('Password reset successfully!');
    console.log('New password hash:', hashedPassword.substring(0, 20) + '...');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Usage: node resetAuthorPassword.js email@example.com newPassword123
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node resetAuthorPassword.js <email> <password>');
  process.exit(1);
}

resetAuthorPassword(email, password);
