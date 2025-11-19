const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

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

// Keep backward compatibility
const verifyToken = authenticateToken;

/**
 * Middleware to check if user has the required user type
 * @param {string} requiredType - Required user type ('seeker' or 'recruiter')
 */
const requireUserType = (requiredType) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userType) {
      return res.status(403).json({
        success: false,
        message: 'User type not found',
      });
    }

    if (req.user.userType !== requiredType) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required user type: ${requiredType}`,
      });
    }

    next();
  };
};

// Keep backward compatibility - accepts array or string
const checkUserType = (allowedTypes) => {
  if (Array.isArray(allowedTypes)) {
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
  }
  // If string, use requireUserType
  return requireUserType(allowedTypes);
};

/**
 * Middleware to check if user has completed their profile (minimum step 2)
 */
const requireProfileComplete = (req, res, next) => {
  // In test environment or when profileCompletionStep is in user token
  if (req.user) {
    if (req.user.profileCompletionStep === undefined || req.user.profileCompletionStep < 2) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile to access this feature',
        profileCompletionStep: req.user.profileCompletionStep || 1,
        requiredStep: 2,
      });
    }
    return next();
  }

  // For production with database check
  if (process.env.NODE_ENV !== 'test') {
    return requireCompleteProfileDB(req, res, next);
  }
  
  // Default deny if no user
  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

/**
 * Database version - check profile completion from database
 */
const requireCompleteProfileDB = async (req, res, next) => {
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
  authenticateToken,
  verifyToken,
  requireUserType,
  checkUserType,
  requireProfileComplete,
  requireCompleteProfile: requireCompleteProfileDB,
};
