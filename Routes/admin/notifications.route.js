const express = require('express');
const Notification = require('../../models/Notification.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL UNREAD NOTIFICATIONS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK NOTIFICATION AS READ
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK ALL AS READ
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
