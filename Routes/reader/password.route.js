const express = require('express');
const bcrypt = require('bcryptjs');
const Reader = require('../../models/Reader.model');
const PasswordReset = require('../../models/PasswordReset.model');

const router = express.Router();

// CHECK EMAIL EXISTS & SEND RESET CODE
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const reader = await Reader.findOne({ email });
    if (!reader) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.deleteMany({ email, userType: 'reader' });

    const passwordReset = new PasswordReset({
      email,
      code,
      userType: 'reader',
      expiresAt
    });

    await passwordReset.save();

    console.log(`Password reset code for ${email}: ${code}`);

    res.json({
      message: 'Reset code sent to email',
      code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY RESET CODE
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const resetRecord = await PasswordReset.findOne({
      email,
      code,
      userType: 'reader',
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const resetRecord = await PasswordReset.findOne({
      email,
      code,
      userType: 'reader',
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Reader.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { returnDocument: 'after' }
    );

    await PasswordReset.deleteMany({ email, userType: 'reader' });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
