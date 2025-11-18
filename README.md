# LinkedOut Backend - Job Recruitment API

A comprehensive Express.js backend API for a job recruitment mobile app with dual user types (recruiters and seekers), AI-powered job tagging using Google Gemini, AWS S3 file storage, and PostgreSQL database.

## Features

- **Multi-step User Registration**: Exciting step-by-step signup flow with progress tracking
- **Dual User Types**: Separate functionality for job seekers and recruiters
- **AI-Powered Job Tags**: Automatic tag generation using Google Gemini API
- **Smart Job Matching**: Tag-based recommendation algorithm for job seekers
- **File Uploads**: Resume and profile image storage on AWS S3
- **JWT Authentication**: Secure token-based authentication
- **Profile Completion Enforcement**: Required profile completion before accessing features
- **PostgreSQL Database**: Robust relational database with proper indexing

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (AWS RDS compatible)
- **AI**: Google Gemini API
- **Storage**: AWS S3
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Caching**: node-cache

## Project Structure

```
linkedout-backend/
├── src/
│   ├── config/           # Configuration files (database, AWS, Gemini)
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware (auth, upload, error handling)
│   ├── routes/           # API routes
│   ├── services/         # Business logic (S3, Gemini AI)
│   ├── utils/            # Utility functions
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── database.sql         # Complete database creation script
├── .env.example        # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd linkedout-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   - PostgreSQL database credentials (AWS RDS)
   - AWS S3 credentials and bucket name
   - Google Gemini API key
   - JWT secret key

4. **Set up the database**
   
   First, create your PostgreSQL database:
   ```bash
   psql -U postgres
   CREATE DATABASE linkedout;
   \q
   ```
   
   Then run the database creation script:
   ```bash
   psql -U your_username -d linkedout -f database.sql
   ```
   
   This will create all tables, indexes, and seed 100 common tags.

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /signup/step1` - Create account with basic info (email, password, user_type, full_name, birth_date)
- `POST /signup/step2` - Complete personal/company information (requires auth)
- `POST /signup/step3` - Add preferences or skip (optional for seekers, requires auth)
- `POST /login` - Login with email and password
- `GET /me` - Get current user profile (requires auth)

### Job Routes (`/api`)

**Recruiter Routes:**
- `POST /recruiter/jobs` - Create new job (auto-generates tags via AI)
- `GET /recruiter/jobs` - Get all jobs posted by recruiter
- `PUT /recruiter/jobs/:id` - Update job (regenerates tags if description changed)
- `DELETE /recruiter/jobs/:id` - Close job (soft delete)

**Seeker Routes:**
- `GET /jobs` - Browse all active jobs with filters (location, salary, employment_type, tags)
- `GET /jobs/:id` - Get detailed job information
- `GET /jobs/recommended` - Get personalized job recommendations based on preferences

### Upload Routes (`/api/upload`)

- `POST /resume` - Upload resume (seekers only, PDF/DOC/DOCX, max 5MB)
- `POST /profile-image` - Upload profile image or company logo (JPG/PNG, max 2MB)
- `GET /file-url` - Get signed URL for private file access

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Profile Completion

Users must complete at least Step 2 (personal information) to access job-related features:
- **Step 1**: Account creation (email, password, basic info)
- **Step 2**: Detailed personal/company info (required)
- **Step 3**: Preferences (optional for seekers)

## AI Tag Generation

When a recruiter posts a job:
1. Job description is sent to Google Gemini API
2. AI generates 3 relevant tags
3. Tags are matched against existing tags (case-insensitive)
4. New tags are created if they don't exist
5. Results are cached for 24 hours to reduce API costs

## Job Matching Algorithm

For seekers with preferences:
1. System compares job tags with user's preferred job titles and industries
2. Calculates match score (e.g., "3/3 matched tags")
3. Returns jobs ordered by match score, then by recency
4. Filters by salary range and location if specified

For seekers who skipped preferences:
- Returns recent jobs ordered by posting date

## Database Schema

**Main Tables:**
- `users` - User accounts (email, password, user_type)
- `user_profiles_seeker` - Seeker profile data
- `user_profiles_recruiter` - Recruiter profile data
- `job_preferences` - Seeker job preferences
- `tags` - Job tags (pre-seeded + AI-generated)
- `jobs` - Job postings
- `job_tags` - Many-to-many relationship between jobs and tags
- `job_applications` - Job application tracking

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Security Features

- Helmet.js for HTTP headers security
- CORS configuration
- JWT token expiration
- Password hashing with bcrypt
- SQL injection prevention (parameterized queries)
- File upload validation
- Private S3 file access via signed URLs

## Environment Variables

See `.env.example` for all required environment variables:
- Database configuration
- AWS credentials
- Gemini API key
- JWT secret
- Server port
- CORS origin

## Development

```bash
# Install nodemon for development (optional)
npm install -D nodemon

# Run in development mode
npm run dev
```

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Configure production database (AWS RDS)
3. Set up AWS S3 bucket with proper permissions
4. Configure CORS_ORIGIN to your frontend domain
5. Use a strong JWT_SECRET
6. Run database setup: `psql -U your_username -d linkedout -f database.sql`
7. Start server: `npm start`

## License

ISC

## Support

For issues and questions, please open an issue on the repository.
