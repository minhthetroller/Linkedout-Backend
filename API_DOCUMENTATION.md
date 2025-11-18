# LinkedOut Backend API Documentation

Complete API reference for frontend Android app integration.

**Base URL**: `http://your-server-url:3000/api`

---

## Table of Contents
- [Authentication](#authentication)
- [User Profile](#user-profile)
- [Jobs - Recruiter](#jobs---recruiter)
- [Jobs - Seeker](#jobs---seeker)
- [File Uploads](#file-uploads)
- [Error Responses](#error-responses)

---

## Authentication

### 1. Sign Up - Step 1 (Create Account)

**Endpoint**: `POST /auth/signup/step1`

**Description**: Creates a new user account with basic information. This is the first step of the multi-step registration process.

**Headers**: None (public endpoint)

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "user_type": "seeker",
  "full_name": "John Doe",
  "birth_date": "1995-06-15"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 6 characters |
| user_type | string | Yes | Either "seeker" or "recruiter" |
| full_name | string | Yes | User's full name |
| birth_date | string | Yes | ISO 8601 date format (YYYY-MM-DD) |

**Success Response** (201):
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "userType": "seeker",
    "profileCompletionStep": 1
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

### 2. Sign Up - Step 2 (Personal/Company Info)

**Endpoint**: `POST /auth/signup/step2`

**Description**: Completes personal information for seekers or company information for recruiters. This step is **required** before accessing app features.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (Seeker)**:
```json
{
  "current_job": "Software Engineer",
  "years_experience": 5,
  "location": "San Francisco, CA",
  "phone": "+1234567890"
}
```

**Request Body (Recruiter)**:
```json
{
  "company_name": "Tech Corp Inc.",
  "company_size": "100-500",
  "company_website": "https://techcorp.com",
  "phone": "+1234567890"
}
```

**Parameters (Seeker)**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| current_job | string | No | Current job title |
| years_experience | integer | No | Years of work experience |
| location | string | No | Current location |
| phone | string | No | Contact phone number |

**Parameters (Recruiter)**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| company_name | string | Yes | Company name |
| company_size | string | No | Company size range |
| company_website | string | No | Company website URL |
| phone | string | No | Contact phone number |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profileCompletionStep": 2
  }
}
```

---

### 3. Sign Up - Step 3 (Preferences - Optional)

**Endpoint**: `POST /auth/signup/step3`

**Description**: Adds job preferences for seekers or completes final setup for recruiters. This step is **optional** and can be skipped.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (Seeker - With Preferences)**:
```json
{
  "preferred_job_titles": ["Software Engineer", "Full Stack Developer"],
  "preferred_industries": ["Technology", "Finance"],
  "preferred_locations": ["San Francisco", "Remote"],
  "salary_expectation_min": 80000,
  "salary_expectation_max": 150000
}
```

**Request Body (Seeker - Skip Preferences)**:
```json
{
  "skip": true
}
```

**Request Body (Recruiter)**:
```json
{}
```

**Parameters (Seeker)**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| preferred_job_titles | array[string] | No | List of preferred job titles |
| preferred_industries | array[string] | No | List of preferred industries |
| preferred_locations | array[string] | No | List of preferred locations |
| salary_expectation_min | number | No | Minimum expected salary |
| salary_expectation_max | number | No | Maximum expected salary |
| skip | boolean | No | Set to true to skip preferences |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "profileCompletionStep": 3
  }
}
```

---

### 4. Login

**Endpoint**: `POST /auth/login`

**Description**: Authenticates user and returns JWT token.

**Headers**: None (public endpoint)

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email |
| password | string | Yes | User's password |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "userType": "seeker",
    "profileCompletionStep": 2
  }
}
```

**Error Response** (401):
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Note**: Use `profileCompletionStep` to determine if user needs to complete profile:
- Step 1: Account created, needs personal info
- Step 2: Can use app fully
- Step 3: Profile completely finished

---

## User Profile

### 5. Get Current User Profile

**Endpoint**: `GET /auth/me`

**Description**: Retrieves complete profile information for the authenticated user.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**: None

**Success Response (Seeker)** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@example.com",
      "user_type": "seeker",
      "created_at": "2025-11-18T10:30:00.000Z"
    },
    "profile": {
      "id": 1,
      "user_id": 1,
      "full_name": "John Doe",
      "birth_date": "1995-06-15",
      "phone": "+1234567890",
      "location": "San Francisco, CA",
      "current_job": "Software Engineer",
      "years_experience": 5,
      "resume_s3_url": "https://linkedout-bucket.s3.amazonaws.com/resumes/1/resume.pdf",
      "profile_image_s3_url": "https://linkedout-bucket.s3.amazonaws.com/profile-images/1/photo.jpg",
      "profile_completion_step": 3,
      "created_at": "2025-11-18T10:30:00.000Z",
      "updated_at": "2025-11-18T10:35:00.000Z"
    },
    "preferences": {
      "id": 1,
      "user_id": 1,
      "preferred_job_titles": ["Software Engineer", "Full Stack Developer"],
      "preferred_industries": ["Technology", "Finance"],
      "preferred_locations": ["San Francisco", "Remote"],
      "salary_expectation_min": 80000,
      "salary_expectation_max": 150000,
      "is_skipped": false,
      "created_at": "2025-11-18T10:35:00.000Z",
      "updated_at": "2025-11-18T10:35:00.000Z"
    },
    "canUseApp": true,
    "profileComplete": true
  }
}
```

**Success Response (Recruiter)** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "email": "recruiter@techcorp.com",
      "user_type": "recruiter",
      "created_at": "2025-11-18T10:30:00.000Z"
    },
    "profile": {
      "id": 1,
      "user_id": 2,
      "full_name": "Jane Smith",
      "company_name": "Tech Corp Inc.",
      "company_size": "100-500",
      "company_website": "https://techcorp.com",
      "phone": "+1234567890",
      "company_logo_s3_url": "https://linkedout-bucket.s3.amazonaws.com/profile-images/2/logo.png",
      "profile_completion_step": 2,
      "created_at": "2025-11-18T10:30:00.000Z",
      "updated_at": "2025-11-18T10:35:00.000Z"
    },
    "preferences": null,
    "canUseApp": true,
    "profileComplete": false
  }
}
```

**Response Fields**:
- `canUseApp`: Boolean indicating if user has completed minimum required profile (step >= 2)
- `profileComplete`: Boolean indicating if user has completed all profile steps (step >= 3)

---

## Jobs - Recruiter

### 6. Create Job Posting

**Endpoint**: `POST /recruiter/jobs`

**Description**: Creates a new job posting. The system automatically generates 3 relevant tags using AI based on the job description.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- User must be a recruiter
- Profile must be complete (profileCompletionStep >= 2)

**Request Body**:
```json
{
  "title": "Senior Full Stack Developer",
  "about": "Join our innovative team building next-gen solutions",
  "description": "We are seeking an experienced Full Stack Developer with expertise in React, Node.js, and PostgreSQL. You will work on cutting-edge web applications and microservices architecture. Strong problem-solving skills and experience with AWS are required.",
  "salary_min": 100000,
  "salary_max": 150000,
  "benefits": "Health insurance, 401k matching, flexible hours, remote work options",
  "location": "San Francisco, CA (Remote)",
  "employment_type": "Full-time"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Job title |
| about | string | No | Brief about section |
| description | string | Yes | Detailed job description (used for AI tag generation) |
| salary_min | number | No | Minimum salary |
| salary_max | number | No | Maximum salary |
| benefits | string | No | Job benefits |
| location | string | No | Job location |
| employment_type | string | No | e.g., "Full-time", "Part-time", "Contract" |

**Success Response** (201):
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "job": {
      "id": 1,
      "recruiter_id": 2,
      "title": "Senior Full Stack Developer",
      "about": "Join our innovative team building next-gen solutions",
      "description": "We are seeking an experienced Full Stack Developer...",
      "salary_min": 100000,
      "salary_max": 150000,
      "benefits": "Health insurance, 401k matching...",
      "location": "San Francisco, CA (Remote)",
      "employment_type": "Full-time",
      "status": "active",
      "created_at": "2025-11-18T12:00:00.000Z",
      "updated_at": "2025-11-18T12:00:00.000Z"
    },
    "tags": [
      {
        "id": 15,
        "name": "React",
        "category": "Skills"
      },
      {
        "id": 20,
        "name": "Node.js",
        "category": "Skills"
      },
      {
        "id": 45,
        "name": "Full Stack Developer",
        "category": "Job Roles"
      }
    ]
  }
}
```

**Note**: Tags are automatically generated by AI. If AI generation fails, the job will still be created but with an empty tags array.

---

### 7. Get Recruiter's Jobs

**Endpoint**: `GET /recruiter/jobs`

**Description**: Retrieves all jobs posted by the authenticated recruiter.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- User must be a recruiter
- Profile must be complete

**Request Body**: None

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "recruiter_id": 2,
        "title": "Senior Full Stack Developer",
        "about": "Join our innovative team",
        "description": "We are seeking...",
        "salary_min": 100000,
        "salary_max": 150000,
        "benefits": "Health insurance...",
        "location": "San Francisco, CA",
        "employment_type": "Full-time",
        "status": "active",
        "created_at": "2025-11-18T12:00:00.000Z",
        "updated_at": "2025-11-18T12:00:00.000Z",
        "tags": [
          {
            "id": 15,
            "name": "React",
            "category": "Skills"
          },
          {
            "id": 20,
            "name": "Node.js",
            "category": "Skills"
          }
        ]
      }
    ]
  }
}
```

