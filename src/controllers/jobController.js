const db = require('../config/database');
const geminiService = require('../services/geminiService');
const { body, validationResult } = require('express-validator');

/**
 * Create a new job (Recruiter only)
 */
exports.createJob = async (req, res) => {
  try {
    // Validate request
    await body('title').notEmpty().trim().run(req);
    await body('description').notEmpty().trim().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const recruiterId = req.user.userId;
    const {
      title,
      about,
      description,
      salary_min,
      salary_max,
      benefits,
      location,
      employment_type,
    } = req.body;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Generate tags using Gemini AI
      console.log('Generating tags for job posting...');
      const tagIds = await geminiService.generateAndStoreTags(description);

      // Create job
      const jobResult = await db.query(
        `INSERT INTO jobs (recruiter_id, title, about, description, salary_min, salary_max, benefits, location, employment_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
         RETURNING *`,
        [recruiterId, title, about, description, salary_min, salary_max, benefits, location, employment_type]
      );

      const job = jobResult.rows[0];

      // Link tags to job
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await db.query(
            'INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2)',
            [job.id, tagId]
          );
        }
      }

      // Fetch tags for response
      const tagsResult = await db.query(
        `SELECT t.id, t.name, t.category 
         FROM tags t
         INNER JOIN job_tags jt ON t.id = jt.tag_id
         WHERE jt.job_id = $1`,
        [job.id]
      );

      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: {
          job,
          tags: tagsResult.rows,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
    });
  }
};

/**
 * Get all jobs posted by recruiter
 */
exports.getRecruiterJobs = async (req, res) => {
  try {
    const recruiterId = req.user.userId;

    const result = await db.query(
      `SELECT 
        j.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'category', t.category)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
       FROM jobs j
       LEFT JOIN job_tags jt ON j.id = jt.job_id
       LEFT JOIN tags t ON jt.tag_id = t.id
       WHERE j.recruiter_id = $1
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId]
    );

    res.status(200).json({
      success: true,
      data: {
        jobs: result.rows,
      },
    });
  } catch (error) {
    console.error('Get recruiter jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
    });
  }
};

/**
 * Update a job
 */
exports.updateJob = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const jobId = req.params.id;
    const {
      title,
      about,
      description,
      salary_min,
      salary_max,
      benefits,
      location,
      employment_type,
      status,
    } = req.body;

    // Check if job belongs to recruiter
    const jobCheck = await db.query(
      'SELECT id, description FROM jobs WHERE id = $1 AND recruiter_id = $2',
      [jobId, recruiterId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or unauthorized',
      });
    }

    const oldDescription = jobCheck.rows[0].description;

    await db.query('BEGIN');

    try {
      // Update job
      await db.query(
        `UPDATE jobs 
         SET title = COALESCE($1, title),
             about = COALESCE($2, about),
             description = COALESCE($3, description),
             salary_min = COALESCE($4, salary_min),
             salary_max = COALESCE($5, salary_max),
             benefits = COALESCE($6, benefits),
             location = COALESCE($7, location),
             employment_type = COALESCE($8, employment_type),
             status = COALESCE($9, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [title, about, description, salary_min, salary_max, benefits, location, employment_type, status, jobId]
      );

      // If description changed, regenerate tags
      if (description && description !== oldDescription) {
        console.log('Description changed, regenerating tags...');
        
        // Delete old tags
        await db.query('DELETE FROM job_tags WHERE job_id = $1', [jobId]);

        // Generate new tags
        const tagIds = await geminiService.generateAndStoreTags(description);

        // Link new tags
        if (tagIds.length > 0) {
          for (const tagId of tagIds) {
            await db.query(
              'INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2)',
              [jobId, tagId]
            );
          }
        }
      }

      // Fetch updated job with tags
      const result = await db.query(
        `SELECT 
          j.*,
          COALESCE(
            json_agg(
              json_build_object('id', t.id, 'name', t.name, 'category', t.category)
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) as tags
         FROM jobs j
         LEFT JOIN job_tags jt ON j.id = jt.job_id
         LEFT JOIN tags t ON jt.tag_id = t.id
         WHERE j.id = $1
         GROUP BY j.id`,
        [jobId]
      );

      await db.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: {
          job: result.rows[0],
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
    });
  }
};

