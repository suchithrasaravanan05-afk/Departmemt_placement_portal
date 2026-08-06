-- =========================================================
-- DEPARTMENT PLACEMENT PORTAL - RAMCO INSTITUTE OF TECHNOLOGY
-- Database Schema for MySQL
-- =========================================================

CREATE DATABASE IF NOT EXISTS csbs;
USE csbs;

-- 1. Users Table (Auth & Accounts)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    register_number VARCHAR(30) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    year TINYINT CHECK (year BETWEEN 1 AND 4),
    department VARCHAR(100) DEFAULT 'Computer Science and Business Systems',
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Profiles Table
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
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
    history_of_arrears ENUM('yes', 'no') DEFAULT 'no',
    history_arrears_count INT DEFAULT 0,
    standing_of_arrears ENUM('yes', 'no') DEFAULT 'no',
    standing_arrears_count INT DEFAULT 0,
    linkedin_link VARCHAR(255),
    github_link VARCHAR(255),
    profile_photo VARCHAR(255),
    resume_file VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Placement Drives Table
CREATE TABLE IF NOT EXISTS placement_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('Applied', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected') DEFAULT 'Applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_app (drive_id, user_id)
);

-- 5. Study Materials Table
CREATE TABLE IF NOT EXISTS study_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category ENUM('Aptitude', 'Java', 'Resume Format', 'Core Subjects') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin Account (Password: admin123)
INSERT INTO users (full_name, register_number, email, password, role, year, department, phone)
VALUES ('CSBS Placement Admin', 'ADMIN001', 'admin@rit.ac.in', '$2a$10$7vN1E7eP.8uN0G1x1N3Wze2/84XwN0bJp.z9O0B1T8m1k9l0m1n2o', 'admin', 4, 'CSBS', '9876543210')
ON DUPLICATE KEY UPDATE email=email;

-- Default Drives
INSERT INTO placement_drives (company_name, job_role, package_ctc, min_cgpa, max_standing_arrears, eligible_years, job_location, deadline, description)
VALUES 
('TCS Digital & Ninja', 'Software Engineer', '7.0 - 3.36 LPA', 6.50, 0, '3,4', 'Chennai / Bangalore', '2026-08-30', 'Hiring for CSBS engineering graduates. TCS National Qualifier Test (NQT) mandatory.'),
('Zoho Corporation', 'Software Development Engineer', '8.5 - 12.0 LPA', 7.00, 0, '3,4', 'Tenkasi / Chennai', '2026-09-15', 'Full-stack software developer role. Programming test focusing on problem solving & DSA.'),
('Cognizant (CTS)', 'GenC Next & Elevate', '6.75 LPA', 6.00, 1, '4', 'Coimbatore / Chennai', '2026-09-01', 'Role in Cloud, AI, and Full Stack development.')
ON DUPLICATE KEY UPDATE company_name=company_name;
