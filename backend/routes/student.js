const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

// Configure file upload storage
// On Vercel (Lambda), only /tmp is writable. Use /tmp/uploads there, local path elsewhere.
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel ? "/tmp/uploads" : path.join(__dirname, "../uploads");

try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    console.warn("⚠️ Could not create upload directory:", e.message);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure dir exists before writing
        try {
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        } catch (e) { /* ignore */ }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to parse JSON or form data
router.use(express.json());

// ==========================================
// GET STUDENT PROFILE
// ==========================================
router.get("/profile/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT u.id as user_id, u.full_name, u.register_number, u.email, u.year, u.department, u.phone,
               sp.*
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch profile error:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }

        if (!results || results.length === 0) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        res.json({ success: true, profile: results[0] });
    });
});

// ==========================================
// SAVE / UPDATE STUDENT PROFILE
// ==========================================
const cpUpload = upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "resume_file", maxCount: 1 }
]);

router.post("/profile/save", cpUpload, (req, res) => {
    try {
        const b = req.body;
        const userId = b.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        let photoPath = b.existing_profile_photo || null;
        let resumePath = b.existing_resume_file || null;

        if (req.files && req.files.profile_photo) {
            photoPath = "/uploads/" + req.files.profile_photo[0].filename;
        }
        if (req.files && req.files.resume_file) {
            resumePath = "/uploads/" + req.files.resume_file[0].filename;
        }

        // Calculate CGPA from provided sem GPAs
        let total = 0, count = 0;
        [b.sem1_gpa, b.sem2_gpa, b.sem3_gpa, b.sem4_gpa, b.sem5_gpa, b.sem6_gpa, b.sem7_gpa, b.sem8_gpa].forEach(val => {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                total += num;
                count++;
            }
        });
        const calculatedCgpa = count > 0 ? (total / count).toFixed(2) : (b.cgpa || 0);

        // First check if profile row exists
        db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId], (err, existing) => {
            if (err) {
                console.error("Profile query error:", err);
                return res.status(500).json({ success: false, message: "DB Error" });
            }

            if (existing && existing.length > 0) {
                // UPDATE
                const updateSql = `
                    UPDATE student_profiles SET
                        dob = ?, personal_email = ?, college_email = ?, domain_interest = ?,
                        tenth_percentage = ?, twelth_percentage = ?, diploma_percentage = ?,
                        degree = ?, department = ?,
                        sem1_gpa = ?, sem2_gpa = ?, sem3_gpa = ?, sem4_gpa = ?,
                        sem5_gpa = ?, sem6_gpa = ?, sem7_gpa = ?, sem8_gpa = ?,
                        cgpa = ?, phone_number = ?, whatsapp_number = ?,
                        history_of_arrears = ?, history_arrears_count = ?,
                        standing_of_arrears = ?, standing_arrears_count = ?,
                        linkedin_link = ?, github_link = ?,
                        profile_photo = COALESCE(?, profile_photo),
                        resume_file = COALESCE(?, resume_file)
                    WHERE user_id = ?
                `;

                db.query(updateSql, [
                    b.dob || null, b.personal_email || null, b.college_email || null, b.domain_interest || null,
                    b.tenth_percentage || null, b.twelth_percentage || null, b.diploma_percentage || null,
                    b.degree || "B.Tech", b.department || "CSBS",
                    b.sem1_gpa || null, b.sem2_gpa || null, b.sem3_gpa || null, b.sem4_gpa || null,
                    b.sem5_gpa || null, b.sem6_gpa || null, b.sem7_gpa || null, b.sem8_gpa || null,
                    calculatedCgpa, b.phone_number || null, b.whatsapp_number || null,
                    b.history_of_arrears || "no", b.history_arrears_count || 0,
                    b.standing_of_arrears || "no", b.standing_arrears_count || 0,
                    b.linkedin_link || null, b.github_link || null,
                    photoPath, resumePath, userId
                ], (err2) => {
                    if (err2) {
                        console.error("Error updating profile:", err2);
                        return res.status(500).json({ success: false, message: "Failed to update profile" });
                    }
                    res.json({ success: true, message: "Profile updated successfully!", cgpa: calculatedCgpa });
                });
            } else {
                // INSERT
                const insertSql = `
                    INSERT INTO student_profiles (
                        user_id, dob, personal_email, college_email, domain_interest,
                        tenth_percentage, twelth_percentage, diploma_percentage, degree, department,
                        sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa, sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                        cgpa, phone_number, whatsapp_number, history_of_arrears, history_arrears_count,
                        standing_of_arrears, standing_arrears_count, linkedin_link, github_link, profile_photo, resume_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(insertSql, [
                    userId, b.dob || null, b.personal_email || null, b.college_email || null, b.domain_interest || null,
                    b.tenth_percentage || null, b.twelth_percentage || null, b.diploma_percentage || null,
                    b.degree || "B.Tech", b.department || "CSBS",
                    b.sem1_gpa || null, b.sem2_gpa || null, b.sem3_gpa || null, b.sem4_gpa || null,
                    b.sem5_gpa || null, b.sem6_gpa || null, b.sem7_gpa || null, b.sem8_gpa || null,
                    calculatedCgpa, b.phone_number || null, b.whatsapp_number || null,
                    b.history_of_arrears || "no", b.history_arrears_count || 0,
                    b.standing_of_arrears || "no", b.standing_arrears_count || 0,
                    b.linkedin_link || null, b.github_link || null, photoPath, resumePath
                ], (err2) => {
                    if (err2) {
                        console.error("Error inserting profile:", err2);
                        return res.status(500).json({ success: false, message: "Failed to save profile" });
                    }
                    res.json({ success: true, message: "Profile saved successfully!", cgpa: calculatedCgpa });
                });
            }
        });
    } catch (e) {
        console.error("Save profile exception:", e);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ==========================================
// GET ACTIVE PLACEMENT DRIVES FOR STUDENT
// ==========================================
router.get("/drives/:userId", (req, res) => {
    const userId = req.params.userId;

    // Get drives along with application status for this student
    const sql = `
        SELECT pd.*, app.status as app_status, app.applied_at
        FROM placement_drives pd
        LEFT JOIN applications app ON pd.id = app.drive_id AND app.user_id = ?
        ORDER BY pd.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch drives error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch drives" });
        }
        res.json({ success: true, drives: results });
    });
});

