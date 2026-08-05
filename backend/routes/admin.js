const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

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