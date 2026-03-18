const express = require('express');
const router = express.Router();
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');
const { cloudinary } = require('../../config/cloudinary');

router.post('/upload-image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });

    // Upload base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: 'ishelf/profiles',
      public_id: `author-${req.user.id}`,
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    });

    await Author.findByIdAndUpdate(req.user.id, { profileImage: result.secure_url });

    res.json({ imageUrl: result.secure_url, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/image', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id).select('profileImage');
    res.json({ imageUrl: author?.profileImage || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id).select('-password');
    res.json(author);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/bio', authMiddleware, async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const author = await Author.findByIdAndUpdate(
      req.user.id,
      { fullName, email, phone },
      { new: true }
    ).select('-password');
    res.json({ message: 'Bio updated successfully', author });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/academic', authMiddleware, async (req, res) => {
  try {
    const { institution, areasOfExpertise, shortBio } = req.body;
    const author = await Author.findByIdAndUpdate(
      req.user.id,
      { institution, areasOfExpertise, shortBio },
      { new: true }
    ).select('-password');
    res.json({ message: 'Professional details updated successfully', author });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
