const express = require('express');
const Transaction = require('../../models/Transaction.model');
const Settlement = require('../../models/Settlement.model');
const Payment = require('../../models/Payment.model');

const router = express.Router();

// GET PLATFORM DASHBOARD STATS
router.get('/stats', async (req, res) => {
  try {
    // Total revenue from all book sales
    const allTransactions = await Transaction.find({ status: 'completed' });
    const totalRevenue = allTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    
    // Platform commission (20% of all sales)
    const platformEarnings = allTransactions.reduce((sum, txn) => sum + txn.platformCommission, 0);
    
    // Author earnings (80% of all sales)
    const authorEarnings = allTransactions.reduce((sum, txn) => sum + txn.authorAmount, 0);
    
    // Total paid out to authors
    const completedSettlements = await Settlement.find({ status: 'completed' });
    const totalPaidOut = completedSettlements.reduce((sum, settlement) => sum + settlement.amount, 0);
    
    // Pending payouts to authors
    const unsettledTransactions = await Transaction.find({ 
      status: 'completed', 
      settled: { $ne: true } 
    });
    const pendingPayouts = unsettledTransactions.reduce((sum, txn) => sum + txn.authorAmount, 0);
    
    // Platform balance (commission earned - any platform expenses)
    const platformBalance = platformEarnings;
    
    // Upload fee revenue
    const uploadFeePayments = await Payment.find({ 
      status: 'completed',
      type: 'upload_fee'
    });
    const uploadFeeRevenue = uploadFeePayments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      totalRevenue, // Total from all book sales
      platformEarnings, // 20% commission from book sales
      uploadFeeRevenue, // Revenue from upload fees
      totalPlatformIncome: platformEarnings + uploadFeeRevenue,
      authorEarnings, // 80% of book sales (total owed to authors)
      totalPaidOut, // Amount already paid to authors
      pendingPayouts, // Amount pending to be paid to authors
      platformBalance, // Current platform balance
      totalTransactions: allTransactions.length,
      totalSettlements: completedSettlements.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET PAYMENT HISTORY (Money In and Money Out)
router.get('/payment-history', async (req, res) => {
  try {
    // Money IN: Book sales (platform commission) and upload fees
    const transactions = await Transaction.find({ status: 'completed' })
      .populate('book', 'title')
      .populate('reader', 'firstName lastName')
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    const uploadFees = await Payment.find({ 
      status: 'completed',
      type: 'upload_fee'
    })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    // Money OUT: Settlements to authors
    const settlements = await Settlement.find({ status: 'completed' })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    // Combine and format
    const moneyIn = [
      ...transactions.map(txn => ({
        type: 'book_sale',
        amount: txn.platformCommission,
        totalAmount: txn.amount,
        description: `Book sale: ${txn.book?.title || 'Unknown'}`,
        from: txn.reader ? `${txn.reader.firstName} ${txn.reader.lastName}` : 'Unknown',
        date: txn.createdAt,
        reference: txn.paymentReference
      })),
      ...uploadFees.map(payment => ({
        type: 'upload_fee',
        amount: payment.amount,
        totalAmount: payment.amount,
        description: 'Author upload fee',
        from: payment.author ? `${payment.author.firstName} ${payment.author.lastName}` : 'Unknown',
        date: payment.createdAt,
        reference: payment.reference
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const moneyOut = settlements.map(settlement => ({
      type: 'settlement',
      amount: settlement.amount,
      description: `Author payout (${settlement.transactions.length} sales)`,
      to: settlement.author ? `${settlement.author.firstName} ${settlement.author.lastName}` : 'Unknown',
      date: settlement.settledAt || settlement.createdAt,
      reference: settlement.transferReference
    }));

    res.json({
      moneyIn,
      moneyOut,
      summary: {
        totalMoneyIn: moneyIn.reduce((sum, item) => sum + item.amount, 0),
        totalMoneyOut: moneyOut.reduce((sum, item) => sum + item.amount, 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
