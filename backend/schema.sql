-- Enterprise Multi-Tenant PostgreSQL DDL Schema for JobTracker
-- Enforces Strict Privacy, Data Isolation, Cascading Foreign Keys & Row-Level Security (RLS)

-- 1. Users Table (Core Auth & Account Identity)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    password_hash TEXT,
    salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Candidates Profile Table (Strict 1:1 Relationship via user_id PK+FK with ON DELETE CASCADE)
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

-- 3. Job Applications Table (1:Many Relationship Scoped to user_id)
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

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON public.job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_company_role ON public.job_applications(user_id, company, role);

-- Backward Compatibility View for legacy 'applications' queries
CREATE OR REPLACE VIEW public.applications AS SELECT * FROM public.job_applications;

-- 4. Sync Accounts Table (OAuth Gmail/Outlook Tokens per User)
CREATE TABLE IF NOT EXISTS public.sync_accounts (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook')),
    email VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (user_id, provider, email)
);

CREATE INDEX IF NOT EXISTS idx_sync_accounts_user ON public.sync_accounts(user_id);

-- 5. Sync Activity Logs Table (Isolated Per User)
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON public.sync_logs(user_id);

-- ============================================================================
-- Row Level Security (RLS) Enablement & Strict Data Isolation Policies
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can read own user data" ON public.users;
DROP POLICY IF EXISTS "Users can update own user data" ON public.users;
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can access own job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can access own sync_accounts" ON public.sync_accounts;
DROP POLICY IF EXISTS "Users can access own sync_logs" ON public.sync_logs;

-- Users Policy
CREATE POLICY "Users can read own user data" ON public.users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own user data" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

-- Profiles Policy (auth.uid() = user_id for SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can access own profile" ON public.profiles
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Job Applications Policy (auth.uid() = user_id for SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can access own job_applications" ON public.job_applications
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Sync Accounts Policy
CREATE POLICY "Users can access own sync_accounts" ON public.sync_accounts
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Sync Logs Policy
CREATE POLICY "Users can access own sync_logs" ON public.sync_logs
    FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
