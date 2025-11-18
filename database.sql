-- LinkedOut Database Schema
-- PostgreSQL Database Creation Script

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE CREATION
-- ============================================

-- Users table (both seekers and recruiters)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('seeker', 'recruiter')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job seeker profiles
CREATE TABLE user_profiles_seeker (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    current_job VARCHAR(255),
    years_experience INTEGER,
    location VARCHAR(255),
    phone VARCHAR(50),
    profile_image_s3_url TEXT,
    resume_s3_url TEXT,
    profile_completion_step INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recruiter profiles
CREATE TABLE user_profiles_recruiter (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    company_size VARCHAR(50),
    company_website VARCHAR(500),
    phone VARCHAR(50),
    company_logo_s3_url TEXT,
    profile_completion_step INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job preferences for seekers
CREATE TABLE job_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_job_titles TEXT[],
    preferred_industries TEXT[],
    preferred_locations TEXT[],
    salary_expectation_min INTEGER,
    salary_expectation_max INTEGER,
    is_skipped BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (for job categorization)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    about TEXT,
    description TEXT NOT NULL,
    salary_min INTEGER,
    salary_max INTEGER,
    benefits TEXT,
    location VARCHAR(255),
    employment_type VARCHAR(50) CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job-Tags many-to-many relationship
CREATE TABLE job_tags (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, tag_id)
);

-- Job applications (for future use)
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    seeker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    cover_letter TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, seeker_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);

-- Profiles indexes
CREATE INDEX idx_user_profiles_seeker_user_id ON user_profiles_seeker(user_id);
CREATE INDEX idx_user_profiles_recruiter_user_id ON user_profiles_recruiter(user_id);

-- Jobs table indexes
CREATE INDEX idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Job tags indexes
CREATE INDEX idx_job_tags_job_id ON job_tags(job_id);
CREATE INDEX idx_job_tags_tag_id ON job_tags(tag_id);

-- Tags table indexes
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);

-- Job preferences indexes
CREATE INDEX idx_job_preferences_user_id ON job_preferences(user_id);

-- Job applications indexes
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_seeker_id ON job_applications(seeker_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

-- ============================================
-- SEED DATA - COMMON TAGS
-- ============================================

INSERT INTO tags (name, category) VALUES
    -- Programming Languages
    ('JavaScript', 'programming-language'),
    ('Python', 'programming-language'),
    ('Java', 'programming-language'),
    ('C++', 'programming-language'),
    ('C#', 'programming-language'),
    ('PHP', 'programming-language'),
    ('Ruby', 'programming-language'),
    ('Go', 'programming-language'),
    ('Swift', 'programming-language'),
    ('Kotlin', 'programming-language'),
    ('TypeScript', 'programming-language'),
    ('Rust', 'programming-language'),
    
    -- Web Technologies
    ('React', 'framework'),
    ('Angular', 'framework'),
    ('Vue.js', 'framework'),
    ('Node.js', 'framework'),
    ('Express.js', 'framework'),
    ('Django', 'framework'),
    ('Flask', 'framework'),
    ('Spring Boot', 'framework'),
    ('Laravel', 'framework'),
    ('Ruby on Rails', 'framework'),
    ('Next.js', 'framework'),
    ('Nuxt.js', 'framework'),
    
    -- Mobile Development
    ('iOS Development', 'skill'),
    ('Android Development', 'skill'),
    ('React Native', 'framework'),
    ('Flutter', 'framework'),
    ('Mobile Development', 'skill'),
    
    -- Databases
    ('PostgreSQL', 'database'),
    ('MySQL', 'database'),
    ('MongoDB', 'database'),
    ('Redis', 'database'),
    ('Oracle', 'database'),
    ('SQL Server', 'database'),
    ('SQLite', 'database'),
    ('Cassandra', 'database'),
    ('DynamoDB', 'database'),
    
    -- Cloud & DevOps
    ('AWS', 'cloud'),
    ('Azure', 'cloud'),
    ('Google Cloud', 'cloud'),
    ('Docker', 'devops'),
    ('Kubernetes', 'devops'),
    ('CI/CD', 'devops'),
    ('Jenkins', 'devops'),
    ('GitLab', 'devops'),
    ('Terraform', 'devops'),
    
    -- General Skills
    ('API Development', 'skill'),
    ('REST API', 'skill'),
    ('GraphQL', 'skill'),
    ('Microservices', 'skill'),
    ('Agile', 'methodology'),
    ('Scrum', 'methodology'),
    ('Git', 'tool'),
    ('Linux', 'skill'),
    ('Testing', 'skill'),
    ('Unit Testing', 'skill'),
    ('Integration Testing', 'skill'),
    
    -- Data & Analytics
    ('Data Science', 'field'),
    ('Machine Learning', 'field'),
    ('Deep Learning', 'field'),
    ('Artificial Intelligence', 'field'),
    ('Data Analysis', 'skill'),
    ('Big Data', 'field'),
    ('TensorFlow', 'framework'),
    ('PyTorch', 'framework'),
    ('Pandas', 'library'),
    ('NumPy', 'library'),
    
    -- Design
    ('UI/UX Design', 'skill'),
    ('Figma', 'tool'),
    ('Adobe XD', 'tool'),
    ('Sketch', 'tool'),
    ('Photoshop', 'tool'),
    ('Illustrator', 'tool'),
    
    -- Security
    ('Cybersecurity', 'field'),
    ('Network Security', 'skill'),
    ('Penetration Testing', 'skill'),
    ('Encryption', 'skill'),
    
    -- Business & Soft Skills
    ('Project Management', 'skill'),
    ('Leadership', 'soft-skill'),
    ('Communication', 'soft-skill'),
    ('Problem Solving', 'soft-skill'),
    ('Team Collaboration', 'soft-skill'),
    ('Critical Thinking', 'soft-skill'),
    
    -- Job Roles
    ('Full Stack Developer', 'role'),
    ('Frontend Developer', 'role'),
    ('Backend Developer', 'role'),
    ('DevOps Engineer', 'role'),
    ('Data Engineer', 'role'),
    ('Product Manager', 'role'),
    ('Business Analyst', 'role'),
    ('QA Engineer', 'role'),
    ('System Administrator', 'role'),
    ('Technical Writer', 'role')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables created: users, user_profiles_seeker, user_profiles_recruiter, job_preferences, tags, jobs, job_tags, job_applications';
    RAISE NOTICE 'Indexes created for optimal query performance';
    RAISE NOTICE 'Seeded % common tags', (SELECT COUNT(*) FROM tags);
END $$;
