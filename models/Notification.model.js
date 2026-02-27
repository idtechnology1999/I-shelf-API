const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'author_registration', 
      'reader_registration',
      'author_verified',
      'reader_verified',
      'author_suspended',
      'reader_suspended',
      'author_deleted',
      'reader_deleted'
    ], 
    required: true 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['author', 'reader'], required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  action: { type: String, enum: ['registration', 'verified', 'suspended', 'deleted'], required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
