const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType'
  },
  userType: {
    type: String,
    required: true,
    enum: ['Author', 'Reader']
  },
  text: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'admin']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

supportMessageSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
