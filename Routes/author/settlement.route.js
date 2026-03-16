const express = require('express');
const axios = require('axios');
const Author = require('../../models/Author.model');
const Transaction = require('../../models/Transaction.model');
const Settlement = require('../../models/Settlement.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// MANUAL SETTLEMENT FOR TESTING (Simulate Paystack auto-settlement)
router.post('/manual-settle', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    // Get author with subaccount details
    const author = await Author.findById(authorId);
    if (!author || !author.paystackSubaccountCode) {
      return res.status(400).json({ message: 'Bank account not setup' });
    }

    // Get all unsettled transactions
    const unsettledTransactions = await Transaction.find({
      author: authorId,
      status: 'completed',
      settled: { $ne: true }
    });

    if (unsettledTransactions.length === 0) {
      return res.status(400).json({ message: 'No pending settlements' });
    }

    // Calculate total amount to settle
    const totalAmount = unsettledTransactions.reduce((sum, txn) => sum + txn.authorAmount, 0);

    // Create settlement record
    const settlement = new Settlement({
      author: authorId,
      amount: totalAmount,
      transactions: unsettledTransactions.map(t => t._id),
      status: 'processing'
    });

    // In production, Paystack automatically transfers to subaccount
    // For testing, we'll simulate the transfer using Paystack Transfer API
    try {
      const transferData = {
        source: 'balance',
        amount: totalAmount * 100, // Convert to kobo
        recipient: author.paystackRecipientCode, // We need to create recipient code
        reason: `Settlement for ${unsettledTransactions.length} book sales`,
        reference: `SETTLE_${Date.now()}_${authorId}`
      };

      // NOTE: In test mode, this will use Paystack test keys
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transfer',
        transferData,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      settlement.status = 'completed';
      settlement.transferCode = paystackResponse.data.data.transfer_code;
      settlement.transferReference = paystackResponse.data.data.reference;
      settlement.paystackResponse = paystackResponse.data;
      settlement.settledAt = new Date();

      // Mark transactions as settled
      await Transaction.updateMany(
        { _id: { $in: unsettledTransactions.map(t => t._id) } },
        { $set: { settled: true, settledAt: new Date() } }
      );

      await settlement.save();

      res.json({
        message: 'Settlement completed successfully',
        amount: totalAmount,
        transactionCount: unsettledTransactions.length,
        settlement: settlement
      });

    } catch (paystackError) {
      console.error('Paystack transfer error:', paystackError.response?.data || paystackError.message);
      settlement.status = 'failed';
      settlement.paystackResponse = paystackError.response?.data;
      await settlement.save();

      res.status(500).json({ 
        message: 'Settlement failed', 
        error: paystackError.response?.data?.message || 'Transfer failed'
      });
    }

  } catch (error) {
    console.error('Settlement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET SETTLEMENT HISTORY
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    const settlements = await Settlement.find({ author: authorId })
      .populate('transactions', 'amount authorAmount createdAt')
      .sort({ createdAt: -1 });

    res.json({ settlements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET PENDING SETTLEMENT AMOUNT
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;

    const unsettledTransactions = await Transaction.find({
      author: authorId,
      status: 'completed',
      settled: { $ne: true }
    });

    const pendingAmount = unsettledTransactions.reduce((sum, txn) => sum + txn.authorAmount, 0);

    res.json({ 
      pendingAmount,
      transactionCount: unsettledTransactions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