---

### 8. Update Job Posting

**Endpoint**: `PUT /recruiter/jobs/:id`

**Description**: Updates an existing job posting. If the description is changed, tags will be automatically regenerated.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- User must be a recruiter
- Job must belong to the recruiter
- Profile must be complete

**URL Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Job ID to update |

**Request Body** (all fields optional):
```json
{
  "title": "Senior Full Stack Engineer",
  "description": "Updated job description with new requirements...",
  "salary_min": 110000,
  "salary_max": 160000,
  "status": "active"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Updated job title |
| about | string | No | Updated about section |
| description | string | No | Updated description (triggers tag regeneration) |
| salary_min | number | No | Updated minimum salary |
| salary_max | number | No | Updated maximum salary |
| benefits | string | No | Updated benefits |
| location | string | No | Updated location |
| employment_type | string | No | Updated employment type |
| status | string | No | "active" or "closed" |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Job updated successfully",
  "data": {
    "job": {
      "id": 1,
      "recruiter_id": 2,
      "title": "Senior Full Stack Engineer",
      "description": "Updated job description...",
      "salary_min": 110000,
      "salary_max": 160000,
      "status": "active",
      "updated_at": "2025-11-18T14:00:00.000Z",
      "tags": [
        {
          "id": 15,
          "name": "React",
          "category": "Skills"
        }
      ]
    }
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "message": "Job not found or unauthorized"
}
```

