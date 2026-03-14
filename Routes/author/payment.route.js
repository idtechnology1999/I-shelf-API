const express = require('express');
const axios = require('axios');
const Payment = require('../../models/Payment.model');
const Author = require('../../models/Author.model');
const ReferralEarning = require('../../models/ReferralEarning.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { PAYSTACK_SECRET_KEY } = require('../../config/env');

const router = express.Router();

// INITIALIZE PAYMENT
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { email, amount } = req.body;
    const authorId = req.user.id;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ 
        success: false,
        message: 'Payment service not configured' 
      });
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Convert to kobo
        callback_url: 'ishelf://payment-callback',
        metadata: {
          authorId,
          paymentType: 'upload_fee'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = new Payment({
      authorId,
      amount,
      reference: response.data.data.reference,
      status: 'pending',
      paymentType: 'upload_fee'
    });

    await payment.save();

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: 'Payment initialization failed',
      error: error.response?.data?.message || error.message
    });
  }
});

// VERIFY PAYMENT
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
      const payment = await Payment.findOneAndUpdate(
        { reference },
        { status: 'success', metadata: response.data.data },
        { new: true }
      );

      // Mark author as having paid the one-time upload fee
      if (payment) {
        const author = await Author.findByIdAndUpdate(
          payment.authorId,
          { hasPaidUploadFee: true },
          { new: true }
        );
        // If author was referred by a reader, create/activate referral earning
        if (author?.referredBy) {
          await ReferralEarning.findOneAndUpdate(
            { readerId: author.referredBy, authorId: author._id },
            { status: 'available' },
            { new: true }
          );
        }
      }

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: response.data.data
      });
    } else {
      await Payment.findOneAndUpdate(
        { reference },
        { status: 'failed' },
        { new: true }
      );

      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// CHECK ACTIVE PAYMENT (one-time fee — check author flag)
router.get('/check-active', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id).select('hasPaidUploadFee');
    res.json({ hasActivePayment: !!author?.hasPaidUploadFee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
