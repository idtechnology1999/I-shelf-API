const mongoose = require('mongoose');

const readerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  institution: { type: String },
  level: { type: String },
  department: { type: String },
  studentId: { type: String },
  profileImage: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'reader' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reader', readerSchema);
