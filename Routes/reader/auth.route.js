const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Reader = require('../../models/Reader.model');
const Notification = require('../../models/Notification.model');
const { SECRET_KEY } = require('../../config/env');

const router = express.Router();

const generateReferralCode = () => 'ISH-' + crypto.randomBytes(4).toString('hex').toUpperCase();

// READER REGISTRATION
router.post('/register', async (req, res) => {
  const { fullName, email, institution, password } = req.body;

  try {
    const existingReader = await Reader.findOne({ email });
    if (existingReader) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const reader = new Reader({
      fullName,
      email,
      institution,
      password: hashedPassword,
      referralCode: generateReferralCode()
    });

    await reader.save();

    // Create notification
    await Notification.create({
      type: 'reader_registration',
      userId: reader._id,
      userType: 'reader',
      userName: reader.fullName,
      userEmail: reader.email,
      action: 'registration'
    });

    res.status(201).json({
      message: 'Registration successful. Please wait for admin verification.',
      reader: {
        id: reader._id,
        fullName: reader.fullName,
        email: reader.email,
        institution: reader.institution,
        isVerified: false
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// READER LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const reader = await Reader.findOne({ email });
    if (!reader) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (!reader.isVerified) {
      return res.status(403).json({ message: 'Account needs to be verified by the administrator. Try again later.' });
    }

    if (!reader.isActive) {
      return res.status(403).json({ message: 'Account suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, reader.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: reader._id, email: reader.email, role: 'reader' },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      reader: {
        id: reader._id,
        fullName: reader.fullName,
        email: reader.email,
        institution: reader.institution,
        referralCode: reader.referralCode || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
