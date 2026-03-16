const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  amount: { type: Number, required: true },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  transferCode: { type: String }, // Paystack transfer code
  transferReference: { type: String },
  paystackResponse: { type: Object },
  settledAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settlement', settlementSchema);
