const express = require('express');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { createDedicatedAccount, createSubaccount, getBanks, verifyAccount } = require('../../services/paystack.service');

const router = express.Router();

// Get Banks List
router.get('/banks', authMiddleware, async (req, res) => {
  try {
    const banks = await getBanks();
    res.json({ banks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Account Number
router.post('/verify-account', authMiddleware, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    const accountData = await verifyAccount(accountNumber, bankCode);
    res.json(accountData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Setup Settlement Account (Local Bank)
router.post('/setup', authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const { accountNumber, bankCode, bankName } = req.body;

    const author = await Author.findById(authorId);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    // Verify account first
    const accountData = await verifyAccount(accountNumber, bankCode);

    // Create dedicated virtual account if not exists
    if (!author.virtualAccount?.accountNumber) {
      const [firstName, ...lastNameParts] = author.fullName.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      
      const virtualAccountData = await createDedicatedAccount({
        email: author.email,
        firstName,
        lastName,
        phone: author.phone || '08000000000'
      });

      author.virtualAccount = virtualAccountData;
    }

    // Create subaccount for settlement with 20% commission
    const subaccountData = await createSubaccount({
      fullName: author.fullName,
      displayName: author.displayName,
      email: author.email,
      phone: author.phone || '08000000000',
      accountNumber,
      bankCode
    });

    author.settlementAccount = {
      accountNumber,
      accountName: accountData.accountName,
      bankName,
      bankCode,
      subaccountCode: subaccountData.subaccountCode
    };

    await author.save();

    res.json({
      success: true,
      message: 'Account setup successfully',
      virtualAccount: author.virtualAccount,
      settlementAccount: author.settlementAccount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get Account Details
router.get('/details', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    res.json({
      virtualAccount: author.virtualAccount || null,
      settlementAccount: author.settlementAccount || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
