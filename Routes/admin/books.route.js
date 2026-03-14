const express = require('express');
const Book = require('../../models/Book.model');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { verifyISBN } = require('../../services/isbn.service');

const router = express.Router();

// GET ALL BOOKS (with optional status and ISBN filter)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, isbnVerified } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (isbnVerified === 'true') filter.isbnVerified = true;
    if (isbnVerified === 'false') filter.isbnVerified = false;
    
    console.log('Fetching books with filter:', filter);
    
    const books = await Book.find(filter)
      .populate('authorId', 'fullName email displayName')
      .sort({ createdAt: -1 });

    console.log(`Found ${books.length} books`);
    
    res.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET BOOK BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('authorId', 'fullName email displayName institution');

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY ISBN FOR A SPECIFIC BOOK
router.post('/:id/verify-isbn', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (!book.isbn) {
      return res.status(400).json({ message: 'Book has no ISBN' });
    }

    const result = await verifyISBN(book.isbn, book.title);
    
    book.isbnVerified = result.verified;
    book.isbnVerificationAttempted = true;
    book.titleMatch = result.titleMatch;
    book.foundTitle = result.foundTitle;
    book.titleSimilarity = result.similarity;
    book.verificationSource = result.source;
    
    // Auto-move to approved if verified and title matches
    if (result.verified && result.titleMatch && book.status === 'pending') {
      book.status = 'approved';
    }
    
    await book.save();

    res.json({ 
      message: 'ISBN verification completed', 
      book,
      verification: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// BATCH VERIFY ALL PENDING BOOKS
router.post('/batch/verify-pending', authMiddleware, async (req, res) => {
  try {
    const pendingBooks = await Book.find({ 
      status: 'pending',
      isbn: { $exists: true, $ne: '' }
    });

    if (pendingBooks.length === 0) {
      return res.json({ message: 'No pending books with ISBN found', verified: 0, approved: 0 });
    }

    let verified = 0;
    let approved = 0;

    for (const book of pendingBooks) {
      try {
        const result = await verifyISBN(book.isbn, book.title);
        
        book.isbnVerified = result.verified;
        book.isbnVerificationAttempted = true;
        book.titleMatch = result.titleMatch;
        book.foundTitle = result.foundTitle;
        book.titleSimilarity = result.similarity;
        book.verificationSource = result.source;
        
        if (result.verified) verified++;
        
        // Auto-move to approved if verified and title matches
        if (result.verified && result.titleMatch) {
          book.status = 'approved';
          approved++;
        }
        
        await book.save();
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error verifying book ${book._id}:`, error.message);
      }
    }

    res.json({ 
      message: 'Batch verification completed',
      total: pendingBooks.length,
      verified,
      approved
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// APPROVE BOOK (Publish)
router.patch('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book approved successfully', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUBLISH BOOK (Move from approved to published)
router.patch('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book published successfully', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// REJECT BOOK
router.patch('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book rejected', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE BOOK
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
