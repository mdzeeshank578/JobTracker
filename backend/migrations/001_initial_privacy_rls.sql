-- Migration 001: Enforce Strict Data Privacy, User Isolation and Row Level Security (RLS)
-- Target Database: PostgreSQL / Supabase

BEGIN;

-- 1. Ensure users table exists
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    password_hash TEXT,
    salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Ensure profiles table exists with 1:1 user_id constraint & ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    professional_title VARCHAR(255),
    target_role_level VARCHAR(100),
    tagline TEXT,
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(100),
    location VARCHAR(255),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    portfolio VARCHAR(255),
    twitter VARCHAR(255),
    dev_blog VARCHAR(255),
    availability VARCHAR(100),
    work_status VARCHAR(100),
    career_objective TEXT,
    work_experience JSONB,
    projects JSONB,
    education_list JSONB,
    schooling_list JSONB,
    languages_list JSONB,
    achievements JSONB,
    certifications JSONB,
    publications JSONB,
    volunteering JSONB,
    hackathons JSONB,
    technical_skills TEXT,
    frameworks TEXT,
    databases TEXT,
    soft_skills TEXT,
    tools TEXT,
    languages TEXT,
    interests TEXT,
    ats_keywords TEXT,
    cv_customization JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- 3. Create job_applications table (1:Many relationship scoped to user_id)
CREATE TABLE IF NOT EXISTS public.job_applications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    date_applied DATE DEFAULT CURRENT_DATE,
    deadline DATE,
    notes TEXT,
    job_url TEXT,
    location VARCHAR(255),
    source VARCHAR(100) DEFAULT 'Manual',
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Migrate data from legacy applications table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_type = 'BASE TABLE') THEN
        INSERT INTO public.job_applications (id, user_id, company, role, status, date_applied, deadline, notes, job_url, location, source, snippet, created_at, updated_at)
        SELECT id, user_id, company, role, status, date_applied, deadline, notes, job_url, location, source, snippet, created_at, updated_at
        FROM public.applications
        ON CONFLICT (id) DO NOTHING;
        
        DROP TABLE public.applications CASCADE;
    END IF;
END $$;

-- Re-create applications view for backward compatibility
CREATE OR REPLACE VIEW public.applications AS SELECT * FROM public.job_applications;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_user ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON public.job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_company_role ON public.job_applications(user_id, company, role);

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Apply Row Level Security Policies (auth.uid() = user_id for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can read own user data" ON public.users;
DROP POLICY IF EXISTS "Users can update own user data" ON public.users;
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can access own job_applications" ON public.job_applications;

CREATE POLICY "Users can read own user data" ON public.users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own user data" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can access own profile" ON public.profiles
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can access own job_applications" ON public.job_applications
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

COMMIT;