/**
 * Delete a job (hard delete)
 */
exports.deleteJob = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const jobId = req.params.id;

    const result = await db.query(
      `DELETE FROM jobs 
       WHERE id = $1 AND recruiter_id = $2
       RETURNING id`,
      [jobId, recruiterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
    });
  }
};

/**
 * Browse all active jobs (with filters)
 */
exports.browseJobs = async (req, res) => {
  try {
    const { location, salary_min, salary_max, employment_type, tags, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT 
        j.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'category', t.category)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        u.email as recruiter_email,
        COALESCE(upr.company_name, '') as company_name
      FROM jobs j
      LEFT JOIN job_tags jt ON j.id = jt.job_id
      LEFT JOIN tags t ON jt.tag_id = t.id
      LEFT JOIN users u ON j.recruiter_id = u.id
      LEFT JOIN user_profiles_recruiter upr ON u.id = upr.user_id
      WHERE j.status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    // Add filters
    if (location) {
      query += ` AND j.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (salary_min) {
      query += ` AND j.salary_max >= $${paramIndex}`;
      params.push(salary_min);
      paramIndex++;
    }

    if (salary_max) {
      query += ` AND j.salary_min <= $${paramIndex}`;
      params.push(salary_max);
      paramIndex++;
    }

    if (employment_type) {
      query += ` AND j.employment_type = $${paramIndex}`;
      params.push(employment_type);
      paramIndex++;
    }

    query += ` GROUP BY j.id, u.email, upr.company_name`;

    // Filter by tags if provided (after grouping)
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = `
        SELECT * FROM (${query}) as filtered_jobs
        WHERE EXISTS (
          SELECT 1 FROM json_array_elements(filtered_jobs.tags) as tag
          WHERE tag->>'name' = ANY($${paramIndex})
        )
      `;
      params.push(tagArray);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(DISTINCT j.id) FROM jobs j WHERE j.status = \'active\'';
    const countParams = [];
    let countParamIndex = 1;

    if (location) {
      countQuery += ` AND j.location ILIKE $${countParamIndex}`;
      countParams.push(`%${location}%`);
      countParamIndex++;
    }

    if (salary_min) {
      countQuery += ` AND j.salary_max >= $${countParamIndex}`;
      countParams.push(salary_min);
      countParamIndex++;
    }

    if (salary_max) {
      countQuery += ` AND j.salary_min <= $${countParamIndex}`;
      countParams.push(salary_max);
      countParamIndex++;
    }

    if (employment_type) {
      countQuery += ` AND j.employment_type = $${countParamIndex}`;
      countParams.push(employment_type);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalJobs = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        jobs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalJobs,
          pages: Math.ceil(totalJobs / limit),
        },
      },
    });
  } catch (error) {
    console.error('Browse jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
    });
  }
};

/**
 * Get a single job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.userId;
    const userType = req.user.userType;

    const result = await db.query(
      `SELECT 
        j.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'category', t.category)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        u.email as recruiter_email,
        COALESCE(upr.company_name, '') as company_name,
        COALESCE(upr.company_size, '') as company_size,
        COALESCE(upr.company_website, '') as company_website
       FROM jobs j
       LEFT JOIN job_tags jt ON j.id = jt.job_id
       LEFT JOIN tags t ON jt.tag_id = t.id
       LEFT JOIN users u ON j.recruiter_id = u.id
       LEFT JOIN user_profiles_recruiter upr ON u.id = upr.user_id
       WHERE j.id = $1 AND j.status = 'active'
       GROUP BY j.id, u.email, upr.company_name, upr.company_size, upr.company_website`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = result.rows[0];
    let hasApplied = false;

    // Check if seeker has already applied
    if (userType === 'seeker') {
      const applicationCheck = await db.query(
        'SELECT id FROM job_applications WHERE job_id = $1 AND seeker_id = $2',
        [jobId, userId]
      );
      hasApplied = applicationCheck.rows.length > 0;
    }

    res.status(200).json({
      success: true,
      data: {
        job: {
          ...job,
          has_applied: hasApplied,
        },
      },
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
    });
  }
};

/**
 * Get all applicants for recruiter's jobs
 */
exports.getJobApplicants = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const jobId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    // First, verify the job belongs to the recruiter
    const jobCheck = await db.query(
      'SELECT id, title FROM jobs WHERE id = $1 AND recruiter_id = $2',
      [jobId, recruiterId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or unauthorized',
      });
    }

    const job = jobCheck.rows[0];

    // Build query for applicants
    let query = `
      SELECT 
        ja.id as application_id,
        ja.status as application_status,
        ja.cover_letter,
        ja.created_at as applied_at,
        ja.updated_at as application_updated_at,
        u.id as seeker_id,
        u.email as seeker_email,
        ups.full_name,
        ups.current_job,
        ups.years_experience,
        ups.location,
        ups.phone,
        ups.profile_image_s3_url,
        ups.resume_s3_url
      FROM job_applications ja
      INNER JOIN users u ON ja.seeker_id = u.id
      INNER JOIN user_profiles_seeker ups ON u.id = ups.user_id
      WHERE ja.job_id = $1
    `;

    const params = [jobId];
    let paramIndex = 2;

    // Filter by application status if provided
    if (status) {
      query += ` AND ja.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ja.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM job_applications WHERE job_id = $1';
    const countParams = [jobId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const totalApplicants = parseInt(countResult.rows[0].count);

    // Get applicant statistics
    const statsResult = await db.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM job_applications
       WHERE job_id = $1
       GROUP BY status`,
      [jobId]
    );

    const statistics = {
      total: totalApplicants,
      pending: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
    };

    statsResult.rows.forEach(row => {
      statistics[row.status] = parseInt(row.count);
    });

    res.status(200).json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
        },
        applicants: result.rows,
        statistics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalApplicants,
          pages: Math.ceil(totalApplicants / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get job applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job applicants',
    });
  }
};

/**
 * Get all applicants across all recruiter's jobs
 */
exports.getAllApplicants = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const { status, job_id, page = 1, limit = 20 } = req.query;

    // Build query for all applicants across recruiter's jobs
    let query = `
      SELECT 
        ja.id as application_id,
        ja.status as application_status,
        ja.cover_letter,
        ja.created_at as applied_at,
        ja.updated_at as application_updated_at,
        j.id as job_id,
        j.title as job_title,
        j.location as job_location,
        j.employment_type,
        u.id as seeker_id,
        u.email as seeker_email,
        ups.full_name,
        ups.current_job,
        ups.years_experience,
        ups.location as seeker_location,
        ups.phone,
        ups.profile_image_s3_url,
        ups.resume_s3_url
      FROM job_applications ja
      INNER JOIN jobs j ON ja.job_id = j.id
      INNER JOIN users u ON ja.seeker_id = u.id
      INNER JOIN user_profiles_seeker ups ON u.id = ups.user_id
      WHERE j.recruiter_id = $1
    `;

    const params = [recruiterId];
    let paramIndex = 2;

    // Filter by application status if provided
    if (status) {
      query += ` AND ja.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by specific job if provided
    if (job_id) {
      query += ` AND ja.job_id = $${paramIndex}`;
      params.push(job_id);
      paramIndex++;
    }

    query += ` ORDER BY ja.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM job_applications ja
      INNER JOIN jobs j ON ja.job_id = j.id
      WHERE j.recruiter_id = $1
    `;
    const countParams = [recruiterId];
    let countParamIndex = 2;
    
    if (status) {
      countQuery += ` AND ja.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (job_id) {
      countQuery += ` AND ja.job_id = $${countParamIndex}`;
      countParams.push(job_id);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalApplicants = parseInt(countResult.rows[0].count);

    // Get overall statistics
    const statsResult = await db.query(
      `SELECT 
        ja.status,
        COUNT(*) as count
       FROM job_applications ja
       INNER JOIN jobs j ON ja.job_id = j.id
       WHERE j.recruiter_id = $1
       GROUP BY ja.status`,
      [recruiterId]
    );

    const statistics = {
      total: totalApplicants,
      pending: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
    };

    statsResult.rows.forEach(row => {
      statistics[row.status] = parseInt(row.count);
    });

    res.status(200).json({
      success: true,
      data: {
        applicants: result.rows,
        statistics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalApplicants,
          pages: Math.ceil(totalApplicants / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applicants',
    });
  }
};

/**
 * Get recommended jobs for seeker based on preferences
 */
exports.getRecommendedJobs = async (req, res) => {
  try {
    const seekerId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    // Get user preferences
    const prefResult = await db.query(
      'SELECT * FROM job_preferences WHERE user_id = $1',
      [seekerId]
    );

    const preferences = prefResult.rows[0];

    // If user skipped preferences or has none, return recent jobs
    if (!preferences || preferences.is_skipped) {
      const result = await db.query(
        `SELECT 
          j.*,
          COALESCE(
            json_agg(
              json_build_object('id', t.id, 'name', t.name, 'category', t.category)
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) as tags,
          0 as match_score,
          upr.company_name
         FROM jobs j
         LEFT JOIN job_tags jt ON j.id = jt.job_id
         LEFT JOIN tags t ON jt.tag_id = t.id
         LEFT JOIN users u ON j.recruiter_id = u.id
         LEFT JOIN user_profiles_recruiter upr ON u.id = upr.user_id
         WHERE j.status = 'active'
         GROUP BY j.id, upr.company_name
         ORDER BY j.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
      );

      return res.status(200).json({
        success: true,
        data: {
          jobs: result.rows,
          message: 'Showing recent jobs (no preferences set)',
        },
      });
    }

    // Build preference tags array
    const preferredTags = [
      ...(preferences.preferred_job_titles || []),
      ...(preferences.preferred_industries || []),
    ];

    // Query jobs with match scoring
    const result = await db.query(
      `WITH user_preferences AS (
        SELECT unnest($1::text[]) as pref_tag
      ),
      job_matches AS (
        SELECT 
          j.*,
          COUNT(DISTINCT CASE 
            WHEN LOWER(t.name) = ANY(
              SELECT LOWER(pref_tag) FROM user_preferences
            ) THEN t.id 
          END) as match_score,
          COALESCE(
            json_agg(DISTINCT
              json_build_object('id', t.id, 'name', t.name, 'category', t.category)
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) as tags,
          upr.company_name
        FROM jobs j
        LEFT JOIN job_tags jt ON j.id = jt.job_id
        LEFT JOIN tags t ON jt.tag_id = t.id
        LEFT JOIN users u ON j.recruiter_id = u.id
        LEFT JOIN user_profiles_recruiter upr ON u.id = upr.user_id
        WHERE j.status = 'active'
          ${preferences.preferred_locations && preferences.preferred_locations.length > 0 
            ? 'AND (j.location = ANY($4) OR j.location IS NULL)' 
            : ''}
          ${preferences.salary_expectation_min 
            ? 'AND (j.salary_max >= $2 OR j.salary_max IS NULL)' 
            : ''}
          ${preferences.salary_expectation_max 
            ? 'AND (j.salary_min <= $3 OR j.salary_min IS NULL)' 
            : ''}
        GROUP BY j.id, upr.company_name
      )
      SELECT * FROM job_matches
      ORDER BY match_score DESC, created_at DESC
      LIMIT $5 OFFSET $6`,
      [
        preferredTags,
        preferences.salary_expectation_min,
        preferences.salary_expectation_max,
        preferences.preferred_locations || [],
        limit,
        (page - 1) * limit,
      ]
    );

    res.status(200).json({
      success: true,
      data: {
        jobs: result.rows.map(job => ({
          ...job,
          match_score_display: `${job.match_score}/${preferredTags.length}`,
        })),
        totalPreferredTags: preferredTags.length,
      },
    });
  } catch (error) {
    console.error('Get recommended jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended jobs',
    });
  }
};

