const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

/**
 * Sign up - Step 1: Create account with basic info
 */
exports.signupStep1 = async (req, res) => {
  try {
    // Validate request
    await body('email').isEmail().normalizeEmail().run(req);
    await body('password').isLength({ min: 6 }).run(req);
    await body('user_type').isIn(['seeker', 'recruiter']).run(req);
    await body('full_name').notEmpty().trim().run(req);
    await body('birth_date').isISO8601().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, user_type, full_name, birth_date } = req.body;

    // Check if user already exists
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create user
      const userResult = await db.query(
        'INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING id',
        [email, passwordHash, user_type]
      );
      const userId = userResult.rows[0].id;

      // Create profile based on user type
      if (user_type === 'seeker') {
        await db.query(
          'INSERT INTO user_profiles_seeker (user_id, full_name, birth_date, profile_completion_step) VALUES ($1, $2, $3, 1)',
          [userId, full_name, birth_date]
        );
      } else {
        await db.query(
          'INSERT INTO user_profiles_recruiter (user_id, full_name, profile_completion_step) VALUES ($1, $2, 1)',
          [userId, full_name]
        );
      }

      await db.query('COMMIT');

      // Generate JWT token
      const token = jwt.sign(
        { userId, userType: user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          token,
          userId,
          userType: user_type,
          profileCompletionStep: 1,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Signup step 1 error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
    });
  }
};

/**
 * Sign up - Step 2: Complete personal/company information
 */
exports.signupStep2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType === 'seeker') {
      const { current_job, years_experience, location, phone } = req.body;

      await db.query(
        `UPDATE user_profiles_seeker 
         SET current_job = $1, years_experience = $2, location = $3, phone = $4, 
             profile_completion_step = 2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [current_job, years_experience, location, phone, userId]
      );
    } else if (userType === 'recruiter') {
      const { company_name, company_size, company_website, phone } = req.body;

      await body('company_name').notEmpty().trim().run(req);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      await db.query(
        `UPDATE user_profiles_recruiter 
         SET company_name = $1, company_size = $2, company_website = $3, phone = $4,
             profile_completion_step = 2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [company_name, company_size, company_website, phone, userId]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profileCompletionStep: 2,
      },
    });
  } catch (error) {
    console.error('Signup step 2 error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

/**
 * Sign up - Step 3: Add preferences (optional for seekers)
 */
exports.signupStep3 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType === 'seeker') {
      const {
        preferred_job_titles,
        preferred_industries,
        preferred_locations,
        salary_expectation_min,
        salary_expectation_max,
        skip,
      } = req.body;

      if (skip) {
        // User skipped preferences
        await db.query(
          'INSERT INTO job_preferences (user_id, is_skipped) VALUES ($1, true) ON CONFLICT (user_id) DO UPDATE SET is_skipped = true',
          [userId]
        );
      } else {
        // Save preferences
        await db.query(
          `INSERT INTO job_preferences 
           (user_id, preferred_job_titles, preferred_industries, preferred_locations, salary_expectation_min, salary_expectation_max, is_skipped) 
           VALUES ($1, $2, $3, $4, $5, $6, false)
           ON CONFLICT (user_id) DO UPDATE SET
           preferred_job_titles = $2, preferred_industries = $3, preferred_locations = $4,
           salary_expectation_min = $5, salary_expectation_max = $6, is_skipped = false`,
          [
            userId,
            preferred_job_titles || [],
            preferred_industries || [],
            preferred_locations || [],
            salary_expectation_min,
            salary_expectation_max,
          ]
        );
      }

      // Update profile completion step
      await db.query(
        'UPDATE user_profiles_seeker SET profile_completion_step = 3 WHERE user_id = $1',
        [userId]
      );
    } else if (userType === 'recruiter') {
      // For recruiters, just mark step 3 as complete
      await db.query(
        'UPDATE user_profiles_recruiter SET profile_completion_step = 3 WHERE user_id = $1',
        [userId]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        profileCompletionStep: 3,
      },
    });
  } catch (error) {
    console.error('Signup step 3 error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile',
    });
  }
};

/**
 * Login
 */
exports.login = async (req, res) => {
  try {
    await body('email').isEmail().normalizeEmail().run(req);
    await body('password').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user
    const userResult = await db.query(
      'SELECT id, password_hash, user_type FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Get profile completion step
    let profileCompletionStep = 0;
    if (user.user_type === 'seeker') {
      const profileResult = await db.query(
        'SELECT profile_completion_step FROM user_profiles_seeker WHERE user_id = $1',
        [user.id]
      );
      profileCompletionStep = profileResult.rows[0]?.profile_completion_step || 0;
    } else {
      const profileResult = await db.query(
        'SELECT profile_completion_step FROM user_profiles_recruiter WHERE user_id = $1',
        [user.id]
      );
      profileCompletionStep = profileResult.rows[0]?.profile_completion_step || 0;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        userId: user.id,
        userType: user.user_type,
        profileCompletionStep,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Get current user profile
 */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Get user basic info
    const userResult = await db.query(
      'SELECT id, email, user_type, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get profile data
    let profile;
    if (userType === 'seeker') {
      const profileResult = await db.query(
        'SELECT * FROM user_profiles_seeker WHERE user_id = $1',
        [userId]
      );
      profile = profileResult.rows[0];
    } else {
      const profileResult = await db.query(
        'SELECT * FROM user_profiles_recruiter WHERE user_id = $1',
        [userId]
      );
      profile = profileResult.rows[0];
    }

    // Get preferences if seeker
    let preferences = null;
    if (userType === 'seeker') {
      const prefResult = await db.query(
        'SELECT * FROM job_preferences WHERE user_id = $1',
        [userId]
      );
      preferences = prefResult.rows[0] || null;
    }

    const canUseApp = profile?.profile_completion_step >= 2;
    const profileComplete = profile?.profile_completion_step >= 3;

    res.status(200).json({
      success: true,
      data: {
        user,
        profile,
        preferences,
        canUseApp,
        profileComplete,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
    });
  }
};
