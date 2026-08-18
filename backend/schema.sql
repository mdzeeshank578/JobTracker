-- Database DDL for JobTracker Supabase Integration
-- Execute these statements in the Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Applied', 'Interviewing', 'Assessment', 'Rejected', 'Offer', 'Accepted')),
    date_applied DATE DEFAULT CURRENT_DATE,
    deadline DATE,
    notes TEXT,
    job_url TEXT,
    location TEXT,
    source TEXT DEFAULT 'Manual',
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to CRUD only their own applications
CREATE POLICY "Allow individual user CRUD" ON public.applications
    FOR ALL USING (true) WITH CHECK (true); 

-- 2. Create Sync Accounts Table
CREATE TABLE IF NOT EXISTS public.sync_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (user_id, provider, email)
);

ALTER TABLE public.sync_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user sync account CRUD" ON public.sync_accounts
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Create Sync Logs Table
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- e.g., 'gmail_sync', 'outlook_sync', 'extension_sync'
    status TEXT NOT NULL, -- e.g., 'success', 'error', 'info'
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user sync logs read/write" ON public.sync_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Create trigger function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_accounts_updated_at
    BEFORE UPDATE ON public.sync_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
