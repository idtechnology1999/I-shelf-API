const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  readerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reader', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  addedAt: { type: Date, default: Date.now }
});

// Ensure a reader can't add the same book twice
cartSchema.index({ readerId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);