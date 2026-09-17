-- =========================================================
-- OPTIONAL SUPABASE MIGRATION SCRIPT FOR ROLES & PERMISSIONS
-- Run this in Supabase SQL Editor if you wish to enforce columns in public.users
-- =========================================================

-- 1. Add placement_access and social_media_access columns to public.users if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'placement_access') THEN
        ALTER TABLE public.users ADD COLUMN placement_access BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'social_media_access') THEN
        ALTER TABLE public.users ADD COLUMN social_media_access BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update default staff permissions (Faculty, HOD, Admin have social_media_access = true)
UPDATE public.users 
SET social_media_access = TRUE 
WHERE role IN ('faculty', 'hod', 'admin');

UPDATE public.users 
SET placement_access = TRUE 
WHERE role IN ('student', 'faculty', 'hod', 'admin');

-- 3. Create or replace public.profiles view for unified profile retrieval
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    full_name AS name,
    email,
    role,
    department,
    placement_access,
    social_media_access,
    created_at
FROM public.users;
