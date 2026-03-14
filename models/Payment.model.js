const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  amount: { type: Number, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  paymentType: { type: String, default: 'upload_fee' },
  bookUploadCompleted: { type: Boolean, default: false },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
