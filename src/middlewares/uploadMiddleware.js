const multer = require('multer');

// Configure multer to use RAM (buffers) instead of disk so we can upload it smoothly to Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