/**
 * Apply to a job (Seeker only)
 */
exports.applyToJob = async (req, res) => {
  try {
    const seekerId = req.user.userId;
    const jobId = req.params.id;
    const { cover_letter } = req.body;

    // Validate job exists and is active
    const jobCheck = await db.query(
      'SELECT id, title, status FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobCheck.rows[0];

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications',
      });
    }

    // Check if seeker has already applied
    const existingApplication = await db.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND seeker_id = $2',
      [jobId, seekerId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job',
      });
    }

    // Create application
    const result = await db.query(
      `INSERT INTO job_applications (job_id, seeker_id, cover_letter, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [jobId, seekerId, cover_letter || null]
    );

    const application = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application: {
          id: application.id,
          job_id: application.job_id,
          seeker_id: application.seeker_id,
          status: application.status,
          cover_letter: application.cover_letter,
          created_at: application.created_at,
        },
        job: {
          id: job.id,
          title: job.title,
        },
      },
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
    });
  }
};

/**
 * Get all applications for the authenticated seeker
 */
exports.getSeekerApplications = async (req, res) => {
  try {
    const seekerId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT 
        ja.id as application_id,
        ja.status as application_status,
        ja.cover_letter,
        ja.created_at as applied_at,
        ja.updated_at as application_updated_at,
        j.id as job_id,
        j.title as job_title,
        j.location as job_location,
        j.employment_type,
        j.salary_min,
        j.salary_max,
        upr.company_name,
        upr.company_logo_s3_url
      FROM job_applications ja
      INNER JOIN jobs j ON ja.job_id = j.id
      INNER JOIN users u ON j.recruiter_id = u.id
      LEFT JOIN user_profiles_recruiter upr ON u.id = upr.user_id
      WHERE ja.seeker_id = $1
    `;

    const params = [seekerId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ja.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ja.created_at DESC`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM job_applications WHERE seeker_id = $1';
    const countParams = [seekerId];
    let countParamIndex = 2;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalApplications = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        applications: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalApplications,
          pages: Math.ceil(totalApplications / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get seeker applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
    });
  }
};

/**
 * Get specific application details (Recruiter only)
 */
exports.getApplicationDetails = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const applicationId = req.params.id;

    // Verify application belongs to a job posted by this recruiter
    const applicationCheck = await db.query(
      `SELECT ja.*, j.recruiter_id 
       FROM job_applications ja
       INNER JOIN jobs j ON ja.job_id = j.id
       WHERE ja.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or unauthorized',
      });
    }

    // Get full application details including seeker profile
    const result = await db.query(
      `SELECT 
        ja.id as application_id,
        ja.status as application_status,
        ja.cover_letter,
        ja.created_at as applied_at,
        ja.updated_at as application_updated_at,
        j.id as job_id,
        j.title as job_title,
        u.id as seeker_id,
        u.email as seeker_email,
        ups.full_name,
        ups.current_job,
        ups.years_experience,
        ups.location,
        ups.phone,
        ups.profile_image_s3_url,
        ups.resume_s3_url
      FROM job_applications ja
      INNER JOIN jobs j ON ja.job_id = j.id
      INNER JOIN users u ON ja.seeker_id = u.id
      INNER JOIN user_profiles_seeker ups ON u.id = ups.user_id
      WHERE ja.id = $1`,
      [applicationId]
    );

    res.status(200).json({
      success: true,
      data: {
        application: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
    });
  }
};

/**
 * Update application status (Recruiter only)
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const recruiterId = req.user.userId;
    const applicationId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, reviewed, accepted, rejected',
      });
    }

    // Verify application belongs to a job posted by this recruiter
    const applicationCheck = await db.query(
      `SELECT ja.id 
       FROM job_applications ja
       INNER JOIN jobs j ON ja.job_id = j.id
       WHERE ja.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or unauthorized',
      });
    }

    // Update status
    const result = await db.query(
      `UPDATE job_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, applicationId]
    );

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: {
        application: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
    });
  }
};
