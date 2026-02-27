const express = require('express');
const router = express.Router();
const SupportMessage = require('../../models/SupportMessage.model');
const Author = require('../../models/Author.model');
const Reader = require('../../models/Reader.model');
const authMiddleware = require('../../middlewares/authMiddleware');

// Get all users with support messages
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ timestamp: -1 });
    
    const userMap = new Map();
    
    for (const msg of messages) {
      if (!userMap.has(msg.userId.toString())) {
        let user;
        if (msg.userType === 'Author') {
          user = await Author.findById(msg.userId);
        } else {
          user = await Reader.findById(msg.userId);
        }
        
        if (user) {
          const unreadCount = await SupportMessage.countDocuments({
            userId: msg.userId,
            sender: 'user',
            isRead: false
          });
          
          userMap.set(msg.userId.toString(), {
            _id: user._id,
            name: user.fullName || user.displayName,
            email: user.email,
            userType: msg.userType.toLowerCase(),
            unreadCount,
            lastMessage: msg.text,
            lastMessageTime: msg.timestamp
          });
        }
      }
    }
    
    res.json(Array.from(userMap.values()));
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await SupportMessage.countDocuments({
      sender: 'user',
      isRead: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for specific user
router.get('/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await SupportMessage.find({ 
      userId: req.params.userId 
    }).sort({ timestamp: 1 });
    
    await SupportMessage.updateMany(
      { userId: req.params.userId, sender: 'user', isRead: false },
      { isRead: true }
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to user
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    const existingMsg = await SupportMessage.findOne({ userId });
    if (!existingMsg) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const message = new SupportMessage({
      userId,
      userType: existingMsg.userType,
      text,
      sender: 'admin',
      timestamp: new Date()
    });
    
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
