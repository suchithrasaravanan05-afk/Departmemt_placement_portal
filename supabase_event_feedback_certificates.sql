-- ==========================================================
-- Event Feedback & Certificates Schema for Supabase (PostgreSQL)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.event_feedbacks (
    id BIGINT PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    target_type TEXT DEFAULT 'all',
    student_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT,
    signatory_title TEXT DEFAULT 'Head of Department - CSBS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id BIGINT PRIMARY KEY,
    feedback_id BIGINT REFERENCES public.event_feedbacks(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    rating INT DEFAULT 5,
    learnings TEXT,
    comments TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    feedback_id BIGINT REFERENCES public.event_feedbacks(id) ON DELETE CASCADE,
    certificate_number TEXT UNIQUE NOT NULL,
    college_name TEXT DEFAULT 'RAMCO INSTITUTE OF TECHNOLOGY',
    department TEXT DEFAULT 'Computer Science and Business Systems',
    student_name TEXT NOT NULL,
    register_number TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    signatory_title TEXT DEFAULT 'Head of Department - CSBS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissive policies / disable RLS
ALTER TABLE public.event_feedbacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates DISABLE ROW LEVEL SECURITY;
