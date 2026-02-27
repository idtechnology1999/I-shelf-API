const express = require('express');
const router = express.Router();
const SupportMessage = require('../../models/SupportMessage.model');
const authMiddleware = require('../../middlewares/authMiddleware');

// Get messages for logged-in reader
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await SupportMessage.find({ 
      userId: req.user.id,
      userType: 'Reader'
    }).sort({ timestamp: 1 });

    // Mark admin messages as read
    await SupportMessage.updateMany(
      { userId: req.user.id, sender: 'admin', isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to admin
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    const message = new SupportMessage({
      userId: req.user.id,
      userType: 'Reader',
      text,
      sender: 'user',
      timestamp: new Date()
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await SupportMessage.countDocuments({
      userId: req.user.id,
      sender: 'admin',
      isRead: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