---

### 9. Delete Job Posting

**Endpoint**: `DELETE /recruiter/jobs/:id`

**Description**: Closes a job posting (soft delete - sets status to "closed").

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- User must be a recruiter
- Job must belong to the recruiter
- Profile must be complete

**URL Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Job ID to delete |

**Request Body**: None

**Success Response** (200):
```json
{
  "success": true,
  "message": "Job closed successfully"
}
```

**Error Response** (404):
```json
{
  "success": false,
  "message": "Job not found or unauthorized"
}
```

---

## Jobs - Seeker

### 10. Browse Jobs

**Endpoint**: `GET /jobs`

**Description**: Browse all active job postings with optional filters and pagination.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- Profile must be complete (profileCompletionStep >= 2)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| location | string | No | Filter by location (partial match) |
| salary_min | number | No | Minimum salary filter |
| salary_max | number | No | Maximum salary filter |
| employment_type | string | No | Filter by employment type |
| tags | string or array | No | Filter by tag names |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Results per page (default: 20) |

**Example Request**:
```
GET /jobs?location=San Francisco&salary_min=80000&employment_type=Full-time&tags=React&page=1&limit=20
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "recruiter_id": 2,
        "title": "Senior Full Stack Developer",
        "about": "Join our innovative team",
        "description": "We are seeking an experienced...",
        "salary_min": 100000,
        "salary_max": 150000,
        "benefits": "Health insurance, 401k...",
        "location": "San Francisco, CA (Remote)",
        "employment_type": "Full-time",
        "status": "active",
        "created_at": "2025-11-18T12:00:00.000Z",
        "updated_at": "2025-11-18T12:00:00.000Z",
        "tags": [
          {
            "id": 15,
            "name": "React",
            "category": "Skills"
          },
          {
            "id": 20,
            "name": "Node.js",
            "category": "Skills"
          }
        ],
        "recruiter_email": "recruiter@techcorp.com",
        "company_name": "Tech Corp Inc."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### 11. Get Job Details

**Endpoint**: `GET /jobs/:id`

**Description**: Retrieves detailed information about a specific job posting.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- Profile must be complete

**URL Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Job ID |

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "job": {
      "id": 1,
      "recruiter_id": 2,
      "title": "Senior Full Stack Developer",
      "about": "Join our innovative team building next-gen solutions",
      "description": "We are seeking an experienced Full Stack Developer with expertise in React, Node.js, and PostgreSQL...",
      "salary_min": 100000,
      "salary_max": 150000,
      "benefits": "Health insurance, 401k matching, flexible hours, remote work options",
      "location": "San Francisco, CA (Remote)",
      "employment_type": "Full-time",
      "status": "active",
      "created_at": "2025-11-18T12:00:00.000Z",
      "updated_at": "2025-11-18T12:00:00.000Z",
      "tags": [
        {
          "id": 15,
          "name": "React",
          "category": "Skills"
        },
        {
          "id": 20,
          "name": "Node.js",
          "category": "Skills"
        },
        {
          "id": 45,
          "name": "Full Stack Developer",
          "category": "Job Roles"
        }
      ],
      "recruiter_email": "recruiter@techcorp.com",
      "company_name": "Tech Corp Inc.",
      "company_size": "100-500",
      "company_website": "https://techcorp.com"
    }
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "message": "Job not found"
}
```

