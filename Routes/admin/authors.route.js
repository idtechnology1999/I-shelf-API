const express = require('express');
const Author = require('../../models/Author.model');
const Notification = require('../../models/Notification.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL AUTHORS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const authors = await Author.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ authors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET AUTHOR BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.params.id).select('-password');

    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    res.json({ author });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY AUTHOR
router.patch('/:id/verify', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { returnDocument: 'after' }
    ).select('-password');

    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    await Notification.create({
      type: 'author_verified',
      userId: author._id,
      userType: 'author',
      userName: author.fullName || author.displayName,
      userEmail: author.email,
      action: 'verified'
    });

    res.json({ message: 'Author verified successfully', author });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SUSPEND AUTHOR
router.patch('/:id/suspend', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      { isVerified: false },
      { returnDocument: 'after' }
    ).select('-password');

    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    await Notification.create({
      type: 'author_suspended',
      userId: author._id,
      userType: 'author',
      userName: author.fullName || author.displayName,
      userEmail: author.email,
      action: 'suspended'
    });

    res.json({ message: 'Author suspended successfully', author });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE AUTHOR
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    await Notification.create({
      type: 'author_deleted',
      userId: author._id,
      userType: 'author',
      userName: author.fullName || author.displayName,
      userEmail: author.email,
      action: 'deleted'
    });

    await Author.findByIdAndDelete(req.params.id);

    res.json({ message: 'Author deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
