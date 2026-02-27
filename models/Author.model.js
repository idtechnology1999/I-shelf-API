const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  institution: { type: String, required: true },
  governmentId: { type: String, required: true },
  institutionalEmail: { type: String },
  displayName: { type: String, required: true },
  areasOfExpertise: { type: String, required: true },
  shortBio: { type: String, required: true },
  profileImage: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'author' },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Author', authorSchema);
