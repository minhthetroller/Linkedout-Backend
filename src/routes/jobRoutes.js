const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, checkUserType, requireCompleteProfile } = require('../middleware/authMiddleware');

// Recruiter routes (protected, recruiter only, complete profile required)
router.post(
  '/recruiter/jobs',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.createJob
);

router.get(
  '/recruiter/jobs',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.getRecruiterJobs
);

router.put(
  '/recruiter/jobs/:id',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.updateJob
);

router.delete(
  '/recruiter/jobs/:id',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.deleteJob
);

// Get applicants for a specific job (recruiter only)
router.get(
  '/recruiter/jobs/:id/applicants',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.getJobApplicants
);

// Get all applicants across all recruiter's jobs
router.get(
  '/recruiter/applicants',
  verifyToken,
  checkUserType(['recruiter']),
  requireCompleteProfile,
  jobController.getAllApplicants
);

// Seeker/Public routes (protected, complete profile required)
router.get(
  '/jobs',
  verifyToken,
  requireCompleteProfile,
  jobController.browseJobs
);

router.get(
  '/jobs/recommended',
  verifyToken,
  checkUserType(['seeker']),
  requireCompleteProfile,
  jobController.getRecommendedJobs
);

// Apply to a job (seeker only) - MUST come before /jobs/:id to avoid route conflict
router.post(
  '/jobs/:id/apply',
  verifyToken,
  checkUserType(['seeker']),
  requireCompleteProfile,
  jobController.applyToJob
);

router.get(
  '/jobs/:id',
  verifyToken,
  requireCompleteProfile,
  jobController.getJobById
);

module.exports = router;
