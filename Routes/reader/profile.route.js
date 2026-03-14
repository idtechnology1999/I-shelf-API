const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Reader = require('../../models/Reader.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const generateReferralCode = () => 'ISH-' + crypto.randomBytes(4).toString('hex').toUpperCase();

// GET or generate referral code for existing users
router.get('/referral', authMiddleware, async (req, res) => {
  try {
    let reader = await Reader.findById(req.user.id).select('referralCode');
    if (!reader.referralCode) {
      reader = await Reader.findByIdAndUpdate(
        req.user.id,
        { referralCode: generateReferralCode() },
        { new: true }
      ).select('referralCode');
    }
    res.json({ referralCode: reader.referralCode });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload-image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `reader-${req.user.id}-${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '../../uploads/profiles', filename);

    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/uploads/profiles/${filename}`;
    await Reader.findByIdAndUpdate(req.user.id, { profileImage: imageUrl });

    res.json({ imageUrl, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/image', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.user.id).select('profileImage');
    res.json({ imageUrl: reader?.profileImage || null });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.user.id).select('-password');
    res.json(reader);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/bio', authMiddleware, async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const reader = await Reader.findByIdAndUpdate(
      req.user.id, 
      { fullName, email, phone },
      { new: true }
    ).select('-password');
    res.json({ message: 'Bio updated successfully', reader });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/academic', authMiddleware, async (req, res) => {
  try {
    const { institution, level, department } = req.body;
    const reader = await Reader.findByIdAndUpdate(
      req.user.id, 
      { institution, level, department },
      { new: true }
    ).select('-password');
    res.json({ message: 'Academic details updated successfully', reader });
  } catch (error) {
    console.error('Error updating academic details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
