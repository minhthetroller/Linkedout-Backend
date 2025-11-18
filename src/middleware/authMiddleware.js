const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware to verify JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Token verification failed',
    });
  }
};

/**
 * Middleware to check if user has the required user type
 * @param {string[]} allowedTypes - Array of allowed user types ['seeker', 'recruiter']
 */
const checkUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userType) {
      return res.status(403).json({
        success: false,
        message: 'User type not found',
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required user type: ${allowedTypes.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has completed their profile (minimum step 2)
 */
const requireCompleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    let query;
    if (userType === 'seeker') {
      query = 'SELECT profile_completion_step FROM user_profiles_seeker WHERE user_id = $1';
    } else if (userType === 'recruiter') {
      query = 'SELECT profile_completion_step FROM user_profiles_recruiter WHERE user_id = $1';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type',
      });
    }

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const profileCompletionStep = result.rows[0].profile_completion_step;

    // Require at least step 2 (personal info completed)
    if (profileCompletionStep < 2) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile to access this feature',
        profileCompletionStep,
        requiredStep: 2,
      });
    }

    // Attach completion step to request for use in routes
    req.profileCompletionStep = profileCompletionStep;
    
    next();
  } catch (error) {
    console.error('Profile check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify profile completion',
    });
  }
};

module.exports = {
  verifyToken,
  checkUserType,
  requireCompleteProfile,
};
