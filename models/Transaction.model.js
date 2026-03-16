const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reader: { type: mongoose.Schema.Types.ObjectId, ref: 'Reader', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  amount: { type: Number, required: true },
  authorAmount: { type: Number, required: true }, // 80%
  platformCommission: { type: Number, required: true }, // 20%
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  settled: { type: Boolean, default: false }, // Track if author has been paid
  settledAt: { type: Date },
  paymentReference: { type: String, unique: true },
  paystackResponse: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
