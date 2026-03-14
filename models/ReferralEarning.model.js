const mongoose = require('mongoose');

const referralEarningSchema = new mongoose.Schema({
  readerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reader', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  amount: { type: Number, default: 4000 },
  // pending = author hasn't paid yet, available = author paid, requested = reader requested payout, paid = admin paid
  status: { type: String, enum: ['pending', 'available', 'requested', 'paid'], default: 'pending' },
  payoutRequestedAt: { type: Date },
  paidAt: { type: Date },
  paidBy: { type: String }, // admin name/id
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReferralEarning', referralEarningSchema);