// ==========================================
// APPLY FOR PLACEMENT DRIVE (WITH ELIGIBILITY CHECK)
// ==========================================
router.post("/drives/apply", (req, res) => {
    const { drive_id, user_id } = req.body;

    if (!drive_id || !user_id) {
        return res.status(400).json({ success: false, message: "Drive ID and User ID are required" });
    }

    // Fetch drive details & student profile to verify eligibility
    db.query("SELECT * FROM placement_drives WHERE id = ?", [drive_id], (err, driveRes) => {
        if (err || !driveRes || driveRes.length === 0) {
            return res.status(404).json({ success: false, message: "Placement Drive not found" });
        }
        const drive = driveRes[0];

        db.query("SELECT * FROM student_profiles WHERE user_id = ?", [user_id], (err2, profRes) => {
            if (err2 || !profRes || profRes.length === 0) {
                return res.status(400).json({ success: false, message: "Please complete your Student Profile before applying for drives." });
            }
            const profile = profRes[0];

            // Perform eligibility checks
            const studentCgpa = parseFloat(profile.cgpa || 0);
            const minCgpaRequired = parseFloat(drive.min_cgpa || 0);
            const standingArrears = parseInt(profile.standing_arrears_count || 0);
            const maxStandingAllowed = parseInt(drive.max_standing_arrears || 0);

            if (studentCgpa < minCgpaRequired) {
                return res.status(400).json({
                    success: false,
                    message: `Eligibility Criteria Not Met: Your CGPA (${studentCgpa.toFixed(2)}) is below company minimum (${minCgpaRequired.toFixed(2)}).`
                });
            }

            if (standingArrears > maxStandingAllowed) {
                return res.status(400).json({
                    success: false,
                    message: `Eligibility Criteria Not Met: You have ${standingArrears} standing arrears (Maximum allowed is ${maxStandingAllowed}).`
                });
            }

            // Insert Application
            const applySql = "INSERT INTO applications (drive_id, user_id, status) VALUES (?, ?, 'Applied')";
            db.query(applySql, [drive_id, user_id], (err3) => {
                if (err3) {
                    if (err3.message && err3.message.includes("UNIQUE")) {
                        return res.status(400).json({ success: false, message: "You have already applied for this placement drive." });
                    }
                    return res.status(500).json({ success: false, message: "Failed to submit application" });
                }

                res.json({ success: true, message: `Application submitted successfully for ${drive.company_name}!` });
            });
        });
    });
});

module.exports = router;
