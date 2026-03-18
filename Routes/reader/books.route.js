const express = require('express');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL PUBLISHED BOOKS
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = { status: { $nin: ['draft', 'rejected', 'deleted'] } };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    const books = await Book.find(query)
      .populate('authorId', 'displayName fullName')
      .sort({ createdAt: -1 })
      .limit(50);

    // Filter out books with deleted authors
    const validBooks = books.filter(book => book.authorId);

    res.json({ books: validBooks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET READER'S PURCHASED BOOKS
router.get('/my/purchases', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;

    const transactions = await Transaction.find({ 
      reader: readerId, 
      status: 'completed' 
    })
    .populate({ path: 'book', populate: { path: 'authorId', select: 'displayName fullName' } })
    .populate('author', 'displayName fullName')
    .sort({ createdAt: -1 });

    res.json({ purchases: transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DOWNLOAD PURCHASED BOOK
router.get('/download/:bookId', async (req, res) => {
  try {
    let readerId;
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token;
    const jwt = require('jsonwebtoken');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try { readerId = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET).id; }
      catch { return res.status(401).json({ message: 'Invalid token' }); }
    } else if (tokenFromQuery) {
      try { readerId = jwt.verify(tokenFromQuery, process.env.JWT_SECRET).id; }
      catch { return res.status(401).json({ message: 'Invalid token' }); }
    } else {
      return res.status(401).json({ message: 'No token provided' });
    }

    const { bookId } = req.params;
    const transaction = await Transaction.findOne({ reader: readerId, book: bookId, status: 'completed' });
    if (!transaction) return res.status(403).json({ message: 'You have not purchased this book' });

    const book = await Book.findById(bookId);
    if (!book || !book.pdfFile) return res.status(404).json({ message: 'Book file not found' });

    // Use stored extension, fall back to detecting from URL last segment, default pdf
    const ext = book.pdfFileExt || (() => {
      const lastSegment = (book.pdfFile.split('?')[0].split('/').pop() || '');
      const dotIndex = lastSegment.lastIndexOf('.');
      return dotIndex !== -1 ? lastSegment.substring(dotIndex + 1).toLowerCase() : 'pdf';
    })();
    const safeTitle = (book.title || 'book').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const filename = `${safeTitle}.${ext}`;

    const https = require('https');
    const http = require('http');
    const protocol = book.pdfFile.startsWith('https') ? https : http;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', ext === 'docx' || ext === 'doc' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');

    protocol.get(book.pdfFile, (fileStream) => {
      fileStream.pipe(res);
    }).on('error', () => {
      res.status(500).json({ message: 'Failed to download file' });
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// READ PURCHASED BOOK (GET PDF URL)
router.get('/read/:bookId', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const { bookId } = req.params;

    const transaction = await Transaction.findOne({ reader: readerId, book: bookId, status: 'completed' });
    if (!transaction) return res.status(403).json({ message: 'You have not purchased this book' });

    const book = await Book.findById(bookId).populate('authorId', 'displayName');
    if (!book || !book.pdfFile) return res.status(404).json({ message: 'Book not found' });

    // Allow reading even if book is deleted (reader already purchased it)
    res.json({
      book: {
        _id: book._id,
        title: book.title,
        author: book.authorId?.displayName,
        pdfUrl: book.pdfFile,
        pageCount: book.pageCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STREAM PDF FOR READING - redirect to Cloudinary URL
router.get('/stream/:bookId', async (req, res) => {
  try {
    let readerId;
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token;
    const jwt = require('jsonwebtoken');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try { readerId = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET).id; }
      catch { return res.status(401).json({ message: 'Invalid token' }); }
    } else if (tokenFromQuery) {
      try { readerId = jwt.verify(tokenFromQuery, process.env.JWT_SECRET).id; }
      catch { return res.status(401).json({ message: 'Invalid token' }); }
    } else {
      return res.status(401).json({ message: 'No token provided' });
    }

    const { bookId } = req.params;
    const transaction = await Transaction.findOne({ reader: readerId, book: bookId, status: 'completed' });
    if (!transaction) return res.status(403).json({ message: 'You have not purchased this book' });

    const book = await Book.findById(bookId);
    if (!book || !book.pdfFile) return res.status(404).json({ message: 'Book file not found' });

    // Use stored extension, fall back to detecting from URL last segment, default pdf
    const ext = book.pdfFileExt || (() => {
      const lastSegment = (book.pdfFile.split('?')[0].split('/').pop() || '');
      const dotIndex = lastSegment.lastIndexOf('.');
      return dotIndex !== -1 ? lastSegment.substring(dotIndex + 1).toLowerCase() : 'pdf';
    })();
    const contentType = ext === 'docx' || ext === 'doc' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

    const https = require('https');
    const http = require('http');
    const protocol = book.pdfFile.startsWith('https') ? https : http;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');

    protocol.get(book.pdfFile, (fileStream) => {
      fileStream.pipe(res);
    }).on('error', () => {
      res.status(500).json({ message: 'Failed to stream file' });
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET BOOK DETAILS WITH AUTHOR VIRTUAL ACCOUNT — must be last (wildcard)
router.get('/:bookId', async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId)
      .populate('authorId', 'displayName fullName virtualAccount');

    if (!book || ['draft', 'rejected'].includes(book.status)) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      book,
      paymentAccount: book.authorId.virtualAccount || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;