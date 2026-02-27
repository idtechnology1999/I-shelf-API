const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  isbn: { type: String },
  coverImage: { type: String },
  pdfFile: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
