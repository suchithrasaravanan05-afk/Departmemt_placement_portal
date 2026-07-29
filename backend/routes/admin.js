const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

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
        });
    });
});

module.exports = router;
module.exports.issueAdminToken = issueAdminToken;