const express = require('express');
const axios = require('axios');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { PAYSTACK_SECRET_KEY } = require('../../config/env');

const router = express.Router();

// INITIALIZE CART CHECKOUT PAYMENT (multiple books)
router.post('/initialize-cart', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const { bookIds, email } = req.body;

    if (!bookIds || bookIds.length === 0) {
      return res.status(400).json({ message: 'No books provided' });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment service not configured' });
    }

    const books = await Book.find({ _id: { $in: bookIds } }).populate('authorId');
    if (books.length === 0) {
      return res.status(404).json({ message: 'Books not found' });
    }

    const totalAmount = books.reduce((sum, book) => sum + (book.price || 0), 0);

    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: totalAmount * 100,
        metadata: { readerId, bookIds, bookTitles: books.map(b => b.title).join(', ') }
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );

    const reference = paystackRes.data.data.reference;

    // Build all transactions and insert at once to avoid duplicate key issues
    const transactions = books
      .filter(book => book.authorId)
      .map(book => {
        const authorAmount = Math.round((book.price || 0) * 0.80);
        return {
          reader: readerId,
          book: book._id,
          author: book.authorId._id,
          amount: book.price,
          authorAmount,
          platformCommission: (book.price || 0) - authorAmount,
          status: 'pending',
          paymentReference: `${reference}_${book._id}`
        };
      });

    if (transactions.length > 0) {
      await Transaction.insertMany(transactions);
    }

    res.json({ success: true, data: paystackRes.data.data, totalAmount });
  } catch (error) {
    console.error('Cart payment initialization error:', error.response?.data || error.message || error);
    res.status(500).json({
      message: 'Payment initialization failed',
      error: error.response?.data?.message || error.message
    });
  }
});

// INITIALIZE BOOK PURCHASE PAYMENT
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const { bookId, email } = req.body;

    const book = await Book.findById(bookId).populate('authorId');
    if (!book || book.status !== 'published') {
      return res.status(404).json({ message: 'Book not found' });
    }

    const author = book.authorId;
    if (!author.subaccountCode) {
      return res.status(400).json({ message: 'Author payment account not configured' });
    }

    // Calculate amounts
    const amount = book.price;
    const authorAmount = Math.round(amount * 0.80);
    const platformCommission = amount - authorAmount;

    // Initialize payment with Paystack
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Convert to kobo
        subaccount: author.subaccountCode,
        transaction_charge: platformCommission * 100,
        bearer: 'subaccount',
        metadata: {
          readerId,
          bookId,
          authorId: author._id,
          bookTitle: book.title
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create pending transaction
    const transaction = new Transaction({
      reader: readerId,
      book: bookId,
      author: author._id,
      amount,
      authorAmount,
      platformCommission,
      status: 'pending',
      paymentReference: response.data.data.reference
    });

    await transaction.save();

    res.json({
      success: true,
      data: response.data.data,
      transactionId: transaction._id
    });
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error);
    res.status(500).json({ 
      message: 'Payment initialization failed',
      error: error.response?.data?.message || error.message
    });
  }
});

// VERIFY BOOK PURCHASE PAYMENT
router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (response.data.data.status === 'success') {
      // Handle both single (exact match) and cart (prefixed) transactions
      await Transaction.updateMany(
        { paymentReference: { $regex: `^${reference}` } },
        { status: 'completed', paystackResponse: response.data.data }
      );

      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      await Transaction.updateMany(
        { paymentReference: { $regex: `^${reference}` } },
        { status: 'failed' }
      );

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;
