++++++++++++++++++++++++++++++++-- ==========================================================
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
    programme_title TEXT DEFAULT 'Short-Term Training Programme (STTP)',
    programme_dates TEXT,
    certificate_wording TEXT,
    template_style TEXT DEFAULT 'rit_purple_gold',
    signatory_count INT DEFAULT 5,
    signatory_title TEXT DEFAULT 'Head of Department',
    signatory_1_name TEXT DEFAULT 'Dr. K. Arulraj',
    signatory_1_title TEXT DEFAULT 'Faculty Coordinator',
    signatory_1_org TEXT DEFAULT 'CSBS, RIT',
    signatory_2_name TEXT DEFAULT 'Dr. S. Rajakarunakaran',
    signatory_2_title TEXT DEFAULT 'STTP Coordinator',
    signatory_2_org TEXT DEFAULT 'CSBS, RIT',
    signatory_3_name TEXT DEFAULT 'Dr. S. Rajakarunakaran',
    signatory_3_title TEXT DEFAULT 'Head of Department',
    signatory_3_org TEXT DEFAULT 'CSBS, RIT',
    signatory_4_name TEXT DEFAULT 'Dr. L. Ganesan',
    signatory_4_title TEXT DEFAULT 'Principal',
    signatory_4_org TEXT DEFAULT 'RIT',
    signatory_5_name TEXT DEFAULT 'Dr. R. Ramesh',
    signatory_5_title TEXT DEFAULT 'Director',
    signatory_5_org TEXT DEFAULT 'RIT',
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

CREATE TABLE IF NOT EXISTS public.certificate_templates (
    id TEXT PRIMARY KEY,
    template_title TEXT NOT NULL,
    certificate_title TEXT NOT NULL,
    certificate_type TEXT,
    programme_title TEXT,
    event_name TEXT,
    department TEXT,
    college_name TEXT,
    programme_dates TEXT,
    issue_date TEXT,
    certificate_wording TEXT,
    signatory_count INT DEFAULT 5,
    signatory_1_name TEXT,
    signatory_1_title TEXT,
    signatory_1_org TEXT,
    signatory_2_name TEXT,
    signatory_2_title TEXT,
    signatory_2_org TEXT,
    signatory_3_name TEXT,
    signatory_3_title TEXT,
    signatory_3_org TEXT,
    signatory_4_name TEXT,
    signatory_4_title TEXT,
    signatory_4_org TEXT,
    signatory_5_name TEXT,
    signatory_5_title TEXT,
    signatory_5_org TEXT,
    template_style TEXT DEFAULT 'rit_purple_gold',
    id_prefix TEXT DEFAULT 'RIT-STTP-2026-',
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
