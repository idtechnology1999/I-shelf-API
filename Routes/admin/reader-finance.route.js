const express = require('express');
const router = express.Router();
const ReferralEarning = require('../../models/ReferralEarning.model');
const Reader = require('../../models/Reader.model');
const authMiddleware = require('../../middlewares/authMiddleware');

// GET all payout requests
router.get('/payout-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await ReferralEarning.find({})
      .populate('readerId', 'fullName email bankAccount')
      .populate('authorId', 'fullName displayName email hasPaidUploadFee')
      .sort({ createdAt: -1 });

    res.json({
      requests: requests.map(r => ({
        id: r._id,
        readerName: r.readerId?.fullName || 'Unknown',
        readerEmail: r.readerId?.email,
        bankAccount: r.readerId?.bankAccount || null,
        authorName: r.authorId?.displayName || r.authorId?.fullName || 'Unknown',
        authorEmail: r.authorId?.email,
        hasPaid: r.authorId?.hasPaidUploadFee || false,
        amount: r.amount,
        status: r.status,
        payoutRequestedAt: r.payoutRequestedAt || null,
        paidAt: r.paidAt || null,
        paidBy: r.paidBy
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK as paid
router.patch('/payout-requests/:id/pay', authMiddleware, async (req, res) => {
  try {
    const earning = await ReferralEarning.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date(), paidBy: req.user?.email || 'admin' },
      { new: true }
    );
    if (!earning) return res.status(404).json({ message: 'Request not found' });
    res.json({ success: true, message: 'Marked as paid' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
