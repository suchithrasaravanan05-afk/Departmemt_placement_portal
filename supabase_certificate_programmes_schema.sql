-- ============================================================================
-- DEPARTMENT PLACEMENT PORTAL - RAMCO INSTITUTE OF TECHNOLOGY (CSBS)
-- CERTIFICATE PROGRAMMES & EVENT-WISE NUMBERING SCHEMA
-- ============================================================================

-- 1. CERTIFICATE PROGRAMMES TABLE
CREATE TABLE IF NOT EXISTS public.certificate_programmes (
    id VARCHAR(100) PRIMARY KEY,
    event_number VARCHAR(10) NOT NULL UNIQUE,     -- 2-digit format, e.g., '01', '02', '03'
    programme_title VARCHAR(255) NOT NULL,
    programme_topic TEXT NOT NULL,
    programme_type VARCHAR(100) NOT NULL DEFAULT 'STTP',
    organizing_department VARCHAR(255) NOT NULL DEFAULT 'Department of Computer Science and Business Systems (CSBS)',
    association VARCHAR(255) DEFAULT NULL,       -- e.g., 'ISTE Student Chapter'
    institution_name VARCHAR(255) NOT NULL DEFAULT 'Ramco Institute of Technology, Rajapalayam',
    start_date VARCHAR(50) NOT NULL,             -- e.g., '12 October 2026'
    end_date VARCHAR(50) NOT NULL,               -- e.g., '18 October 2026'
    certificate_content TEXT NOT NULL,           -- Wording template with [Participant Name]
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' or 'ARCHIVED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for rapid event lookup
CREATE INDEX IF NOT EXISTS idx_cert_prog_event_number ON public.certificate_programmes(event_number);
CREATE INDEX IF NOT EXISTS idx_cert_prog_status ON public.certificate_programmes(status);

-- 2. EVENT SEQUENCES TABLE (Concurrency-safe counter per event)
CREATE TABLE IF NOT EXISTS public.event_certificate_sequences (
    event_number VARCHAR(10) PRIMARY KEY REFERENCES public.certificate_programmes(event_number) ON DELETE CASCADE,
    last_sequence_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. FUNCTION TO ATOMICALLY ALLOCATE CERTIFICATE IDS (RITCB EE NNNN)
CREATE OR REPLACE FUNCTION allocate_event_certificate_ids(
    p_event_number VARCHAR(10),
    p_count INT
)
RETURNS TABLE (
    cert_id VARCHAR(50),
    seq_number INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_start_seq INT;
    v_i INT;
BEGIN
    -- Lock row for event or insert if not exists
    INSERT INTO public.event_certificate_sequences (event_number, last_sequence_number, updated_at)
    VALUES (p_event_number, 0, timezone('utc'::text, now()))
    ON CONFLICT (event_number) DO NOTHING;

    -- Fetch and update atomically
    UPDATE public.event_certificate_sequences
    SET last_sequence_number = last_sequence_number + p_count,
        updated_at = timezone('utc'::text, now())
    WHERE event_number = p_event_number
    RETURNING last_sequence_number - p_count INTO v_start_seq;

    -- Generate rows of sequential IDs
    FOR v_i IN 1..p_count LOOP
        seq_number := v_start_seq + v_i;
        cert_id := 'RITCB ' || LPAD(p_event_number, 2, '0') || ' ' || LPAD(seq_number::text, 4, '0');
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 4. SEED INITIAL PROGRAMMES (Programme 01 & Programme 02)
INSERT INTO public.certificate_programmes (
    id,
    event_number,
    programme_title,
    programme_topic,
    programme_type,
    organizing_department,
    association,
    institution_name,
    start_date,
    end_date,
    certificate_content,
    status
) VALUES 
(
    'prog_01_sttp_blockchain',
    '01',
    'One Week Online Short-Term Training Programme (STTP)',
    'Emerging Blockchain Technologies',
    'Short-Term Training Programme (STTP)',
    'Department of Computer Science and Business Systems (CSBS)',
    NULL,
    'Ramco Institute of Technology, Rajapalayam',
    '12 October 2026',
    '18 October 2026',
    'This is to certify that [Participant Name] has actively participated in the One-Week Online Short-Term Training Programme (STTP) on "Emerging Blockchain Technologies", organized by the Department of Computer Science and Business Systems (CSBS), Ramco Institute of Technology, Rajapalayam, from 12 October 2026 to 18 October 2026.',
    'ACTIVE'
),
(
    'prog_02_fdp_superintelligent',
    '02',
    'Two-Week International Industry-Oriented Faculty Development Programme',
    'Engineering Superintelligent Systems for Sustainable Digital Transformation',
    'Faculty Development Programme (FDP)',
    'Department of Computer Science and Business Systems (CSBS)',
    'ISTE Student Chapter',
    'Ramco Institute of Technology, Rajapalayam',
    '26 October 2026',
    '07 November 2026',
    'This is to certify that [Participant Name] has actively participated in the Two-Week International Industry-Oriented Faculty Development Programme on "Engineering Superintelligent Systems for Sustainable Digital Transformation", organized by the Department of Computer Science and Business Systems (CSBS), in association with the ISTE Student Chapter, Ramco Institute of Technology, Rajapalayam, from 26 October 2026 to 07 November 2026.',
    'ACTIVE'
)
ON CONFLICT (event_number) DO UPDATE SET
    programme_title = EXCLUDED.programme_title,
    programme_topic = EXCLUDED.programme_topic,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    certificate_content = EXCLUDED.certificate_content;

-- Initialize event sequence counters to 0
INSERT INTO public.event_certificate_sequences (event_number, last_sequence_number)
VALUES ('01', 0), ('02', 0)
ON CONFLICT (event_number) DO NOTHING;
