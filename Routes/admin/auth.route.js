const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/Admin.model');

const router = express.Router();

// ADMIN LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Hardcoded superadmin fallback
    if (email === 'admin@gmail.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'superadmin', email, role: 'superadmin' },
        process.env.SECRET_KEY,
        { expiresIn: '7d' }
      );
      return res.json({
        message: 'Login successful',
        token,
        admin: { id: 'superadmin', email, fullName: 'Super Admin', role: 'superadmin', isSetupComplete: true }
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      admin: { 
        id: admin._id,
        email: admin.email, 
        fullName: admin.fullName,
        role: admin.role,
        isSetupComplete: admin.isSetupComplete
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
