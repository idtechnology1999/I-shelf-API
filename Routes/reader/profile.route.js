const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Reader = require('../../models/Reader.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { cloudinary } = require('../../config/cloudinary');

const generateReferralCode = () => 'ISH-' + crypto.randomBytes(4).toString('hex').toUpperCase();

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
    if (!image) return res.status(400).json({ message: 'No image provided' });

    // Upload base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: 'ishelf/profiles',
      public_id: `reader-${req.user.id}`,
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    });

    await Reader.findByIdAndUpdate(req.user.id, { profileImage: result.secure_url });

    res.json({ imageUrl: result.secure_url, message: 'Image uploaded successfully' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const reader = await Reader.findById(req.user.id).select('-password');
    res.json(reader);
  } catch (error) {
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
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
