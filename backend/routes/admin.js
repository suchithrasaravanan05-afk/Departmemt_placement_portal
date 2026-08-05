const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

<<<<<<< HEAD
// =========================================================
// Simple in-memory admin session store.
// Not persisted across server restarts, but enough to stop
// random people from calling update/delete without logging
// in as admin first. Swap for JWT later if you want something
// stronger.
// =========================================================
const adminTokens = new Set();

function issueAdminToken() {
    const token = crypto.randomBytes(24).toString("hex");
    adminTokens.add(token);
    return token;
}

function requireAdmin(req, res, next) {
    const token = req.headers["x-admin-token"];

    if (!token || !adminTokens.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication required"
        });
    }

    next();
}

// =========================
// GET all departments (for populating dropdowns)
// =========================
router.get("/departments", requireAdmin, (req, res) => {
    db.query("SELECT dept_code, dept_name FROM departments ORDER BY dept_name", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "Database Error"
            });
        }

        res.status(200).json({
            success: true,
            departments: results
        });
    });
});

// =========================
// GET all registered students
// =========================
router.get("/students", requireAdmin, (req, res) => {
    db.query(
        `SELECT u.id, u.full_name, u.register_number, u.email, u.year, u.phone,
                u.department_code, d.dept_name AS department_name,
                p.dob, p.personal_email, p.college_email, p.domain_interested,
                p.degree, p.tenth_percentage, p.twelfth_percentage, p.diploma_percentage,
                p.sem1_gpa, p.sem2_gpa, p.sem3_gpa, p.sem4_gpa,
                p.sem5_gpa, p.sem6_gpa, p.sem7_gpa, p.sem8_gpa, p.cgpa,
                p.phone_number, p.whatsapp_number,
                p.history_of_arrears, p.history_arrears_count,
                p.standing_of_arrears, p.standing_arrears_count,
                p.linkedin_link, p.github_link, p.resume_file, p.profile_photo,
                CASE WHEN p.user_id IS NULL THEN 0 ELSE 1 END AS profile_submitted
         FROM users u
         LEFT JOIN departments d ON u.department_code = d.dept_code
         LEFT JOIN student_profiles p ON p.user_id = u.id
         ORDER BY u.year, u.register_number`,
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "Database Error"
                });
            }

            res.status(200).json({
                success: true,
                students: results
            });
        }
    );
});

