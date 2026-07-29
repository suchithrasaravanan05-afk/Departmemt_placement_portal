const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const { supabase, supabaseAdmin, testSupabaseConnection } = require("./supabase");

const MYSQL_CONFIG = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Suji,19",
    database: process.env.DB_NAME || "csbs"
};

let dbMode = "mysql";
let mysqlConn = null;
let sqliteDb = null;

// Initialize Supabase check on startup
testSupabaseConnection().then(res => {
    if (res.success) {
        console.log("⚡ Supabase Cloud Connected successfully!");
    } else {
        console.log("⚠️ Supabase Notice:", res.error || res.message);
    }
});

const db = {
    mode: () => dbMode,
    supabase: supabaseAdmin || supabase,
    query: (sql, params, callback) => {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];

        if (dbMode === "mysql" && mysqlConn) {
            return mysqlConn.query(sql, params, callback);
        } else if (dbMode === "sqlite" && sqliteDb) {
            let normalizedSql = sql
                .replace(/ON DUPLICATE KEY UPDATE.*/gi, "")
                .replace(/AUTO_INCREMENT/gi, "AUTOINCREMENT")
                .replace(/ENUM\([^)]+\)/gi, "TEXT");

            const trimmed = normalizedSql.trim().toUpperCase();
            if (trimmed.startsWith("SELECT")) {
                sqliteDb.all(normalizedSql, params, (err, rows) => {
                    if (callback) callback(err, rows || []);
                });
            } else {
                sqliteDb.run(normalizedSql, params, function (err) {
                    if (callback) callback(err, { insertId: this ? this.lastID : null, affectedRows: this ? this.changes : 0 });
                });
            }
        } else {
            console.log("⚠️ DB query fallback notice (No active MySQL/SQLite pool):", sql.substring(0, 50));
            if (callback) callback(null, []);
        }
    }
};

const initMySQL = () => {
    try {
        const pool = mysql.createConnection(MYSQL_CONFIG);
        pool.connect((err) => {
            if (err) {
                console.log("⚠️ MySQL connection unavailable. Switching to embedded SQLite database...");
                initSQLite();
            } else {
                console.log("✅ MySQL Connected successfully to database:", MYSQL_CONFIG.database);
                mysqlConn = pool;
                dbMode = "mysql";
                setupMySQLTables(pool);
            }
        });
    } catch (e) {
        console.log("⚠️ MySQL init error. Falling back to SQLite...");
        initSQLite();
    }
};

