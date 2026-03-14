const express = require('express');
const Book = require('../../models/Book.model');
const Author = require('../../models/Author.model');
const Reader = require('../../models/Reader.model');
const Transaction = require('../../models/Transaction.model');
const Payment = require('../../models/Payment.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ADMIN DASHBOARD STATS
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get total counts
    const [totalBooks, totalAuthors, totalReaders, totalTransactions, totalPayments] = await Promise.all([
      Book.countDocuments(),
      Author.countDocuments(),
      Reader.countDocuments(),
      Transaction.countDocuments({ status: 'completed' }),
      Payment.countDocuments({ status: 'success' })
    ]);

    // Get total sales amount
    const salesData = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalSales: { $sum: '$amount' }, platformRevenue: { $sum: '$platformCommission' } } }
    ]);

    const totalSales = salesData[0]?.totalSales || 0;
    const platformRevenue = salesData[0]?.platformRevenue || 0;

    // Get upload fees
    const uploadFeesData = await Payment.aggregate([
      { $match: { status: 'success', paymentType: 'upload_fee' } },
      { $group: { _id: null, totalUploadFees: { $sum: '$amount' } } }
    ]);

    const totalUploadFees = uploadFeesData[0]?.totalUploadFees || 0;

    // Get pending approvals
    const pendingBooks = await Book.countDocuments({ status: 'pending' });
    const approvedBooks = await Book.countDocuments({ status: 'approved' });

    res.json({
      totalBooks,
      totalAuthors,
      totalReaders,
      totalSales,
      platformRevenue,
      totalUploadFees,
      pendingBooks,
      approvedBooks,
      totalRevenue: platformRevenue + totalUploadFees
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET RECENT ACTIVITIES
router.get('/activities', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent book uploads
    const recentBooks = await Book.find({ status: 'pending' })
      .populate('authorId', 'displayName fullName')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Get recent author registrations
    const recentAuthors = await Author.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('displayName fullName createdAt');

    // Get recent transactions
    const recentTransactions = await Transaction.find({ status: 'completed' })
      .populate('book', 'title coverImage')
      .populate('author', 'displayName fullName')
      .populate('reader', 'fullName firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [];

    // Add book uploads
    recentBooks.forEach(book => {
      const authorName = book.authorId?.displayName 
        ? book.authorId.displayName
        : book.authorId?.fullName 
        ? book.authorId.fullName
        : 'Unknown Author';
      
      const bookTitle = book.title || 'Untitled Book';
      
      activities.push({
        id: `book-${book._id}`,
        type: 'New Upload Pending Approval',
        title: `${authorName} uploaded "${bookTitle}"`,
        time: book.createdAt,
        badgeColor: { bg: '#fce4ec', text: '#C81E4C' },
        image: book.coverImage ? `${process.env.API_URL || 'http://localhost:5000'}/${book.coverImage}` : null,
        bookId: book._id
      });
    });

    // Add author registrations
    recentAuthors.forEach(author => {
      const authorName = author.displayName 
        ? author.displayName
        : author.fullName 
        ? author.fullName
        : 'Unknown Author';
      
      activities.push({
        id: `author-${author._id}`,
        type: 'New Author Registration',
        title: `${authorName} completed author sign-up`,
        time: author.createdAt,
        badgeColor: { bg: '#d1fae5', text: '#059669' },
        image: null,
        authorId: author._id
      });
    });

    // Add transactions
    recentTransactions.forEach(transaction => {
      const readerName = transaction.reader?.fullName 
        ? transaction.reader.fullName
        : transaction.reader?.firstName && transaction.reader?.lastName 
        ? `${transaction.reader.firstName} ${transaction.reader.lastName}`
        : 'Unknown Reader';
      
      const bookTitle = transaction.book?.title || 'Unknown Book';
      
      activities.push({
        id: `transaction-${transaction._id}`,
        type: 'Book Purchase',
        title: `${readerName} purchased "${bookTitle}"`,
        time: transaction.createdAt,
        badgeColor: { bg: '#dbeafe', text: '#1d4ed8' },
        image: transaction.book?.coverImage ? `${process.env.API_URL || 'http://localhost:5000'}/${transaction.book.coverImage}` : null,
        transactionId: transaction._id
      });
    });

    // Sort by time and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, limit);

    // Format time for display
    limitedActivities.forEach(activity => {
      const now = new Date();
      const activityTime = new Date(activity.time);
      const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        activity.timeAgo = 'Just now';
      } else if (diffInMinutes < 60) {
        activity.timeAgo = `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        activity.timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        activity.timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
      }
    });

    res.json({ activities: limitedActivities });
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;