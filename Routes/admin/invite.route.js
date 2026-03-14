const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/Admin.model');
const nodemailer = require('nodemailer');

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SEND INVITATION
router.post('/send', async (req, res) => {
  const { email, role } = req.body;

  try {
    const existing = await Admin.findOne({ email });
    if (existing && existing.isSetupComplete) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    if (existing) {
      existing.inviteToken = inviteToken;
      existing.inviteExpires = inviteExpires;
      existing.role = role;
      await existing.save();
    } else {
      await Admin.create({
        email,
        role,
        inviteToken,
        inviteExpires,
        isSetupComplete: false
      });
    }

    const inviteLink = `${process.env.FRONTEND_URL}/admin/setup?token=${inviteToken}`;

    await transporter.sendMail({
      from: `"iShelf Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Complete Your Admin Account Setup - iShelf',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #C81E4C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #C81E4C; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to iShelf Admin</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been invited to join iShelf as an administrator. Click the button below to complete your account setup:</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Complete Setup</a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #C81E4C;">${inviteLink}</p>
              <p><strong>Important:</strong> This invitation link will expire in 20 minutes.</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} iShelf. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY TOKEN
router.get('/verify/:token', async (req, res) => {
  try {
    const admin = await Admin.findOne({
      inviteToken: req.params.token,
      inviteExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.json({ email: admin.email, role: admin.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// COMPLETE SETUP
router.post('/setup', async (req, res) => {
  const { token, fullName, password } = req.body;

  console.log('Setup request:', { token: token?.substring(0, 10) + '...', fullName, hasPassword: !!password });

  try {
    const admin = await Admin.findOne({
      inviteToken: token,
      inviteExpires: { $gt: Date.now() }
    });

    if (!admin) {
      console.log('Admin not found or token expired');
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    console.log('Admin found:', admin.email);

    const hashedPassword = await bcrypt.hash(password, 10);

    admin.fullName = fullName;
    admin.password = hashedPassword;
    admin.isSetupComplete = true;
    admin.inviteToken = undefined;
    admin.inviteExpires = undefined;
    await admin.save();

    console.log('Setup completed for:', admin.email);

    res.json({ message: 'Account setup completed successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
