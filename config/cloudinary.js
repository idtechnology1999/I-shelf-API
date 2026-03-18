const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for book covers (images)
const coverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ishelf/book-covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 1200, crop: 'limit' }]
  }
});

// Storage for book PDFs and DOCX files
const pdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ishelf/book-pdfs',
    allowed_formats: ['pdf', 'docx', 'doc'],
    resource_type: 'raw'
  }
});

// Storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ishelf/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted file from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Helper function to delete PDF from Cloudinary
const deletePdfFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    console.log(`Deleted PDF from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting PDF from Cloudinary:', error);
  }
};

module.exports = {
  cloudinary,
  coverStorage,
  pdfStorage,
  profileStorage,
  deleteFromCloudinary,
  deletePdfFromCloudinary
};
