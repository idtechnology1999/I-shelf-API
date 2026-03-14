const express = require('express');
const Admin = require('../../models/Admin.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET ALL ADMINS
router.get('/admins', authMiddleware, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: 1 });
    
    res.json({ admins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE ADMIN
router.delete('/admins/:id', authMiddleware, async (req, res) => {
  try {
    const firstAdmin = await Admin.findOne().sort({ createdAt: 1 });
    
    if (firstAdmin._id.toString() === req.params.id) {
      return res.status(403).json({ message: 'Cannot delete first admin' });
    }

    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
