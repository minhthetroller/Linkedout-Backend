# LinkedOut Backend Testing Suite

This directory contains comprehensive testing for the LinkedOut Backend API.

## 📂 Directory Structure

```
tests/
├── setup.js                    # Global test configuration
├── unit/                       # Unit tests (components in isolation)
│   ├── middleware/
│   │   └── authMiddleware.test.js
│   └── services/
│       ├── geminiService.test.js
│       └── s3Service.test.js
├── integration/                # Integration tests (API endpoints)
│   └── auth.test.js
└── system/                     # System tests (end-to-end workflows)
    └── complete-workflows.test.js
```

## 🧪 Test Categories

### Unit Tests
Test individual functions and components in isolation with mocked dependencies.

**Files:**
- `unit/middleware/authMiddleware.test.js` - JWT auth, user type checks, profile completion
- `unit/services/geminiService.test.js` - AI tag generation, caching
- `unit/services/s3Service.test.js` - File upload/download, signed URLs

**Coverage:** 35+ test cases

### Integration Tests
Test API endpoints with database interactions and request/response handling.

**Files:**
- `integration/auth.test.js` - Complete authentication flow testing

**Coverage:** 20+ test cases

### System Tests
Test complete user journeys from start to finish.

**Files:**
- `system/complete-workflows.test.js` - Seeker workflow, recruiter workflow, job matching

**Coverage:** 15+ test cases

## 🚀 Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific suites
npm run test:unit
npm run test:integration
npm run test:system

# Generate coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Example Output

```
PASS  tests/unit/middleware/authMiddleware.test.js
PASS  tests/unit/services/geminiService.test.js
PASS  tests/unit/services/s3Service.test.js
PASS  tests/integration/auth.test.js
PASS  tests/system/complete-workflows.test.js

Test Suites: 5 passed, 5 total
Tests:       70 passed, 70 total
Snapshots:   0 total
Time:        10.234s
```

## 📊 What's Tested

### Authentication & Authorization ✅
- User registration (3-step process)
- Login with email/password
- JWT token generation and validation
- Token expiration handling
- User type authorization (seeker vs recruiter)
- Profile completion enforcement

### Job Management ✅
- Job posting creation
- Job updates and deletion
- Job filtering and search
- Job recommendations based on preferences
- AI-powered tag generation
- Match score calculation

### File Uploads ✅
- Resume upload (PDF, DOC, DOCX)
- Profile image upload (JPG, PNG)
- S3 file storage
- Signed URL generation
- File deletion

### User Workflows ✅
- Complete seeker journey
- Complete recruiter journey
- Profile completion flow
- Preference management

### Business Logic ✅
- Job-seeker matching algorithm
- Tag-based recommendations
- Salary range filtering
- Location-based search
- Employment type filtering

## 📈 Test Coverage

Current coverage (as designed):

- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

View detailed coverage:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔧 Configuration

### jest.config.js
Main Jest configuration with coverage thresholds and test patterns.

### .env.test
Test-specific environment variables (separate from production).

### setup.js
Global test setup, utilities, and timeout configuration.

## 💡 Test Philosophy

These tests follow the **Test Pyramid** approach:

```
         /\
        /  \    System Tests (Few)
       /----\   End-to-end workflows
      /      \  
     /--------\ Integration Tests (Some)
    /          \ API endpoint testing
   /------------\
  /______________\ Unit Tests (Many)
   Component testing
```

## 🎯 Key Features

1. **Mocked External Services**
   - AWS S3 operations
   - Gemini AI calls
   - Database operations (where appropriate)

2. **Realistic Test Data**
   - Sample user profiles
   - Mock job postings
   - Generated tags

3. **Comprehensive Coverage**
   - Success cases
   - Error cases
   - Edge cases
   - Validation

4. **Clear Output**
   - Descriptive test names
   - Console logging in system tests
   - Helpful error messages

## 📝 Writing New Tests

### Template Structure

```javascript
describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Arrange test data
  });

  // Cleanup
  afterEach(() => {
    // Clean up resources
  });

  // Test cases
  it('should do something correctly', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle errors gracefully', () => {
    expect(() => {
      functionUnderTest(null);
    }).toThrow();
  });
});
```

## 🐛 Common Issues

### Issue: Tests fail with "Cannot find module"
**Solution**: Run `npm install` to ensure all dependencies are installed.

### Issue: Database connection errors
**Solution**: Check `.env.test` database credentials and ensure PostgreSQL is running.

### Issue: Tests timeout
**Solution**: Increase `testTimeout` in `jest.config.js` or add `--forceExit` flag.

### Issue: Mock data persists between tests
**Solution**: Ensure `beforeEach` properly resets all mock data.

## 📚 Documentation

- **Full Guide**: See `TESTING_DOCUMENTATION.md`
- **Quick Start**: See `TESTING_QUICKSTART.md`
- **API Reference**: See `API_DOCUMENTATION.md`

## ✅ Pre-commit Checklist

Before committing code:

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets threshold (`npm run test:coverage`)
- [ ] New features have tests
- [ ] Tests are properly described
- [ ] No commented-out tests
- [ ] Mock data is cleaned up

## 🎓 Resources

- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest
- Testing Best Practices: https://testingjavascript.com/

---

**Need Help?**

1. Check existing test files for examples
2. Review the documentation files
3. Run tests with `--verbose` for detailed output
4. Use `--detectOpenHandles` to find async issues

---

**Version**: 1.0.0  
**Last Updated**: November 18, 2025
