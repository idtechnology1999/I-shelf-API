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
  
  // Bank Account for Paystack Subaccount
  bankAccount: {
    accountNumber: String,
    accountName: String,
    bankName: String,
    bankCode: String
  },
  
  // Paystack Subaccount (for receiving 80% of book sales)
  subaccountCode: { type: String },
  hasPaidUploadFee: { type: Boolean, default: false },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Reader' }, // reader who referred this author
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Author', authorSchema);