---

### 12. Get Recommended Jobs

**Endpoint**: `GET /jobs/recommended`

**Description**: Retrieves personalized job recommendations based on user's preferences. Jobs are ranked by match score (number of matching tags).

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**: 
- User must be a seeker
- Profile must be complete

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Results per page (default: 20) |

**Success Response (With Preferences)** (200):
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Senior Full Stack Developer",
        "about": "Join our innovative team",
        "description": "We are seeking...",
        "salary_min": 100000,
        "salary_max": 150000,
        "location": "San Francisco, CA",
        "employment_type": "Full-time",
        "status": "active",
        "created_at": "2025-11-18T12:00:00.000Z",
        "match_score": 3,
        "match_score_display": "3/4",
        "tags": [
          {
            "id": 15,
            "name": "React",
            "category": "Skills"
          },
          {
            "id": 20,
            "name": "Node.js",
            "category": "Skills"
          }
        ],
        "company_name": "Tech Corp Inc."
      },
      {
        "id": 2,
        "title": "Backend Developer",
        "match_score": 2,
        "match_score_display": "2/4",
        "...": "..."
      }
    ],
    "totalPreferredTags": 4
  }
}
```

**Success Response (No Preferences/Skipped)** (200):
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 5,
        "title": "Marketing Manager",
        "match_score": 0,
        "created_at": "2025-11-18T15:00:00.000Z",
        "...": "..."
      }
    ],
    "message": "Showing recent jobs (no preferences set)"
  }
}
```

**Note**: 
- Jobs are sorted by `match_score` (descending) then by `created_at` (descending)
- `match_score` shows how many user preference tags match the job's tags
- If user skipped preferences, shows recent jobs without scoring

---

## File Uploads

### 13. Upload Resume

**Endpoint**: `POST /upload/resume`

**Description**: Uploads a resume file to AWS S3. Replaces existing resume if one exists.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Requirements**: 
- User must be a seeker

**Request Body** (multipart/form-data):
| Field | Type | Description |
|-------|------|-------------|
| resume | file | Resume file (PDF, DOC, DOCX only, max 5MB) |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "resumeUrl": "https://linkedout-bucket-1.s3.ap-southeast-1.amazonaws.com/resumes/1/1731936000000-a1b2c3d4e5f6g7h8.pdf"
  }
}
```

**Error Responses**:

(400) No file:
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

(400) Invalid file type:
```json
{
  "success": false,
  "message": "Invalid file type. Only PDF, DOC, and DOCX files are allowed."
}
```

(400) File too large:
```json
{
  "success": false,
  "message": "File size too large"
}
```

---

### 14. Upload Profile Image

**Endpoint**: `POST /upload/profile-image`

**Description**: Uploads a profile image for seekers or company logo for recruiters to AWS S3. Replaces existing image if one exists.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Requirements**: 
- Both user types allowed

**Request Body** (multipart/form-data):
| Field | Type | Description |
|-------|------|-------------|
| image | file | Image file (JPG, JPEG, PNG only, max 2MB) |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "https://linkedout-bucket-1.s3.ap-southeast-1.amazonaws.com/profile-images/1/1731936000000-x9y8z7w6v5u4t3s2.jpg"
  }
}
```

