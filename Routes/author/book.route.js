const express = require('express');
const multer = require('multer');
const Book = require('../../models/Book.model');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { verifyISBN } = require('../../services/isbn.service');
const { 
  coverStorage, 
  pdfStorage, 
  deleteFromCloudinary, 
  deletePdfFromCloudinary 
} = require('../../config/cloudinary');

const router = express.Router();

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// CREATE/UPDATE BOOK (Step by step)
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const bookData = req.body;

    const author = await Author.findById(authorId).select('hasPaidUploadFee');
    if (!author?.hasPaidUploadFee) {
      return res.status(403).json({ message: 'No active payment found. Please pay upload fee first.' });
    }

    let book = await Book.findOne({ authorId, status: 'draft' }).sort({ createdAt: -1 });

    if (book) {
      Object.assign(book, bookData);
      book.updatedAt = new Date();
      await book.save();
    } else {
      book = new Book({ authorId, ...bookData });
      await book.save();
    }

    res.json({ success: true, message: 'Book data saved successfully', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET CURRENT DRAFT BOOK
router.get('/draft', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const book = await Book.findOne({ authorId, status: 'draft' }).sort({ createdAt: -1 });
    res.json({ book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL AUTHOR'S BOOKS
router.get('/my-books', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const Transaction = require('../../models/Transaction.model');
    const books = await Book.find({ authorId }).sort({ createdAt: -1 });

    const booksWithSales = await Promise.all(books.map(async (book) => {
      const salesCount = await Transaction.countDocuments({ book: book._id, status: 'completed' });
      return { ...book.toObject(), salesCount };
    }));

    res.json({ books: booksWithSales });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE BOOK
router.patch('/:bookId', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const { bookId } = req.params;
    const bookData = req.body;

    const book = await Book.findOne({ _id: bookId, authorId });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if ISBN changed
    const isbnChanged = bookData.isbn && bookData.isbn !== book.isbn;

    Object.assign(book, bookData);
    book.updatedAt = new Date();
    
    // Reset ISBN verification if ISBN changed
    if (isbnChanged) {
      book.isbnVerified = false;
      book.isbnVerificationAttempted = false;
      book.titleMatch = false;
      book.foundTitle = null;
      book.titleSimilarity = 0;
      book.verificationSource = null;
    }
    
    await book.save();

    // Verify new ISBN in background
    if (isbnChanged) {
      setImmediate(async () => {
        try {
          const result = await verifyISBN(book.isbn, book.title);
          book.isbnVerified = result.verified;
          book.isbnVerificationAttempted = true;
          book.titleMatch = result.titleMatch;
          book.foundTitle = result.foundTitle;
          book.titleSimilarity = result.similarity;
          book.verificationSource = result.source;
          await book.save();
          console.log(`ISBN verification for ${book.isbn}: verified=${result.verified}, titleMatch=${result.titleMatch}`);
        } catch (error) {
          console.error('ISBN verification error:', error.message);
          book.isbnVerificationAttempted = true;
          await book.save();
        }
      });
    }

    res.json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// COMPLETE BOOK UPLOAD
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    const book = await Book.findOne({ authorId, status: 'draft' }).sort({ createdAt: -1 });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Set status to pending for admin review
    book.status = 'pending';
    await book.save();

    // Verify ISBN and title in background
    if (book.isbn && !book.isbnVerificationAttempted) {
      setImmediate(async () => {
        try {
          const result = await verifyISBN(book.isbn, book.title);
          book.isbnVerified = result.verified;
          book.isbnVerificationAttempted = true;
          book.titleMatch = result.titleMatch;
          book.foundTitle = result.foundTitle;
          book.titleSimilarity = result.similarity;
          book.verificationSource = result.source;
          
          // Auto-move to approved if ISBN is verified and title matches
          if (result.verified && result.titleMatch) {
            book.status = 'approved';
          }
          
          await book.save();
          console.log(`ISBN verification for ${book.isbn}: verified=${result.verified}, titleMatch=${result.titleMatch}, similarity=${result.similarity}%`);
        } catch (error) {
          console.error('ISBN verification error:', error.message);
          book.isbnVerificationAttempted = true;
          await book.save();
        }
      });
    }

    res.json({
      success: true,
      message: 'Book uploaded successfully and pending verification',
      book
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPLOAD COVER IMAGE
router.post('/upload-cover', authMiddleware, uploadCover.single('coverImage'), async (req, res) => {
  try {
    const authorId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const author = await Author.findById(authorId).select('hasPaidUploadFee');
    if (!author?.hasPaidUploadFee) {
      return res.status(403).json({ message: 'No active payment found' });
    }

    const book = await Book.findOne({ authorId, status: 'draft' }).sort({ createdAt: -1 });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete old cover from Cloudinary if exists
    if (book.coverImage && book.coverImagePublicId) {
      await deleteFromCloudinary(book.coverImagePublicId);
    }

    book.coverImage = req.file.path;
    book.coverImagePublicId = req.file.filename;
    await book.save();

    res.json({
      success: true,
      message: 'Cover image uploaded successfully',
      coverImage: book.coverImage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPLOAD PDF FILE
router.post('/upload-pdf', authMiddleware, uploadPdf.single('pdfFile'), async (req, res) => {
  try {
    const authorId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const author = await Author.findById(authorId).select('hasPaidUploadFee');
    if (!author?.hasPaidUploadFee) {
      return res.status(403).json({ message: 'No active payment found' });
    }

    const book = await Book.findOne({ authorId, status: 'draft' }).sort({ createdAt: -1 });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete old PDF from Cloudinary if exists
    if (book.pdfFile && book.pdfFilePublicId) {
      await deletePdfFromCloudinary(book.pdfFilePublicId);
    }

    book.pdfFile = req.file.path;
    book.pdfFilePublicId = req.file.filename;
    await book.save();

    res.json({
      success: true,
      message: 'PDF file uploaded successfully',
      pdfFile: book.pdfFile
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
