const db = require('../config/database');
const s3Service = require('../services/s3Service');

/**
 * Upload resume (Seeker only)
 */
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const userId = req.user.userId;
    const file = req.file;

    // Get current resume URL to delete old file
    const currentProfile = await db.query(
      'SELECT resume_s3_url FROM user_profiles_seeker WHERE user_id = $1',
      [userId]
    );

    const oldResumeUrl = currentProfile.rows[0]?.resume_s3_url;

    // Upload new file to S3
    const s3Url = await s3Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'resumes',
      userId
    );

    // Update database
    await db.query(
      'UPDATE user_profiles_seeker SET resume_s3_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [s3Url, userId]
    );

    // Delete old file from S3 if exists
    if (oldResumeUrl) {
      await s3Service.deleteFile(oldResumeUrl);
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl: s3Url,
      },
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload resume',
    });
  }
};

/**
 * Upload profile image (Both user types)
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const userId = req.user.userId;
    const userType = req.user.userType;
    const file = req.file;

    let oldImageUrl = null;
    let tableName, columnName;

    if (userType === 'seeker') {
      tableName = 'user_profiles_seeker';
      columnName = 'profile_image_s3_url';
      
      const currentProfile = await db.query(
        `SELECT ${columnName} FROM ${tableName} WHERE user_id = $1`,
        [userId]
      );
      oldImageUrl = currentProfile.rows[0]?.[columnName];
    } else if (userType === 'recruiter') {
      tableName = 'user_profiles_recruiter';
      columnName = 'company_logo_s3_url';
      
      const currentProfile = await db.query(
        `SELECT ${columnName} FROM ${tableName} WHERE user_id = $1`,
        [userId]
      );
      oldImageUrl = currentProfile.rows[0]?.[columnName];
    }

    // Upload new file to S3
    const s3Url = await s3Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'profile-images',
      userId
    );

    // Update database
    await db.query(
      `UPDATE ${tableName} SET ${columnName} = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [s3Url, userId]
    );

    // Delete old file from S3 if exists
    if (oldImageUrl) {
      await s3Service.deleteFile(oldImageUrl);
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: s3Url,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
    });
  }
};

/**
 * Get signed URL for private file access
 */
exports.getFileUrl = async (req, res) => {
  try {
    const { fileUrl } = req.query;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'File URL is required',
      });
    }

    const signedUrl = await s3Service.getSignedUrl(fileUrl, 3600); // 1 hour expiry

    res.status(200).json({
      success: true,
      data: {
        signedUrl,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate file URL',
    });
  }
};
