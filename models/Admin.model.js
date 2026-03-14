const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  fullName: { type: String },
  role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
  inviteToken: { type: String },
  inviteExpires: { type: Date },
  isSetupComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
