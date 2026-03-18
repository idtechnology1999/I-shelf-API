const express = require('express');
const Transaction = require('../../models/Transaction.model');
const Payment = require('../../models/Payment.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL TRANSACTIONS WITH FILTERING
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, type, limit = 50, page = 1 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await Transaction.find(query)
      .populate('book', 'title coverImage price')
      .populate('author', 'displayName fullName')
      .populate('reader', 'fullName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(txn => ({
      id: txn._id,
      paymentFrom: txn.reader?.fullName || 'Unknown Reader',
      bookTitle: txn.book?.title || 'Unknown Book',
      author: txn.author?.displayName || txn.author?.fullName || 'Unknown Author',
      amount: txn.amount,
      authorAmount: txn.authorAmount,
      platformCommission: txn.platformCommission,
      status: txn.status,
      paymentReference: txn.paymentReference,
      createdAt: txn.createdAt,
      image: txn.book?.coverImage
        ? (txn.book.coverImage.startsWith('http') ? txn.book.coverImage : `${process.env.API_URL || 'http://localhost:5000'}/${txn.book.coverImage}`)
        : null
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET TRANSACTION BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('book', 'title coverImage price category isbn')
      .populate('author', 'displayName fullName email bankAccount')
      .populate('reader', 'fullName email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const formattedTransaction = {
      id: transaction._id,
      paymentFrom: transaction.reader?.fullName || 'Unknown Reader',
      readerEmail: transaction.reader?.email,
      bookTitle: transaction.book?.title || 'Unknown Book',
      bookCategory: transaction.book?.category,
      bookIsbn: transaction.book?.isbn,
      author: transaction.author?.displayName || transaction.author?.fullName || 'Unknown Author',
      authorEmail: transaction.author?.email,
      amount: transaction.amount,
      authorAmount: transaction.authorAmount,
      platformCommission: transaction.platformCommission,
      status: transaction.status,
      paymentReference: transaction.paymentReference,
      paystackResponse: transaction.paystackResponse,
      createdAt: transaction.createdAt,
      image: transaction.book?.coverImage
        ? (transaction.book.coverImage.startsWith('http') ? transaction.book.coverImage : `${process.env.API_URL || 'http://localhost:5000'}/${transaction.book.coverImage}`)
        : null
    };

    res.json({ transaction: formattedTransaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET FINANCIAL STATS
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Get total revenue (platform commission + upload fees)
    const [transactionStats, uploadFeeStats] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$platformCommission' },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', startOfMonth] },
                      { $lte: ['$createdAt', endOfMonth] }
                    ]
                  },
                  '$platformCommission',
                  0
                ]
              }
            },
            totalTransactions: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: 'success', paymentType: 'upload_fee' } },
        {
          $group: {
            _id: null,
            totalUploadFees: { $sum: '$amount' },
            monthlyUploadFees: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', startOfMonth] },
                      { $lte: ['$createdAt', endOfMonth] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const transactionData = transactionStats[0] || { totalRevenue: 0, monthlyRevenue: 0, totalTransactions: 0 };
    const uploadFeeData = uploadFeeStats[0] || { totalUploadFees: 0, monthlyUploadFees: 0 };

    // Get pending transactions count (for pending payout)
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });

    res.json({
      totalRevenue: transactionData.totalRevenue + uploadFeeData.totalUploadFees,
      monthlyRevenue: transactionData.monthlyRevenue + uploadFeeData.monthlyUploadFees,
      pendingPayout: pendingTransactions * 100, // Placeholder calculation
      totalTransactions: transactionData.totalTransactions,
      uploadFeesTotal: uploadFeeData.totalUploadFees,
      uploadFeesMonthly: uploadFeeData.monthlyUploadFees
    });
  } catch (error) {
    console.error('Financial stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;