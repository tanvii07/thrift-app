const cloudinaryLib = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Load credentials
const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const api_key = process.env.CLOUDINARY_API_KEY?.trim();
const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

// Validate .env setup
if (!cloud_name || !api_key || !api_secret) {
  console.error("❌ Missing Cloudinary credentials. Check .env file.");
  process.exit(1);
}

// Apply config
cloudinaryLib.config({ cloud_name, api_key, api_secret });

console.log("✅ Cloudinary ready:", {
  cloud_name,
  api_key,
  has_secret: !!api_secret,
});

// Setup storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinaryLib, // ✅ Correct object
  params: {
    folder: 'closyr-posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
  },
});

const upload = multer({ storage });

module.exports = {
  cloudinary: cloudinaryLib,
  upload
};
