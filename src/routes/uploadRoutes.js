const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { verifyToken, checkUserType } = require('../middleware/authMiddleware');
const { uploadResume, uploadImage, handleMulterError } = require('../middleware/uploadMiddleware');

// Upload resume (Seeker only)
router.post(
  '/resume',
  verifyToken,
  checkUserType(['seeker']),
  (req, res, next) => {
    uploadResume(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadController.uploadResume
);

// Upload profile image or company logo (Both user types)
router.post(
  '/profile-image',
  verifyToken,
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadController.uploadProfileImage
);

// Get signed URL for private file access
router.get(
  '/file-url',
  verifyToken,
  uploadController.getFileUrl
);

module.exports = router;