const setupMySQLTables = (pool) => {
    // 1. Create tables if missing
    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            register_number VARCHAR(30) UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'student',
            year TINYINT,
            department VARCHAR(100) DEFAULT 'Computer Science and Business Systems',
            phone VARCHAR(15),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS student_profiles (
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
            sem1_gpa DECIMAL(4,2), sem2_gpa DECIMAL(4,2), sem3_gpa DECIMAL(4,2), sem4_gpa DECIMAL(4,2),
            sem5_gpa DECIMAL(4,2), sem6_gpa DECIMAL(4,2), sem7_gpa DECIMAL(4,2), sem8_gpa DECIMAL(4,2),
            cgpa DECIMAL(4,2),
            phone_number VARCHAR(15), whatsapp_number VARCHAR(15),
            history_of_arrears VARCHAR(10) DEFAULT 'no', history_arrears_count INT DEFAULT 0,
            standing_of_arrears VARCHAR(10) DEFAULT 'no', standing_arrears_count INT DEFAULT 0,
            linkedin_link VARCHAR(255), github_link VARCHAR(255),
            profile_photo VARCHAR(255), resume_file VARCHAR(255),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS placement_drives (
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
        )`,
        `CREATE TABLE IF NOT EXISTS applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            drive_id INT NOT NULL,
            user_id INT NOT NULL,
            status VARCHAR(30) DEFAULT 'Applied',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_app (drive_id, user_id)
        )`
    ];

    let completed = 0;
    tableQueries.forEach(q => {
        pool.query(q, (err) => {
            if (err) console.error("MySQL Table creation error:", err.message);
            completed++;
            if (completed === tableQueries.length) {
                ensureMySQLColumns(pool);
            }
        });
    });
};

const ensureMySQLColumns = (pool) => {
    // Add missing columns to users table
    const userColumns = [
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'student'",
        "ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'Computer Science and Business Systems'"
    ];
    userColumns.forEach(q => pool.query(q, () => {}));

    // Add missing columns to student_profiles table
    const profileColumns = [
        "ALTER TABLE student_profiles ADD COLUMN dob DATE",
        "ALTER TABLE student_profiles ADD COLUMN personal_email VARCHAR(100)",
        "ALTER TABLE student_profiles ADD COLUMN college_email VARCHAR(100)",
        "ALTER TABLE student_profiles ADD COLUMN domain_interest VARCHAR(100)",
        "ALTER TABLE student_profiles ADD COLUMN tenth_percentage DECIMAL(5,2)",
        "ALTER TABLE student_profiles ADD COLUMN twelth_percentage DECIMAL(5,2)",
        "ALTER TABLE student_profiles ADD COLUMN diploma_percentage DECIMAL(5,2)",
        "ALTER TABLE student_profiles ADD COLUMN degree VARCHAR(50) DEFAULT 'B.Tech'",
        "ALTER TABLE student_profiles ADD COLUMN department VARCHAR(100) DEFAULT 'CSBS'",
        "ALTER TABLE student_profiles ADD COLUMN sem1_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem2_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem3_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem4_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem5_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem6_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem7_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN sem8_gpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN cgpa DECIMAL(4,2)",
        "ALTER TABLE student_profiles ADD COLUMN phone_number VARCHAR(15)",
        "ALTER TABLE student_profiles ADD COLUMN whatsapp_number VARCHAR(15)",
        "ALTER TABLE student_profiles ADD COLUMN history_of_arrears VARCHAR(10) DEFAULT 'no'",
        "ALTER TABLE student_profiles ADD COLUMN history_arrears_count INT DEFAULT 0",
        "ALTER TABLE student_profiles ADD COLUMN standing_of_arrears VARCHAR(10) DEFAULT 'no'",
        "ALTER TABLE student_profiles ADD COLUMN standing_arrears_count INT DEFAULT 0",
        "ALTER TABLE student_profiles ADD COLUMN linkedin_link VARCHAR(255)",
        "ALTER TABLE student_profiles ADD COLUMN github_link VARCHAR(255)",
        "ALTER TABLE student_profiles ADD COLUMN profile_photo VARCHAR(255)",
        "ALTER TABLE student_profiles ADD COLUMN resume_file VARCHAR(255)"
    ];

    let done = 0;
    profileColumns.forEach(q => {
        pool.query(q, () => {
            done++;
            if (done === profileColumns.length) {
                seedMySQLData(pool);
            }
        });
    });
};

const seedMySQLData = async (pool) => {
    pool.query("SELECT * FROM users WHERE email = ?", ["admin@rit.ac.in"], async (err, results) => {
        if (!err && (!results || results.length === 0)) {
            const adminPass = await bcrypt.hash("admin123", 10);
            pool.query(
                `INSERT INTO users (full_name, register_number, email, password, role, year, department, phone)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                ["CSBS Placement Admin", "ADMIN001", "admin@rit.ac.in", adminPass, "admin", 4, "CSBS", "9876543210"]
            );
            console.log("👤 Default Admin account ready in MySQL: admin@rit.ac.in / admin123");
        }
    });

    pool.query("SELECT COUNT(*) as count FROM placement_drives", (err, results) => {
        if (!err && results && (results[0].count === 0 || results[0]["COUNT(*)"] === 0)) {
            const drives = [
                ["TCS Digital & Ninja", "Software Engineer", "7.0 - 3.36 LPA", 6.50, 0, "3,4", "Chennai / Bangalore", "2026-08-30", "Hiring for CSBS engineering graduates. TCS NQT test score required."],
                ["Zoho Corporation", "Software Development Engineer", "8.5 - 12.0 LPA", 7.00, 0, "3,4", "Tenkasi / Chennai", "2026-09-15", "Full-stack software developer role. Programming & Problem Solving test."],
                ["Cognizant (CTS)", "GenC Next & Elevate", "6.75 LPA", 6.00, 1, "4", "Coimbatore / Chennai", "2026-09-01", "Cloud, AI, and Full Stack development roles."]
            ];
            drives.forEach(d => {
                pool.query(
                    `INSERT INTO placement_drives (company_name, job_role, package_ctc, min_cgpa, max_standing_arrears, eligible_years, job_location, deadline, description)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    d
                );
            });
            console.log("🚀 Default Placement Drives seeded in MySQL.");
        }
    });
};

let sqlite3 = null;
try {
    sqlite3 = require("sqlite3").verbose();
} catch (e) {
    console.log("⚠️ SQLite3 module optional load notice:", e.message);
}

const initSQLite = () => {
    if (!sqlite3) {
        console.log("⚠️ SQLite3 native driver unavailable, skipping SQLite init.");
        return;
    }
    try {
        dbMode = "sqlite";
        const dbPath = process.env.VERCEL
            ? "/tmp/csbs_database.sqlite"
            : path.join(__dirname, "csbs_database.sqlite");

        sqliteDb = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("❌ Failed to initialize SQLite DB:", err.message);
                return;
            }
            console.log("✅ SQLite Database connected at:", dbPath);
            setupSQLiteTables();
        });
    } catch (e) {
        console.error("❌ SQLite init catch:", e.message);
    }
};

const setupSQLiteTables = () => {
    const initScript = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        register_number TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        year INTEGER,
        department TEXT DEFAULT 'Computer Science and Business Systems',
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        dob TEXT, personal_email TEXT, college_email TEXT, domain_interest TEXT,
        tenth_percentage REAL, twelth_percentage REAL, diploma_percentage REAL,
        degree TEXT DEFAULT 'B.Tech', department TEXT DEFAULT 'CSBS',
        sem1_gpa REAL, sem2_gpa REAL, sem3_gpa REAL, sem4_gpa REAL,
        sem5_gpa REAL, sem6_gpa REAL, sem7_gpa REAL, sem8_gpa REAL,
        cgpa REAL, phone_number TEXT, whatsapp_number TEXT,
        history_of_arrears TEXT DEFAULT 'no', history_arrears_count INTEGER DEFAULT 0,
        standing_of_arrears TEXT DEFAULT 'no', standing_arrears_count INTEGER DEFAULT 0,
        linkedin_link TEXT, github_link TEXT, profile_photo TEXT, resume_file TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS placement_drives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL, job_role TEXT NOT NULL, package_ctc TEXT NOT NULL,
        min_cgpa REAL DEFAULT 0.0, max_history_arrears INTEGER DEFAULT 99, max_standing_arrears INTEGER DEFAULT 0,
        eligible_years TEXT DEFAULT '3,4', job_location TEXT, deadline TEXT, description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drive_id INTEGER NOT NULL, user_id INTEGER NOT NULL, status TEXT DEFAULT 'Applied',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(drive_id, user_id)
    );
    `;

    sqliteDb.exec(initScript, async (err) => {
        if (err) {
            console.error("Error creating SQLite tables:", err);
            return;
        }
        console.log("✅ SQLite Tables verified and ready.");

        sqliteDb.get("SELECT * FROM users WHERE email = ?", ["admin@rit.ac.in"], async (err, row) => {
            if (!row) {
                const adminPass = await bcrypt.hash("admin123", 10);
                sqliteDb.run(
                    `INSERT INTO users (full_name, register_number, email, password, role, year, department, phone)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    ["CSBS Placement Admin", "ADMIN001", "admin@rit.ac.in", adminPass, "admin", 4, "CSBS", "9876543210"]
                );
                console.log("👤 Default Admin account created in SQLite: admin@rit.ac.in / admin123");
            }
        });

        sqliteDb.get("SELECT COUNT(*) as count FROM placement_drives", [], (err, row) => {
            if (row && row.count === 0) {
                const stmt = sqliteDb.prepare(`
                    INSERT INTO placement_drives (company_name, job_role, package_ctc, min_cgpa, max_standing_arrears, eligible_years, job_location, deadline, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run("TCS Digital & Ninja", "Software Engineer", "7.0 - 3.36 LPA", 6.50, 0, "3,4", "Chennai / Bangalore", "2026-08-30", "Hiring for CSBS engineering graduates. TCS NQT test score required.");
                stmt.run("Zoho Corporation", "Software Development Engineer", "8.5 - 12.0 LPA", 7.00, 0, "3,4", "Tenkasi / Chennai", "2026-09-15", "Full-stack software developer role. Programming & Problem Solving test.");
                stmt.run("Cognizant (CTS)", "GenC Next & Elevate", "6.75 LPA", 6.00, 1, "4", "Coimbatore / Chennai", "2026-09-01", "Cloud, AI, and Full Stack development roles.");
                stmt.finalize();
            }
        });
    });
};

initMySQL();

module.exports = db;