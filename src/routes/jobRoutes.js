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

router.get(
  '/jobs/:id',
  verifyToken,
  requireCompleteProfile,
  jobController.getJobById
);

module.exports = router;
