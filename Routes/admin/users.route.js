const express = require('express');
const Author = require('../../models/Author.model');
const Reader = require('../../models/Reader.model');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL AUTHORS WITH STATS
router.get('/authors', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, page = 1, search } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const authors = await Author.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-password');

    const total = await Author.countDocuments(query);

    // Get book counts and earnings for each author
    const authorsWithStats = await Promise.all(
      authors.map(async (author) => {
        const [bookCount, earnings] = await Promise.all([
          Book.countDocuments({ authorId: author._id }),
          Transaction.aggregate([
            { $match: { author: author._id, status: 'completed' } },
            { $group: { _id: null, totalEarnings: { $sum: '$authorAmount' } } }
          ])
        ]);

        return {
          _id: author._id,
          fullName: author.fullName,
          displayName: author.displayName,
          email: author.email,
          institution: author.institution,
          areasOfExpertise: author.areasOfExpertise,
          isVerified: author.isVerified,
          createdAt: author.createdAt,
          booksUploaded: bookCount,
          totalEarnings: earnings[0]?.totalEarnings || 0,
          hasBankAccount: !!(author.bankAccount?.accountNumber),
          profileImage: author.profileImage
        };
      })
    );

    res.json({
      authors: authorsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Authors fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL READERS WITH STATS
router.get('/readers', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, page = 1, search } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const readers = await Reader.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-password');

    const total = await Reader.countDocuments(query);

    // Get purchase stats for each reader
    const readersWithStats = await Promise.all(
      readers.map(async (reader) => {
        const [purchaseCount, totalSpent] = await Promise.all([
          Transaction.countDocuments({ reader: reader._id, status: 'completed' }),
          Transaction.aggregate([
            { $match: { reader: reader._id, status: 'completed' } },
            { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
          ])
        ]);

        return {
          _id: reader._id,
          firstName: reader.firstName,
          lastName: reader.lastName,
          fullName: reader.fullName || 'Unknown Reader',
          email: reader.email,
          isVerified: reader.isVerified,
          isActive: reader.isActive !== false,
          createdAt: reader.createdAt,
          booksRead: purchaseCount,
          totalSpent: totalSpent[0]?.totalSpent || 0,
          profileImage: reader.profileImage
        };
      })
    );

    res.json({
      readers: readersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Readers fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET AUTHOR BY ID WITH DETAILED STATS
router.get('/authors/:id', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.params.id).select('-password');
    
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    const [books, transactions, totalEarnings] = await Promise.all([
      Book.find({ authorId: author._id }).sort({ createdAt: -1 }),
      Transaction.find({ author: author._id })
        .populate('book', 'title')
        .populate('reader', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10),
      Transaction.aggregate([
        { $match: { author: author._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$authorAmount' } } }
      ])
    ]);

    res.json({
      author: {
        ...author.toObject(),
        booksUploaded: books.length,
        totalEarnings: totalEarnings[0]?.total || 0,
        hasBankAccount: !!(author.bankAccount?.accountNumber)
      },
      books,
      recentTransactions: transactions
    });
  } catch (error) {
    console.error('Author details fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET READER BY ID WITH DETAILED STATS
router.get('/readers/:id', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.params.id).select('-password');
    
    if (!reader) {
      return res.status(404).json({ message: 'Reader not found' });
    }

    const [transactions, totalSpent] = await Promise.all([
      Transaction.find({ reader: reader._id })
        .populate('book', 'title coverImage')
        .populate('author', 'displayName fullName')
        .sort({ createdAt: -1 }),
      Transaction.aggregate([
        { $match: { reader: reader._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      reader: {
        ...reader.toObject(),
        booksRead: transactions.filter(t => t.status === 'completed').length,
        totalSpent: totalSpent[0]?.total || 0
      },
      purchaseHistory: transactions
    });
  } catch (error) {
    console.error('Reader details fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;