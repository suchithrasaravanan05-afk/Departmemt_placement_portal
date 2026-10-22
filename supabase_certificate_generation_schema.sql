-- ==========================================================
-- Certificate Generation & Verification Schema for Supabase (PostgreSQL)
-- Department of Computer Science and Business Systems
-- RAMCO INSTITUTE OF TECHNOLOGY
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.certificate_batches (
    id TEXT PRIMARY KEY,
    batch_title TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date DATE,
    academic_year TEXT,
    total_records INT DEFAULT 0,
    generated_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    issued_by_id BIGINT,
    issued_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id BIGINT PRIMARY KEY,
    batch_id TEXT,
    user_id BIGINT,
    feedback_id BIGINT,
    certificate_number TEXT UNIQUE NOT NULL,
    college_name TEXT DEFAULT 'RAMCO INSTITUTE OF TECHNOLOGY',
    department TEXT DEFAULT 'Computer Science and Business Systems',
    student_name TEXT NOT NULL,
    register_number TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    certificate_title TEXT DEFAULT 'CERTIFICATE OF PARTICIPATION',
    certificate_type TEXT DEFAULT 'Participation',
    achievement TEXT DEFAULT 'Participation',
    academic_year TEXT DEFAULT '2026-27',
    coordinator TEXT,
    signatory_title TEXT DEFAULT 'Head of Department - CSBS',
    signatory_1_name TEXT DEFAULT 'Dr. D. Kesavaraja',
    signatory_1_title TEXT DEFAULT 'Head of Department (HOD)',
    signatory_2_name TEXT DEFAULT 'Dr. S. Rajakarunakarun',
    signatory_2_title TEXT DEFAULT 'Vice Principal / Patron',
    signatory_3_name TEXT DEFAULT 'Dr. L. Ganesan',
    signatory_3_title TEXT DEFAULT 'Principal / Chief Patron',
    status TEXT DEFAULT 'Digitally Verified',
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    issued_by_id BIGINT,
    issued_by_name TEXT,
    qr_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificate_audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    certificate_number TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id BIGINT,
    actor_name TEXT,
    actor_role TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_reg_number ON public.certificates(register_number);
CREATE INDEX IF NOT EXISTS idx_certificates_batch_id ON public.certificates(batch_id);

ALTER TABLE public.certificate_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_audit_logs DISABLE ROW LEVEL SECURITY;
