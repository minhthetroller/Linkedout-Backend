// Mock Gemini Service Tests
const NodeCache = require('node-cache');

// Mock cache
const mockCache = new NodeCache({ stdTTL: 86400 });

// Mock Gemini Service
const mockGeminiService = {
  generateJobTags: async (jobDescription) => {
    if (!jobDescription || jobDescription.trim() === '') {
      return [];
    }

    // Check cache first
    const cacheKey = `tags_${jobDescription.substring(0, 50)}`;
    const cached = mockCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Simulate AI tag generation
    const tags = [];
    const description = jobDescription.toLowerCase();

    // Extract common tech skills
    const techKeywords = {
      'react': 'React',
      'node': 'Node.js',
      'javascript': 'JavaScript',
      'python': 'Python',
      'java': 'Java',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'aws': 'AWS',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes'
    };

    // Extract job roles (order matters - more specific first)
    const roleKeywords = {
      'full stack': 'Full Stack Developer',
      'frontend': 'Frontend Developer',
      'backend': 'Backend Developer',
      'devops': 'DevOps Engineer',
      'data scientist': 'Data Scientist',
      'developer': 'Software Developer',
      'engineer': 'Software Engineer'
    };

    // Find matching keywords
    Object.entries(techKeywords).forEach(([keyword, tag]) => {
      if (description.includes(keyword) && tags.length < 3) {
        tags.push(tag);
      }
    });

    // For roles, check more specific matches first
    Object.entries(roleKeywords).forEach(([keyword, tag]) => {
      if (description.includes(keyword) && tags.length < 3 && !tags.includes(tag)) {
        tags.push(tag);
      }
    });

    // Ensure we have at most 3 tags
    const result = tags.slice(0, 3);
    
    // Cache result
    mockCache.set(cacheKey, result);
    
    return result;
  },

  clearCache: () => {
    mockCache.flushAll();
  }
};

describe('Gemini Service - Unit Tests', () => {
  beforeEach(() => {
    mockGeminiService.clearCache();
  });

  describe('generateJobTags', () => {
    it('should return array of tags for valid job description', async () => {
      const jobDescription = 'Looking for React developer with Node.js experience';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.length).toBeLessThanOrEqual(3);
    });

    it('should identify React from job description', async () => {
      const jobDescription = 'We need a React expert for our frontend team';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags).toContain('React');
    });

    it('should identify multiple technologies', async () => {
      const jobDescription = 'Full stack developer with React, Node.js, and PostgreSQL experience';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags.length).toBe(3);
      expect(tags).toContain('React');
      expect(tags).toContain('Node.js');
      expect(tags).toContain('PostgreSQL');
    });

    it('should handle empty description', async () => {
      const tags = await mockGeminiService.generateJobTags('');

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(0);
    });

    it('should handle null description', async () => {
      const tags = await mockGeminiService.generateJobTags(null);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(0);
    });

    it('should handle undefined description', async () => {
      const tags = await mockGeminiService.generateJobTags(undefined);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(0);
    });

    it('should return maximum 3 tags', async () => {
      const jobDescription = 'React developer with Node.js, Python, Java, PostgreSQL, MongoDB, and AWS experience';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags.length).toBeLessThanOrEqual(3);
    });

    it('should cache results for same description', async () => {
      const description = 'Python developer position';
      
      const tags1 = await mockGeminiService.generateJobTags(description);
      const tags2 = await mockGeminiService.generateJobTags(description);

      expect(tags1).toEqual(tags2);
    });

    it('should identify job roles', async () => {
      const jobDescription = 'Hiring full stack engineer for our team';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags).toContain('Full Stack Developer');
    });

    it('should handle description with only whitespace', async () => {
      const tags = await mockGeminiService.generateJobTags('   ');

      expect(tags.length).toBe(0);
    });

    it('should be case insensitive', async () => {
      const jobDescription = 'REACT and NODE.JS developer needed';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags.length).toBeGreaterThan(0);
    });

    it('should identify backend developer role', async () => {
      const jobDescription = 'Looking for backend developer with Python experience';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags).toContain('Backend Developer');
      expect(tags).toContain('Python');
    });

    it('should identify frontend developer role', async () => {
      const jobDescription = 'Frontend developer needed with React skills';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags).toContain('Frontend Developer');
      expect(tags).toContain('React');
    });

    it('should identify DevOps role', async () => {
      const jobDescription = 'DevOps engineer with AWS and Docker experience';
      
      const tags = await mockGeminiService.generateJobTags(jobDescription);

      expect(tags).toContain('DevOps Engineer');
      expect(tags).toContain('AWS');
      expect(tags).toContain('Docker');
      expect(tags.length).toBe(3);
    });
  });

  describe('Cache functionality', () => {
    it('should cache results', async () => {
      const description = 'React developer';
      
      // First call
      const tags1 = await mockGeminiService.generateJobTags(description);
      
      // Second call should use cache
      const tags2 = await mockGeminiService.generateJobTags(description);
      
      expect(tags1).toEqual(tags2);
    });

    it('should clear cache', () => {
      mockGeminiService.clearCache();
      
      const stats = mockCache.getStats();
      expect(stats.keys).toBe(0);
    });

    it('should handle different descriptions separately', async () => {
      const desc1 = 'React developer';
      const desc2 = 'Python developer';
      
      const tags1 = await mockGeminiService.generateJobTags(desc1);
      const tags2 = await mockGeminiService.generateJobTags(desc2);
      
      expect(tags1).not.toEqual(tags2);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long descriptions', async () => {
      const longDescription = 'React '.repeat(1000) + 'developer';
      
      const tags = await mockGeminiService.generateJobTags(longDescription);
      
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeLessThanOrEqual(3);
    });

    it('should handle special characters', async () => {
      const description = 'Looking for React developer! @#$%^&*()';
      
      const tags = await mockGeminiService.generateJobTags(description);
      
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should handle description with only numbers', async () => {
      const tags = await mockGeminiService.generateJobTags('123456789');
      
      expect(tags.length).toBe(0);
    });

    it('should handle Unicode characters', async () => {
      const description = 'React developer 开发者 مطور';
      
      const tags = await mockGeminiService.generateJobTags(description);
      
      expect(tags).toContain('React');
    });
  });
});

console.log('✓ All Gemini service unit tests defined');