// =========================
// GET one student's full profile (admin only)
// =========================
router.get("/profile/:userId", requireAdmin, (req, res) => {
    const { userId } = req.params;

    db.query(
        `SELECT u.full_name, u.register_number, u.email, u.year, u.phone,
                d.dept_name AS department_name, p.*
         FROM users u
         LEFT JOIN departments d ON u.department_code = d.dept_code
         LEFT JOIN student_profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [userId],
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "Database Error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Student Not Found"
                });
            }

            res.status(200).json({
                success: true,
                profile: results[0]
            });
        }
    );
});

// =========================
// UPDATE a student's account + profile details (admin only)
// =========================
router.put("/students/:id", requireAdmin, (req, res) => {
    const { id } = req.params;

    const {
        full_name, register_number, email, year, department_code, phone,
        dob, personal_email, college_email, domain_interested,
        tenth_percentage, twelfth_percentage, diploma_percentage, degree,
        sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
        sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa, cgpa,
        history_of_arrears, history_arrears_count,
        standing_of_arrears, standing_arrears_count,
        linkedin_link, github_link
    } = req.body;

    if (!full_name || !register_number || !email || !year || !department_code || !phone) {
        return res.status(400).json({
            success: false,
            message: "Account fields are required"
        });
    }

    const accountSql = `
        UPDATE users
        SET full_name = ?, register_number = ?, email = ?, year = ?, department_code = ?, phone = ?
        WHERE id = ?
    `;

    db.query(
        accountSql,
        [full_name, register_number, email, year, department_code, phone, id],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "Update Failed"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Student Not Found"
                });
            }

            // Upsert the profile details too - a student may not have
            // submitted a profile yet, so this creates one if missing.
            const profileSql = `
                INSERT INTO student_profiles (
                    user_id, dob, personal_email, college_email, domain_interested,
                    tenth_percentage, twelfth_percentage, diploma_percentage, degree,
                    sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                    sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa, cgpa,
                    history_of_arrears, history_arrears_count,
                    standing_of_arrears, standing_arrears_count,
                    linkedin_link, github_link
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    dob = VALUES(dob),
                    personal_email = VALUES(personal_email),
                    college_email = VALUES(college_email),
                    domain_interested = VALUES(domain_interested),
                    tenth_percentage = VALUES(tenth_percentage),
                    twelfth_percentage = VALUES(twelfth_percentage),
                    diploma_percentage = VALUES(diploma_percentage),
                    degree = VALUES(degree),
                    sem1_gpa = VALUES(sem1_gpa), sem2_gpa = VALUES(sem2_gpa),
                    sem3_gpa = VALUES(sem3_gpa), sem4_gpa = VALUES(sem4_gpa),
                    sem5_gpa = VALUES(sem5_gpa), sem6_gpa = VALUES(sem6_gpa),
                    sem7_gpa = VALUES(sem7_gpa), sem8_gpa = VALUES(sem8_gpa),
                    cgpa = VALUES(cgpa),
                    history_of_arrears = VALUES(history_of_arrears),
                    history_arrears_count = VALUES(history_arrears_count),
                    standing_of_arrears = VALUES(standing_of_arrears),
                    standing_arrears_count = VALUES(standing_arrears_count),
                    linkedin_link = VALUES(linkedin_link),
                    github_link = VALUES(github_link)
            `;

            const profileValues = [
                id, dob || null, personal_email || null, college_email || null, domain_interested || null,
                tenth_percentage || null, twelfth_percentage || null, diploma_percentage || null, degree || null,
                sem1_gpa || null, sem2_gpa || null, sem3_gpa || null, sem4_gpa || null,
                sem5_gpa || null, sem6_gpa || null, sem7_gpa || null, sem8_gpa || null, cgpa || null,
                history_of_arrears || null, history_arrears_count || 0,
                standing_of_arrears || null, standing_arrears_count || 0,
                linkedin_link || null, github_link || null
            ];

            db.query(profileSql, profileValues, (err2) => {
                if (err2) {
                    console.log(err2);
                    return res.status(500).json({
                        success: false,
                        message: "Account updated, but profile update failed"
                    });
                }

                res.status(200).json({
                    success: true,
                    message: "Student updated successfully"
                });
            });
        }
    );
});

// =========================
// DELETE a student (admin only)
// =========================
router.delete("/students/:id", requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "Delete Failed"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Student Not Found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Student deleted successfully"
=======
// ==========================================
// ADMIN DASHBOARD OVERVIEW METRICS
// ==========================================
router.get("/stats", (req, res) => {
    const stats = {
        totalStudents: 0,
        placedStudents: 0,
        activeDrives: 0,
        totalApplications: 0
    };

    db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'", (err, r1) => {
        stats.totalStudents = r1 && r1[0] ? (r1[0].count || r1[0]["COUNT(*)"]) : 0;

        db.query("SELECT COUNT(DISTINCT user_id) as count FROM applications WHERE status = 'Selected'", (err, r2) => {
            stats.placedStudents = r2 && r2[0] ? (r2[0].count || r2[0]["COUNT(DISTINCT user_id)"]) : 0;

            db.query("SELECT COUNT(*) as count FROM placement_drives", (err, r3) => {
                stats.activeDrives = r3 && r3[0] ? (r3[0].count || r3[0]["COUNT(*)"]) : 0;

                db.query("SELECT COUNT(*) as count FROM applications", (err, r4) => {
                    stats.totalApplications = r4 && r4[0] ? (r4[0].count || r4[0]["COUNT(*)"]) : 0;
                    res.json({ success: true, stats });
                });
            });
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
        });
    });
});

// ==========================================
// GET ALL STUDENTS WITH FILTERING
// ==========================================
router.get("/students", (req, res) => {
    const { year, search, minCgpa, maxArrears, minTenth, minTwelth } = req.query;

    let sql = `
        SELECT u.id as user_id, u.full_name, u.register_number, u.email, u.year, u.department, u.phone,
               sp.cgpa, sp.history_arrears_count, sp.standing_arrears_count, sp.domain_interest,
               sp.tenth_percentage, sp.twelth_percentage, sp.resume_file, sp.linkedin_link, sp.github_link
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.role = 'student'
    `;

    const params = [];

    if (year) {
        sql += " AND u.year = ?";
        params.push(year);
    }
    if (search) {
        sql += " AND (u.full_name LIKE ? OR u.register_number LIKE ? OR u.email LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (minCgpa) {
        sql += " AND sp.cgpa >= ?";
        params.push(parseFloat(minCgpa));
    }
    if (minTenth) {
        sql += " AND sp.tenth_percentage >= ?";
        params.push(parseFloat(minTenth));
    }
    if (minTwelth) {
        sql += " AND sp.twelth_percentage >= ?";
        params.push(parseFloat(minTwelth));
    }
    if (maxArrears !== undefined && maxArrears !== "") {
        sql += " AND sp.standing_arrears_count <= ?";
        params.push(parseInt(maxArrears));
    }

    sql += " ORDER BY u.year DESC, u.full_name ASC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching students:", err);
            return res.status(500).json({ success: false, message: "DB Error" });
        }
        res.json({ success: true, students: results });
    });
});

// ==========================================
// CREATE NEW PLACEMENT DRIVE
// ==========================================
router.post("/drives", (req, res) => {
    const {
        company_name,
        job_role,
        package_ctc,
        min_cgpa,
        max_standing_arrears,
        eligible_years,
        job_location,
        deadline,
        description
    } = req.body;

    if (!company_name || !job_role || !package_ctc) {
        return res.status(400).json({ success: false, message: "Company Name, Job Role, and Package CTC are required." });
    }

    const sql = `
        INSERT INTO placement_drives (
            company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
            eligible_years, job_location, deadline, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        company_name,
        job_role,
        package_ctc,
        min_cgpa || 0.00,
        max_standing_arrears || 0,
        eligible_years || "3,4",
        job_location || "Flexible",
        deadline || null,
        description || ""
    ], (err, result) => {
        if (err) {
            console.error("Error creating placement drive:", err);
            return res.status(500).json({ success: false, message: "Failed to create placement drive" });
        }
        res.status(201).json({ success: true, message: "Placement Drive posted successfully!" });
    });
});

// ==========================================
// DELETE PLACEMENT DRIVE
// ==========================================
router.delete("/drives/:id", (req, res) => {
    const driveId = req.params.id;

    db.query("DELETE FROM placement_drives WHERE id = ?", [driveId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to delete drive" });
        }
        res.json({ success: true, message: "Placement drive deleted successfully" });
    });
});

