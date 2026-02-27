const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Author = require('../../models/Author.model');
const authMiddleware = require('../../middlewares/authMiddleware');

router.post('/upload-image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `author-${req.user.id}-${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '../../uploads/profiles', filename);

    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/uploads/profiles/${filename}`;
    await Author.findByIdAndUpdate(req.user.id, { profileImage: imageUrl });

    res.json({ imageUrl, message: 'Image uploaded successfully' });
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
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const author = await Author.findById(req.user.id).select('-password');
    res.json(author);
  } catch (error) {
    console.error('Error fetching profile data:', error);
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
    console.error('Error updating bio:', error);
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
    console.error('Error updating professional details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