**Error Responses**:

(400) Invalid file type:
```json
{
  "success": false,
  "message": "Invalid file type. Only JPG, JPEG, and PNG images are allowed."
}
```

(400) File too large:
```json
{
  "success": false,
  "message": "File size too large"
}
```

---

### 15. Get Signed File URL

**Endpoint**: `GET /upload/file-url`

**Description**: Generates a temporary signed URL for accessing private S3 files (resumes, images). URL expires after 1 hour.

**Headers**: 
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fileUrl | string | Yes | Full S3 URL from profile or job data |

**Example Request**:
```
GET /upload/file-url?fileUrl=https://linkedout-bucket-1.s3.ap-southeast-1.amazonaws.com/resumes/1/resume.pdf
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "signedUrl": "https://linkedout-bucket-1.s3.ap-southeast-1.amazonaws.com/resumes/1/resume.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "expiresIn": 3600
  }
}
```

**Note**: Use this endpoint when you need to display/download files that are stored privately in S3.

---

## Error Responses

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Resource created successfully |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid or missing token) |
| 403 | Forbidden (insufficient permissions or incomplete profile) |
| 404 | Resource not found |
| 500 | Internal server error |

### Standard Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

### Validation Error Response

When request validation fails:

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid value",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### Authentication Errors

**No Token** (401):
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Invalid Token** (401):
```json
{
  "success": false,
  "message": "Invalid token"
}
```

**Token Expired** (401):
```json
{
  "success": false,
  "message": "Token expired"
}
```

### Authorization Errors

**Wrong User Type** (403):
```json
{
  "success": false,
  "message": "Access denied. Required user type: recruiter"
}
```

**Incomplete Profile** (403):
```json
{
  "success": false,
  "message": "Please complete your profile to access this feature",
  "profileCompletionStep": 1,
  "requiredStep": 2
}
```

---

## Best Practices for Android Integration

### 1. Token Management
- Store JWT token securely (use Android Keystore)
- Include token in all protected endpoints: `Authorization: Bearer <token>`
- Handle token expiration (401) by redirecting to login
- Token expires in 7 days by default

### 2. Profile Completion Flow
After login, check `profileCompletionStep`:
- Step 1: Show Step 2 form
- Step 2: User can access app, optionally show Step 3 prompt
- Step 3: Profile fully complete

### 3. Error Handling
- Check `success` field in all responses
- Show appropriate error messages from `message` field
- Handle network errors gracefully
- Implement retry logic for failed requests

### 4. File Upload Implementation
```kotlin
// Example multipart upload
val file = File("path/to/resume.pdf")
val requestBody = file.asRequestBody("application/pdf".toMediaTypeOrNull())
val part = MultipartBody.Part.createFormData("resume", file.name, requestBody)
```

### 5. Pagination
- Use `page` and `limit` parameters for list endpoints
- Show loading indicator while fetching
- Implement infinite scroll or load more button
- Check `pagination.pages` to know if more data exists

### 6. Image Loading
- Use signed URLs for private S3 images
- Cache signed URLs (they expire in 1 hour)
- Use image loading library (Glide, Coil) with proper error handling

### 7. Job Recommendations
- Show match score prominently: "3/4 match"
- Sort by match score to show best matches first
- Encourage users to complete preferences for better matches

### 8. Search and Filters
- Implement filter UI for location, salary, employment type
- Allow multiple tag selection
- Show active filters with clear option
- Persist filter state across navigation

---

## Rate Limiting & Performance

- No rate limiting currently implemented
- Gemini AI calls are cached for 24 hours
- Use pagination for list endpoints
- Consider implementing request debouncing on search

---

## Support & Questions

For API issues or questions:
1. Check error message in response
2. Verify authentication token
3. Ensure profile completion requirements are met
4. Check request body format matches documentation

---

**Last Updated**: November 18, 2025
**API Version**: 1.0.0
