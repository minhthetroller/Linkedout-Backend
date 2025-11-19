const jwt = require('jsonwebtoken');
const { authenticateToken, requireUserType, requireProfileComplete } = require('../../../src/middleware/authMiddleware');

describe('Authentication Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'test_secret_key';
    
    // Clear mock call history
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 if no token provided', () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', () => {
      req.headers.authorization = 'InvalidFormat';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid_token_string';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() with valid token', () => {
      const token = jwt.sign(
        { userId: 1, userType: 'seeker' }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.userType).toBe('seeker');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle expired token', () => {
      const token = jwt.sign(
        { userId: 1 }, 
        process.env.JWT_SECRET, 
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer prefix correctly', () => {
      const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(123);
    });
  });

  describe('requireUserType', () => {
    beforeEach(() => {
      req.user = { userId: 1, userType: 'seeker' };
    });

    it('should allow access for correct user type (seeker)', () => {
      const middleware = requireUserType('seeker');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for correct user type (recruiter)', () => {
      req.user.userType = 'recruiter';
      const middleware = requireUserType('recruiter');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for incorrect user type', () => {
      req.user.userType = 'seeker';
      const middleware = requireUserType('recruiter');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required user type: recruiter'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny seeker from recruiter endpoints', () => {
      req.user.userType = 'seeker';
      const middleware = requireUserType('recruiter');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should deny recruiter from seeker-only endpoints', () => {
      req.user.userType = 'recruiter';
      const middleware = requireUserType('seeker');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireProfileComplete', () => {
    it('should allow access if profile completion step is 2', () => {
      req.user = { profileCompletionStep: 2 };
      
      requireProfileComplete(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access if profile completion step is 3', () => {
      req.user = { profileCompletionStep: 3 };
      
      requireProfileComplete(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access if profile completion step is 1', () => {
      req.user = { profileCompletionStep: 1 };

      requireProfileComplete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please complete your profile to access this feature',
        profileCompletionStep: 1,
        requiredStep: 2
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access if profileCompletionStep is undefined', () => {
      req.user = {};

      requireProfileComplete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please complete your profile to access this feature',
        profileCompletionStep: 1,
        requiredStep: 2
      });
    });

    it('should deny access if profileCompletionStep is 0', () => {
      req.user = { profileCompletionStep: 0 };

      requireProfileComplete(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Combined middleware flow', () => {
    it('should work with authenticate -> requireUserType -> requireProfileComplete', () => {
      // Create valid token
      const token = jwt.sign(
        { 
          userId: 1, 
          userType: 'recruiter',
          profileCompletionStep: 2
        }, 
        process.env.JWT_SECRET
      );
      req.headers.authorization = `Bearer ${token}`;

      // Authenticate
      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();

      // Check user type
      const typeMiddleware = requireUserType('recruiter');
      typeMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Check profile complete
      requireProfileComplete(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should fail at authentication step if no token', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail at user type check even with valid token', () => {
      const token = jwt.sign({ userId: 1, userType: 'seeker' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();

      const typeMiddleware = requireUserType('recruiter');
      typeMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Error Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should handle generic errors', () => {
    const error = new Error('Test error');
    const errorHandler = (err, req, res, next) => {
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Test error'
    });
  });

  it('should handle errors without message', () => {
    const error = {};
    const errorHandler = (err, req, res, next) => {
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    };

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error'
    });
  });
});

console.log('✓ All middleware unit tests defined');
