const express = require('express');
const router = express.Router();
const Reader = require('../../models/Reader.model');
const Author = require('../../models/Author.model');
const ReferralEarning = require('../../models/ReferralEarning.model');
const authMiddleware = require('../../middlewares/authMiddleware');

// GET notifications derived from referral earnings
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const earnings = await ReferralEarning.find({ readerId })
      .populate('authorId', 'fullName displayName createdAt')
      .sort({ updatedAt: -1, createdAt: -1 });

    const notifications = [];

    for (const e of earnings) {
      const authorName = e.authorId?.displayName || e.authorId?.fullName || 'An author';

      // Author registered via your link
      notifications.push({
        id: `reg-${e._id}`,
        type: 'registered',
        message: `🎉 ${authorName} signed up using your referral link!`,
        sub: 'You will earn ₦4,000 once they pay the upload fee.',
        time: e.createdAt,
        read: false,
      });

      // Author paid — earning is now available
      if (['available', 'requested', 'paid'].includes(e.status)) {
        notifications.push({
          id: `paid-${e._id}`,
          type: 'earned',
          message: `💰 ${authorName} has paid the upload fee!`,
          sub: 'Your ₦4,000 referral reward is now available. Go to earnings to request payout.',
          time: e.createdAt,
          read: false,
        });
      }

      // Reader requested payout
      if (['requested', 'paid'].includes(e.status) && e.payoutRequestedAt) {
        notifications.push({
          id: `req-${e._id}`,
          type: 'requested',
          message: `📤 Payout request sent for ${authorName}'s referral.`,
          sub: 'We will credit your account within 1 hour. Thank you for your patience!',
          time: e.payoutRequestedAt,
          read: false,
        });
      }

      // Admin marked as paid
      if (e.status === 'paid' && e.paidAt) {
        notifications.push({
          id: `done-${e._id}`,
          type: 'paid',
          message: `✅ ₦4,000 has been sent to your bank account!`,
          sub: `Payment for referring ${authorName} is complete.`,
          time: e.paidAt,
          read: false,
        });
      }
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;

    const earnings = await ReferralEarning.find({ readerId })
      .populate('authorId', 'fullName displayName email hasPaidUploadFee')
      .sort({ createdAt: -1 });

    const totalAvailable = earnings
      .filter(e => e.status === 'available')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalEarned = earnings
      .filter(e => ['available', 'requested', 'paid'].includes(e.status))
      .reduce((sum, e) => sum + e.amount, 0);

    const reader = await Reader.findById(readerId).select('bankAccount referralCode');

    res.json({
      totalAvailable,
      totalEarned,
      referralCode: reader?.referralCode,
      bankAccount: reader?.bankAccount || null,
      referrals: earnings.map(e => ({
        id: e._id,
        authorName: e.authorId?.displayName || e.authorId?.fullName || 'Unknown',
        authorEmail: e.authorId?.email,
        hasPaid: e.authorId?.hasPaidUploadFee || false,
        amount: e.amount,
        status: e.status,
        payoutRequestedAt: e.payoutRequestedAt,
        paidAt: e.paidAt,
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SAVE bank account
router.post('/bank-account', authMiddleware, async (req, res) => {
  try {
    const { accountNumber, accountName, bankName, bankCode } = req.body;
    await Reader.findByIdAndUpdate(req.user.id, {
      bankAccount: { accountNumber, accountName, bankName, bankCode }
    });
    res.json({ success: true, message: 'Bank account saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// REQUEST PAYOUT for a specific referral earning
router.post('/request-payout/:earningId', authMiddleware, async (req, res) => {
  try {
    const earning = await ReferralEarning.findOne({
      _id: req.params.earningId,
      readerId: req.user.id,
      status: 'available'
    });

    if (!earning) {
      return res.status(404).json({ message: 'Earning not found or not available' });
    }

    const reader = await Reader.findById(req.user.id).select('bankAccount');
    if (!reader?.bankAccount?.accountNumber) {
      return res.status(400).json({ message: 'Please save your bank account details first' });
    }

    earning.status = 'requested';
    earning.payoutRequestedAt = new Date();
    await earning.save();

    res.json({ success: true, message: 'Payout request sent. Allow 1 working day.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
