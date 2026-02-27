const express = require('express');
const Reader = require('../../models/Reader.model');
const Notification = require('../../models/Notification.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL READERS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const readers = await Reader.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ readers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET READER BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.params.id).select('-password');

    if (!reader) {
      return res.status(404).json({ message: 'Reader not found' });
    }

    res.json({ reader });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY READER
router.patch('/:id/verify', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { returnDocument: 'after' }
    ).select('-password');

    if (!reader) {
      return res.status(404).json({ message: 'Reader not found' });
    }

    await Notification.create({
      type: 'reader_verified',
      userId: reader._id,
      userType: 'reader',
      userName: reader.fullName,
      userEmail: reader.email,
      action: 'verified'
    });

    res.json({ message: 'Reader verified successfully', reader });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SUSPEND READER
router.patch('/:id/suspend', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    ).select('-password');

    if (!reader) {
      return res.status(404).json({ message: 'Reader not found' });
    }

    await Notification.create({
      type: 'reader_suspended',
      userId: reader._id,
      userType: 'reader',
      userName: reader.fullName,
      userEmail: reader.email,
      action: 'suspended'
    });

    res.json({ message: 'Reader suspended successfully', reader });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE READER
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.params.id);

    if (!reader) {
      return res.status(404).json({ message: 'Reader not found' });
    }

    await Notification.create({
      type: 'reader_deleted',
      userId: reader._id,
      userType: 'reader',
      userName: reader.fullName,
      userEmail: reader.email,
      action: 'deleted'
    });

    await Reader.findByIdAndDelete(req.params.id);

    res.json({ message: 'Reader deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
