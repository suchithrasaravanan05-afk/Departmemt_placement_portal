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
        if (process.env.VERCEL || !mysqlConn) {
            dbMode = "supabase";
        }
    } else {
        console.log("⚠️ Supabase Notice:", res.error || res.message);
    }
});

async function querySupabase(sql, params = [], callback) {
    const client = supabaseAdmin || supabase;
    if (!client) {
        if (callback) callback(new Error("Supabase client not initialized"), null);
        return;
    }

    try {
        const cleanSql = sql.trim().replace(/\s+/g, " ");

        // ----------------------------------------------------
        // 1. STATS / COUNTS
        // ----------------------------------------------------
        if (cleanSql.includes("COUNT(*) as count FROM users WHERE role = 'student'")) {
            const { count, error } = await client.from("users").select("id", { count: "exact", head: true }).eq("role", "student");
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        if (cleanSql.includes("COUNT(DISTINCT user_id) as count FROM applications WHERE status = 'Selected'")) {
            const { data, error } = await client.from("applications").select("user_id").eq("status", "Selected");
            if (error) return callback(error, null);
            const distinct = new Set((data || []).map(d => d.user_id)).size;
            return callback(null, [{ count: distinct }]);
        }

        if (cleanSql.includes("COUNT(*) as count FROM placement_drives")) {
            const { count, error } = await client.from("placement_drives").select("id", { count: "exact", head: true });
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        if (cleanSql.includes("COUNT(*) as count FROM applications")) {
            const { count, error } = await client.from("applications").select("id", { count: "exact", head: true });
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        // ----------------------------------------------------
        // 2. USERS TABLE QUERIES
        // ----------------------------------------------------
        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM users")) {
            if (cleanSql.includes("email = ? OR (register_number")) {
                const emailVal = params[0];
                const regVal = params[1];
                let query = client.from("users").select("*");
                if (regVal) {
                    query = query.or(`email.eq.${emailVal},register_number.eq.${regVal}`);
                } else {
                    query = query.eq("email", emailVal);
                }
                const { data, error } = await query;
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("email = ? OR register_number = ?")) {
                const searchVal = params[0];
                const { data, error } = await client.from("users").select("*").or(`email.eq.${searchVal},register_number.eq.${searchVal}`);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("WHERE email = ?")) {
                const { data, error } = await client.from("users").select("*").eq("email", params[0]);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("WHERE id = ?")) {
                const { data, error } = await client.from("users").select("*").eq("id", params[0]);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }
        }

        if (cleanSql.startsWith("INSERT INTO users")) {
            const [full_name, register_number, email, password, role, year, department, phone] = params;
            const { data, error } = await client.from("users").insert([{
                full_name, register_number, email, password, role, year, department, phone
            }]).select();
            if (error) return callback(error, null);
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        // ----------------------------------------------------
        // 3. STUDENT PROFILES QUERIES
        // ----------------------------------------------------
        if (cleanSql.includes("FROM users u") && cleanSql.includes("WHERE u.id = ?")) {
            const userId = params[0];
            const { data: uData, error: uErr } = await client.from("users").select("*").eq("id", userId);
            if (uErr) return callback(uErr, null);
            if (!uData || uData.length === 0) return callback(null, []);

            const user = uData[0];
            const { data: spData } = await client.from("student_profiles").select("*").eq("user_id", userId);
            const profile = spData && spData[0] ? spData[0] : {};

            const merged = {
                user_id: user.id,
                full_name: user.full_name,
                register_number: user.register_number,
                email: user.email,
                year: user.year,
                department: user.department,
                phone: user.phone,
                ...profile
            };
            return callback(null, [merged]);
        }

        if (cleanSql.includes("FROM users u") && cleanSql.includes("WHERE u.role = 'student'")) {
            const { data: users, error: uErr } = await client.from("users").select("*").eq("role", "student");
            if (uErr) return callback(uErr, null);

            const { data: profiles } = await client.from("student_profiles").select("*");
            const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

            let combined = (users || []).map(u => {
                const sp = profMap.get(u.id) || {};
                return {
                    user_id: u.id,
                    full_name: u.full_name,
                    register_number: u.register_number,
                    email: u.email,
                    year: u.year,
                    department: u.department,
                    phone: u.phone,
                    cgpa: sp.cgpa,
                    history_arrears_count: sp.history_arrears_count,
                    standing_arrears_count: sp.standing_arrears_count,
                    domain_interest: sp.domain_interest,
                    tenth_percentage: sp.tenth_percentage,
                    twelth_percentage: sp.twelth_percentage,
                    resume_file: sp.resume_file,
                    linkedin_link: sp.linkedin_link,
                    github_link: sp.github_link
                };
            });

            let pIdx = 0;
            if (cleanSql.includes("u.year = ?")) {
                const yearVal = parseInt(params[pIdx++]);
                combined = combined.filter(s => s.year === yearVal);
            }
            if (cleanSql.includes("LIKE ?")) {
                const searchVal = String(params[pIdx]).replace(/%/g, "").toLowerCase();
                pIdx += 3;
                combined = combined.filter(s =>
                    (s.full_name && s.full_name.toLowerCase().includes(searchVal)) ||
                    (s.register_number && s.register_number.toLowerCase().includes(searchVal)) ||
                    (s.email && s.email.toLowerCase().includes(searchVal))
                );
            }
            if (cleanSql.includes("sp.cgpa >= ?")) {
                const minCgpa = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.cgpa || 0) >= minCgpa);
            }
            if (cleanSql.includes("sp.tenth_percentage >= ?")) {
                const minTenth = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.tenth_percentage || 0) >= minTenth);
            }
            if (cleanSql.includes("sp.twelth_percentage >= ?")) {
                const minTwelth = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.twelth_percentage || 0) >= minTwelth);
            }
            if (cleanSql.includes("sp.standing_arrears_count <= ?")) {
                const maxArrears = parseInt(params[pIdx++]);
                combined = combined.filter(s => parseInt(s.standing_arrears_count || 0) <= maxArrears);
            }

            return callback(null, combined);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM student_profiles WHERE user_id = ?")) {
            const { data, error } = await client.from("student_profiles").select("*").eq("user_id", params[0]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO student_profiles (user_id, college_email, department, phone_number)")) {
            const [user_id, college_email, department, phone_number] = params;
            const { data, error } = await client.from("student_profiles").insert([{ user_id, college_email, department, phone_number }]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("INSERT INTO student_profiles ( user_id,")) {
            const [
                user_id, dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage, degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa, sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number, history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count, linkedin_link, github_link, profile_photo, resume_file
            ] = params;

            const { data, error } = await client.from("student_profiles").insert([{
                user_id, dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage, degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa, sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number, history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count, linkedin_link, github_link, profile_photo, resume_file
            }]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("UPDATE student_profiles SET")) {
            const [
                dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage,
                degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number,
                history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count,
                linkedin_link, github_link,
                profile_photo, resume_file, user_id
            ] = params;

            const upsertObj = {
                user_id,
                dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage,
                degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number,
                history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count,
                linkedin_link, github_link
            };

            // Only update file fields if new files were uploaded (COALESCE equivalent)
            if (profile_photo) upsertObj.profile_photo = profile_photo;
            if (resume_file) upsertObj.resume_file = resume_file;

            // Use upsert: if row exists update it, if not create it
            const { data, error } = await client
                .from("student_profiles")
                .upsert(upsertObj, { onConflict: "user_id" });
            if (error) {
                console.error("Supabase upsert student_profiles error:", error);
                return callback(error, null);
            }
            return callback(null, { affectedRows: 1 });
        }


        // ----------------------------------------------------
        // 4. PLACEMENT DRIVES QUERIES
        // ----------------------------------------------------
        if (cleanSql.includes("FROM placement_drives pd") && cleanSql.includes("app.user_id = ?")) {
            const userId = params[0];
            const { data: drives, error: dErr } = await client.from("placement_drives").select("*").order("created_at", { ascending: false });
            if (dErr) return callback(dErr, null);

            const { data: apps } = await client.from("applications").select("*").eq("user_id", userId);
            const appMap = new Map((apps || []).map(a => [a.drive_id, a]));

            const results = (drives || []).map(d => {
                const app = appMap.get(d.id);
                return {
                    ...d,
                    app_status: app ? app.status : null,
                    applied_at: app ? app.applied_at : null
                };
            });
            return callback(null, results);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM placement_drives WHERE id = ?")) {
            const { data, error } = await client.from("placement_drives").select("*").eq("id", params[0]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM placement_drives")) {
            const { data, error } = await client.from("placement_drives").select("*").order("created_at", { ascending: false });
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO placement_drives")) {
            const [
                company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
                eligible_years, job_location, deadline, description
            ] = params;

            const { data, error } = await client.from("placement_drives").insert([{
                company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
                eligible_years, job_location, deadline, description
            }]).select();
            if (error) return callback(error, null);
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        if (cleanSql.startsWith("DELETE FROM placement_drives WHERE id = ?")) {
            const { data, error } = await client.from("placement_drives").delete().eq("id", params[0]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM applications")) {
            let q = client.from("applications").delete();
            if (cleanSql.includes("user_id = ?")) {
                q = q.eq("user_id", params[0]);
            } else if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM student_profiles")) {
            let q = client.from("student_profiles").delete();
            if (cleanSql.includes("user_id = ?")) {
                q = q.eq("user_id", params[0]);
            } else if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM users")) {
            let q = client.from("users").delete();
            if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        // ----------------------------------------------------
        // 5. APPLICATIONS QUERIES
        // ----------------------------------------------------
        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM applications WHERE drive_id = ? AND user_id = ?")) {
            const { data, error } = await client.from("applications").select("*").eq("drive_id", params[0]).eq("user_id", params[1]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO applications")) {
            const [drive_id, user_id, status = "Applied"] = params;
            const { data, error } = await client.from("applications").insert([{ drive_id, user_id, status }]).select();
            if (error) {
                if (error.code === "23505" || error.message.includes("unique")) {
                    const err = new Error("UNIQUE constraint failed");
                    return callback(err, null);
                }
                return callback(error, null);
            }
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        if (cleanSql.includes("FROM applications app") || (cleanSql.includes("FROM applications") && cleanSql.includes("JOIN"))) {
            const { data: apps, error: aErr } = await client.from("applications").select("*").order("applied_at", { ascending: false });
            if (aErr) return callback(aErr, null);

            const { data: drives } = await client.from("placement_drives").select("*");
            const driveMap = new Map((drives || []).map(d => [d.id, d]));

            const { data: users } = await client.from("users").select("*");
            const userMap = new Map((users || []).map(u => [u.id, u]));

            const { data: profiles } = await client.from("student_profiles").select("*");
            const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

            const results = (apps || []).map(a => {
                const drive = driveMap.get(a.drive_id) || {};
                const user = userMap.get(a.user_id) || {};
                const sp = profMap.get(a.user_id) || {};

                return {
                    app_id: a.id,
                    status: a.status,
                    applied_at: a.applied_at,
                    company_name: drive.company_name,
                    job_role: drive.job_role,
                    package_ctc: drive.package_ctc,
                    full_name: user.full_name,
                    register_number: user.register_number,
                    email: user.email,
                    year: user.year,
                    phone: user.phone,
                    cgpa: sp.cgpa,
                    standing_arrears_count: sp.standing_arrears_count,
                    resume_file: sp.resume_file
                };
            });
            return callback(null, results);
        }

        if (cleanSql.startsWith("UPDATE applications SET status = ? WHERE id = ?")) {
            const [status, application_id] = params;
            const { data, error } = await client.from("applications").update({ status }).eq("id", application_id);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        console.warn("⚠️ Unhandled Supabase query:", cleanSql);
        return callback(null, []);
    } catch (err) {
        console.error("❌ Exception executing Supabase query:", err);
        return callback(err, null);
    }
}

const db = {
    mode: () => dbMode,
    supabase: supabaseAdmin || supabase,
    query: (sql, params, callback) => {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];

        if (dbMode === "supabase" || (process.env.VERCEL && (supabaseAdmin || supabase))) {
            return querySupabase(sql, params, callback);
        } else if (dbMode === "mysql" && mysqlConn) {
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
        } else if (supabaseAdmin || supabase) {
            return querySupabase(sql, params, callback);
        } else {
            console.log("⚠️ DB query fallback notice (No active DB pool):", sql.substring(0, 50));
            if (callback) callback(null, []);
        }
    }
};

const initMySQL = () => {
    if (process.env.VERCEL && (supabaseAdmin || supabase)) {
        console.log("⚡ Vercel Environment detected: Using Supabase Database");
        dbMode = "supabase";
        return;
    }

    try {
        const pool = mysql.createConnection(MYSQL_CONFIG);
        pool.connect((err) => {
            if (err) {
                if (supabaseAdmin || supabase) {
                    console.log("⚠️ MySQL connection unavailable. Switching to Supabase database...");
                    dbMode = "supabase";
                } else {
                    console.log("⚠️ MySQL connection unavailable. Switching to embedded SQLite database...");
                    initSQLite();
                }
            } else {
                console.log("✅ MySQL Connected successfully to database:", MYSQL_CONFIG.database);
                mysqlConn = pool;
                dbMode = "mysql";
                setupMySQLTables(pool);
            }
        });
    } catch (e) {
        if (supabaseAdmin || supabase) {
            console.log("⚠️ MySQL init error. Switching to Supabase database...");
            dbMode = "supabase";
        } else {
            console.log("⚠️ MySQL init error. Falling back to SQLite...");
            initSQLite();
        }
    }
};

const setupMySQLTables = (pool) => {
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
    const userColumns = [
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'student'",
        "ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'Computer Science and Business Systems'"
    ];
    userColumns.forEach(q => pool.query(q, () => {}));

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