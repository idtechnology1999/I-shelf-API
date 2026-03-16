const express = require('express');
const axios = require('axios');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { PAYSTACK_SECRET_KEY } = require('../../config/env');

const router = express.Router();

// CREATE PAYSTACK SUBACCOUNT
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const { accountNumber, accountName, bankName, bankCode } = req.body;

    const author = await Author.findById(authorId);
    
    if (author.subaccountCode) {
      return res.status(400).json({ message: 'Subaccount already exists' });
    }

    // Create subaccount on Paystack with automatic settlement
    const response = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name: author.displayName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 80,
        description: `Subaccount for ${author.displayName}`,
        primary_contact_email: author.email,
        primary_contact_name: author.fullName,
        primary_contact_phone: author.phone || '',
        settlement_schedule: 'auto'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    author.bankAccount = {
      accountNumber,
      accountName,
      bankName,
      bankCode
    };
    author.subaccountCode = response.data.data.subaccount_code;
    await author.save();

    res.json({
      success: true,
      message: 'Subaccount created successfully',
      subaccountCode: author.subaccountCode,
      bankAccount: author.bankAccount
    });
  } catch (error) {
    console.error('Subaccount creation error:', error.response?.data || error);
    res.status(500).json({ 
      message: 'Failed to create subaccount',
      error: error.response?.data?.message || error.message
    });
  }
});

// GET BANKS LIST
router.get('/banks', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ 
        message: 'Paystack configuration missing',
        banks: [] 
      });
    }

    const response = await axios.get('https://api.paystack.co/bank?perPage=100', {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    res.json({
      success: true,
      banks: response.data.data
    });
  } catch (error) {
    console.error('Banks fetch error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to fetch banks',
      banks: []
    });
  }
});

// VERIFY ACCOUNT NUMBER
router.post('/verify-account', authMiddleware, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    res.json({
      success: true,
      accountName: response.data.data.account_name
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      message: 'Account verification failed',
      error: error.response?.data?.message 
    });
  }
});

// GET AUTHOR'S SUBACCOUNT STATUS
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id);
    
    const bankAccount = author.bankAccount?.accountNumber ? author.bankAccount : null;
    
    res.json({
      hasSubaccount: !!author.subaccountCode,
      bankAccount,
      subaccountCode: author.subaccountCode || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
