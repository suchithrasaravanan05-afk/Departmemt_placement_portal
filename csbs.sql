CREATE DATABASE csbs;

USE csbs;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    register_number VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    year TINYINT NOT NULL CHECK (year BETWEEN 1 AND 4),
    department VARCHAR(100) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(10) UNIQUE,
    dept_name VARCHAR(100) NOT NULL
);

INSERT INTO departments (dept_code, dept_name)
VALUES ('CSBS', 'Computer Science and Business Systems');

ALTER TABLE users
ADD department_code VARCHAR(10),
ADD CONSTRAINT fk_department
FOREIGN KEY (department_code) REFERENCES departments(dept_code);

select * from users;