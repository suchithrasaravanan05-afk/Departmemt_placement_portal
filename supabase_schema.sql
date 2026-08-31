-- =========================================================
-- SUPABASE POSTGRESQL SCHEMA FOR RIT CSBS PLACEMENT PORTAL
-- Paste this script in Supabase SQL Editor & click RUN
-- =========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    register_number VARCHAR(30) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    year INT CHECK (year BETWEEN 1 AND 4),
    department VARCHAR(100) DEFAULT 'Computer Science and Business Systems',
    phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Profiles Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    dob DATE,
    personal_email VARCHAR(100),
    college_email VARCHAR(100),
    domain_interest VARCHAR(100),
    tenth_percentage DECIMAL(5,2),
    twelth_percentage DECIMAL(5,2),
    diploma_percentage DECIMAL(5,2),
    degree VARCHAR(50) DEFAULT 'B.Tech',
    department VARCHAR(100) DEFAULT 'CSBS',
    sem1_gpa DECIMAL(4,2),
    sem2_gpa DECIMAL(4,2),
    sem3_gpa DECIMAL(4,2),
    sem4_gpa DECIMAL(4,2),
    sem5_gpa DECIMAL(4,2),
    sem6_gpa DECIMAL(4,2),
    sem7_gpa DECIMAL(4,2),
    sem8_gpa DECIMAL(4,2),
    cgpa DECIMAL(4,2),
    phone_number VARCHAR(15),
    whatsapp_number VARCHAR(15),
    history_of_arrears VARCHAR(10) DEFAULT 'no',
    history_arrears_count INT DEFAULT 0,
    standing_of_arrears VARCHAR(10) DEFAULT 'no',
    standing_arrears_count INT DEFAULT 0,
    linkedin_link VARCHAR(255),
    github_link VARCHAR(255),
    profile_photo VARCHAR(255),
    resume_file VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Placement Drives Table
CREATE TABLE IF NOT EXISTS public.placement_drives (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    job_role VARCHAR(100) NOT NULL,
    package_ctc VARCHAR(50) NOT NULL,
    min_cgpa DECIMAL(4,2) DEFAULT 0.00,
    max_history_arrears INT DEFAULT 99,
    max_standing_arrears INT DEFAULT 0,
    eligible_years VARCHAR(50) DEFAULT '3,4',
    job_location VARCHAR(100),
    deadline DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id SERIAL PRIMARY KEY,
    drive_id INT NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_app UNIQUE (drive_id, user_id)
);

-- 5. Study Materials Table
CREATE TABLE IF NOT EXISTS public.study_materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security for public API access or enable default permissive policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials DISABLE ROW LEVEL SECURITY;

-- Seed Default Admin User (admin@rit.ac.in / admin123)
INSERT INTO public.users (full_name, register_number, email, password, role, year, department, phone)
VALUES ('CSBS Placement Admin', 'ADMIN001', 'admin@rit.ac.in', '$2a$10$7vN1E7eP.8uN0G1x1N3Wze2/84XwN0bJp.z9O0B1T8m1k9l0m1n2o', 'admin', 4, 'CSBS', '9876543210')
ON CONFLICT (email) DO NOTHING;

-- Seed Default Placement Drives
INSERT INTO public.placement_drives (company_name, job_role, package_ctc, min_cgpa, max_standing_arrears, eligible_years, job_location, deadline, description, target_batch)
VALUES 
('TCS Digital & Ninja', 'Software Engineer', '7.0 - 3.36 LPA', 6.50, 0, '3,4', 'Chennai / Bangalore', '2026-08-30', 'Hiring for CSBS engineering graduates. TCS National Qualifier Test (NQT) mandatory.', '2023-2027'),
('Zoho Corporation', 'Software Development Engineer', '8.5 - 12.0 LPA', 7.00, 0, '3,4', 'Tenkasi / Chennai', '2026-09-15', 'Full-stack software developer role. Programming test focusing on problem solving & DSA.', '2023-2027'),
('Cognizant (CTS)', 'GenC Next & Elevate', '6.75 LPA', 6.00, 1, '4', 'Coimbatore / Chennai', '2026-09-01', 'Role in Cloud, AI, and Full Stack development.', '2023-2027')
ON CONFLICT (company_name) DO NOTHING;