// ==========================================
// DELETE STUDENT (admin only)
// Removes: applications → student_profile → user
// ==========================================
router.delete("/students/:id", (req, res) => {
    const userId = req.params.id;

    // Step 1: Delete applications
    db.query("DELETE FROM applications WHERE user_id = ?", [userId], (err1) => {
        if (err1) {
            console.error("Error deleting student applications:", err1);
            return res.status(500).json({ success: false, message: "Failed to delete student applications" });
        }

        // Step 2: Delete student profile
        db.query("DELETE FROM student_profiles WHERE user_id = ?", [userId], (err2) => {
            if (err2) {
                console.error("Error deleting student profile:", err2);
                return res.status(500).json({ success: false, message: "Failed to delete student profile" });
            }

            // Step 3: Delete user account
            db.query("DELETE FROM users WHERE id = ? AND role = 'student'", [userId], (err3, result) => {
                if (err3) {
                    console.error("Error deleting student user:", err3);
                    return res.status(500).json({ success: false, message: "Failed to delete student" });
                }
                if (!result || result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: "Student not found or cannot be deleted" });
                }
                res.json({ success: true, message: "Student deleted successfully" });
            });
        });
    });
});

// ==========================================
// GET ALL APPLICATIONS
// ==========================================
router.get("/applications", (req, res) => {
    const sql = `
        SELECT app.id as app_id, app.status, app.applied_at,
               pd.company_name, pd.job_role, pd.package_ctc,
               u.full_name, u.register_number, u.email, u.year, u.phone,
               sp.cgpa, sp.standing_arrears_count, sp.resume_file
        FROM applications app
        JOIN placement_drives pd ON app.drive_id = pd.id
        JOIN users u ON app.user_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        ORDER BY app.applied_at DESC
    `;

    db.query(sql, [], (err, results) => {
        if (err) {
            console.error("Fetch applications error:", err);
            return res.status(500).json({ success: false, message: "DB Error" });
        }
        res.json({ success: true, applications: results });
    });
});

// ==========================================
// UPDATE APPLICATION STATUS (Shortlist, Select, Reject)
// ==========================================
router.post("/applications/status", (req, res) => {
    const { application_id, status } = req.body;

    if (!application_id || !status) {
        return res.status(400).json({ success: false, message: "Application ID and Status required" });
    }

    db.query("UPDATE applications SET status = ? WHERE id = ?", [status, application_id], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to update status" });
        }
        res.json({ success: true, message: `Application status updated to '${status}'` });
    });
});

module.exports = router;
module.exports.issueAdminToken = issueAdminToken;