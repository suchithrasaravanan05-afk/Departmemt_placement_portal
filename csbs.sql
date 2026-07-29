-- ============================================================
-- CSBS Placement Portal - Full Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS csbs;
USE csbs;

-- ============================================================
-- departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(10) UNIQUE NOT NULL,
    dept_name VARCHAR(100) NOT NULL
);

INSERT INTO departments (dept_code, dept_name)
VALUES ('CSBS', 'Computer Science and Business Systems')
ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name);

-- ============================================================
-- users  (students who register through Form.html)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    register_number VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    year TINYINT NOT NULL CHECK (year BETWEEN 1 AND 4),
    department_code VARCHAR(10) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_department
        FOREIGN KEY (department_code) REFERENCES departments(dept_code)
);

-- ============================================================
-- placement_notifications (used by sendNotification.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS placement_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Verify
-- ============================================================
SHOW TABLES;
DESC departments;
DESC users;
DESC placement_notifications;
SELECT * FROM departments;
SELECT * FROM users;