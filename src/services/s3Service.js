const { s3Client, bucketName } = require('../config/aws');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

class S3Service {
  /**
   * Upload a file to S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalFilename - Original filename
   * @param {string} mimetype - File MIME type
   * @param {string} folder - S3 folder (e.g., 'resumes', 'profile-images')
   * @param {number} userId - User ID for organizing files
   * @returns {Promise<string>} - S3 URL of the uploaded file
   */
  async uploadFile(fileBuffer, originalFilename, mimetype, folder, userId) {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const fileExtension = originalFilename.split('.').pop();
      const filename = `${timestamp}-${randomString}.${fileExtension}`;
      const key = `${folder}/${userId}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimetype,
      });

      await s3Client.send(command);
      
      // Construct S3 URL
      const region = process.env.AWS_REGION || 'us-east-1';
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      return s3Url;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Delete a file from S3
   * @param {string} s3Url - Full S3 URL of the file
   * @returns {Promise<void>}
   */
  async deleteFile(s3Url) {
    try {
      if (!s3Url) return;

      // Extract key from S3 URL
      const url = new URL(s3Url);
      const key = url.pathname.substring(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`File deleted from S3: ${key}`);
    } catch (error) {
      console.error('S3 delete error:', error);
      // Don't throw error - file might already be deleted
    }
  }

  /**
   * Generate a signed URL for private file access
   * @param {string} s3Url - Full S3 URL of the file
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(s3Url, expiresIn = 3600) {
    try {
      if (!s3Url) return null;

      const url = new URL(s3Url);
      const key = url.pathname.substring(1);

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }
}

module.exports = new S3Service();
