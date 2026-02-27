const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Author = require('../../models/Author.model');
const Notification = require('../../models/Notification.model');
const { SECRET_KEY } = require('../../config/env');

const router = express.Router();

// AUTHOR REGISTRATION
router.post('/register', async (req, res) => {
  const { fullName, email, institution, governmentId, displayName, areasOfExpertise, shortBio, password } = req.body;

  try {
    const existingAuthor = await Author.findOne({ email });
    if (existingAuthor) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const author = new Author({
      fullName,
      email,
      institution,
      governmentId,
      displayName,
      areasOfExpertise,
      shortBio,
      password: hashedPassword
    });

    await author.save();

    // Create notification
    await Notification.create({
      type: 'author_registration',
      userId: author._id,
      userType: 'author',
      userName: author.fullName || author.displayName,
      userEmail: author.email,
      action: 'registration'
    });

    const token = jwt.sign(
      { id: author._id, email: author.email, role: 'author' },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      author: {
        id: author._id,
        fullName: author.fullName,
        email: author.email,
        displayName: author.displayName,
        isVerified: author.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AUTHOR LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const author = await Author.findOne({ email });
    if (!author) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (!author.isVerified) {
      return res.status(403).json({ message: 'Account pending verification' });
    }

    const isMatch = await bcrypt.compare(password, author.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: author._id, email: author.email, role: 'author' },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      author: {
        id: author._id,
        fullName: author.fullName,
        email: author.email,
        phone: author.phone,
        institution: author.institution,
        areasOfExpertise: author.areasOfExpertise,
        shortBio: author.shortBio,
        displayName: author.displayName,
        isVerified: author.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
