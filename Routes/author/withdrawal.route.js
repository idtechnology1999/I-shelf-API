const express = require('express');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// INITIATE WITHDRAWAL
router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const { amount } = req.body;

    const author = await Author.findById(authorId);

    if (!author.subaccountCode) {
      return res.status(400).json({ message: 'Bank account not setup' });
    }

    if (amount < 1000) {
      return res.status(400).json({ message: 'Minimum withdrawal is ₦1,000' });
    }

    // In production, you would create a withdrawal record and process it
    // For now, just return success
    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      amount,
      bankAccount: author.bankAccount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
