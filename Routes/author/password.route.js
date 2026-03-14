const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Author = require('../../models/Author.model');
const PasswordReset = require('../../models/PasswordReset.model');
const { EMAIL_USER, EMAIL_PASS } = require('../../config/env');

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// SEND RESET CODE
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const author = await Author.findOne({ email });
    if (!author) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.deleteMany({ email, userType: 'author' });

    const passwordReset = new PasswordReset({
      email,
      code,
      userType: 'author',
      expiresAt
    });

    await passwordReset.save();

    const mailOptions = {
      from: '"iShelf" <' + EMAIL_USER + '>',
      to: email,
      subject: 'Password Reset Code - iShelf',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #E85D54; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">iShelf</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px;">Hello ${author.fullName},</p>
            <p style="color: #666; font-size: 16px;">You requested to reset your password. Use the code below:</p>
            <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #E85D54; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© 2024 iShelf. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset code sent to ${email}: ${code}`);

    res.json({
      message: 'Reset code sent to email'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY CODE
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const resetRecord = await PasswordReset.findOne({
      email,
      code,
      userType: 'author',
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
      userType: 'author',
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Author.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { returnDocument: 'after' }
    );

    await PasswordReset.deleteMany({ email, userType: 'author' });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
