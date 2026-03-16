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
    .sort({ createdAt: -1 });

    // Group transactions by book
    const bookMap = new Map();
    
    for (const txn of transactions) {
      if (txn.book) {
        const bookId = txn.book._id.toString();
        
        if (!bookMap.has(bookId)) {
          // Get unique buyers for this book
          const uniqueReaders = await Transaction.distinct('reader', {
            book: txn.book._id,
            status: 'completed'
          });
          
          // Get total sales count
          const salesCount = await Transaction.countDocuments({
            book: txn.book._id,
            status: 'completed'
          });
          
          // Calculate total earnings for this book
          const bookTransactions = await Transaction.find({
            book: txn.book._id,
            author: authorId,
            status: 'completed'
          });
          const totalEarnings = bookTransactions.reduce((sum, t) => sum + t.authorAmount, 0);
          
          bookMap.set(bookId, {
            id: txn.book._id,
            title: txn.book.title,
            coverImage: txn.book.coverImage,
            uniqueBuyers: uniqueReaders.length,
            salesCount: salesCount,
            totalEarnings: totalEarnings,
            lastSaleDate: txn.createdAt
          });
        }
      }
    }
    
    // Convert map to array and limit to 10
    const purchases = Array.from(bookMap.values()).slice(0, 10);

    res.json({ purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
