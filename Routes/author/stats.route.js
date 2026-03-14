const express = require('express');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET AUTHOR DASHBOARD STATS
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    const totalBooks = await Book.countDocuments({ 
      authorId
    });

    const transactions = await Transaction.find({ 
      author: authorId, 
      status: 'completed' 
    });

    const totalEarnings = transactions.reduce((sum, txn) => sum + txn.authorAmount, 0);
    const currentMonth = new Date().getMonth();
    const monthlyEarnings = transactions
      .filter(txn => new Date(txn.createdAt).getMonth() === currentMonth)
      .reduce((sum, txn) => sum + txn.authorAmount, 0);

    res.json({
      totalBooks,
      totalEarnings,
      monthlyEarnings,
      balance: totalEarnings,
      totalSales: transactions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET LATEST PURCHASES (books sold)
router.get('/purchases', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    const transactions = await Transaction.find({ 
      author: authorId, 
      status: 'completed' 
    })
    .populate('book', 'title coverImage')
    .populate('reader', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(10);

    const purchases = transactions.map(txn => ({
      id: txn._id,
      title: txn.book?.title || 'Unknown Book',
      date: txn.createdAt,
      amount: txn.authorAmount,
      coverImage: txn.book?.coverImage,
      readerName: txn.reader ? `${txn.reader.firstName} ${txn.reader.lastName}` : 'Unknown',
      status: txn.status
    }));

    res.json({ purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
