const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  
  // Basic Details (Step 1)
  title: { type: String, required: true },
  subtitle: { type: String },
  coAuthors: { type: String },
  edition: { type: String },
  publisher: { type: String },
  publicationYear: { type: String, required: true },
  language: { type: String, required: true },
  
  // Additional fields for other steps
  isbn: { type: String },
  isbnVerified: { type: Boolean, default: false },
  isbnVerificationAttempted: { type: Boolean, default: false },
  titleMatch: { type: Boolean, default: false },
  foundTitle: { type: String },
  titleSimilarity: { type: Number, default: 0 },
  verificationSource: { type: String },
  category: { type: String },
  description: { type: String },
  keywords: [String],
  coverImage: { type: String },
  pdfFile: { type: String },
  pageCount: { type: Number },
  price: { type: Number },
  
  status: { type: String, enum: ['draft', 'pending', 'approved', 'published', 'rejected'], default: 'draft' },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
