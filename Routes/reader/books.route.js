const express = require('express');
const path = require('path');
const fs = require('fs');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL PUBLISHED BOOKS
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = { status: { $nin: ['draft', 'rejected'] } };
    
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

// GET BOOK DETAILS WITH AUTHOR VIRTUAL ACCOUNT
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
    
    // Check for token in Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use middleware for header-based auth
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        readerId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } else if (tokenFromQuery) {
      // Handle query parameter token for web downloads
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(tokenFromQuery, process.env.JWT_SECRET);
        readerId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const { bookId } = req.params;

    // Verify user has purchased this book
    const transaction = await Transaction.findOne({
      reader: readerId,
      book: bookId,
      status: 'completed'
    });

    if (!transaction) {
      return res.status(403).json({ message: 'You have not purchased this book' });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.pdfFile) {
      return res.status(404).json({ message: 'Book file not found' });
    }

    const filePath = path.join(__dirname, '../../', book.pdfFile);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Book file not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${book.title}.pdf"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
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

    // Verify user has purchased this book
    const transaction = await Transaction.findOne({
      reader: readerId,
      book: bookId,
      status: 'completed'
    });

    if (!transaction) {
      return res.status(403).json({ message: 'You have not purchased this book' });
    }

    const book = await Book.findById(bookId).populate('authorId', 'displayName');
    if (!book || !book.pdfFile) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if file exists
    const filePath = path.join(__dirname, '../../', book.pdfFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Book file not found on server' });
    }

    const baseUrl = process.env.PORT ? `http://localhost:${process.env.PORT}` : `${req.protocol}://${req.get('host')}`;
    const pdfUrl = book.pdfFile.startsWith('/') ? `${baseUrl}${book.pdfFile}` : `${baseUrl}/${book.pdfFile}`;
    
    res.json({ 
      book: {
        _id: book._id,
        title: book.title,
        author: book.authorId?.displayName,
        pdfUrl,
        pageCount: book.pageCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STREAM PDF FOR READING
router.get('/stream/:bookId', async (req, res) => {
  try {
    let readerId;
    
    // Check for token in Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        readerId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } else if (tokenFromQuery) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(tokenFromQuery, process.env.JWT_SECRET);
        readerId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const { bookId } = req.params;

    // Verify user has purchased this book
    const transaction = await Transaction.findOne({
      reader: readerId,
      book: bookId,
      status: 'completed'
    });

    if (!transaction) {
      return res.status(403).json({ message: 'You have not purchased this book' });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.pdfFile) {
      return res.status(404).json({ message: 'Book file not found' });
    }

    const filePath = path.join(__dirname, '../../', book.pdfFile);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Book file not found on server' });
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
