const express = require("express");
<<<<<<< HEAD
const multer = require("multer");
const path = require("path");
const router = express.Router();
const db = require("../db");

// =========================================================
// File storage - saved into backend/uploads/, filename
// prefixed with the user's id so files don't collide.
// =========================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "uploads"));
    },
    filename: (req, file, cb) => {
        const unique = `${req.body.user_id}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB, matches the frontend check
});

// =========================
// GET a student's own profile (used to show submitted details
// and to prefill the form for editing)
// =========================
router.get("/profile/:userId", (req, res) => {
    const { userId } = req.params;

    db.query(
        `SELECT u.full_name, u.register_number, u.year, u.email AS account_email,
                p.*
         FROM users u
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
// SAVE / UPDATE student profile
// =========================
router.post(
    "/profile",
    upload.fields([
        { name: "profile_photo", maxCount: 1 },
        { name: "resume_file", maxCount: 1 }
    ]),
    (req, res) => {

        const {
            user_id, dob, personal_email, college_email, domain_interested,
            tenth_percentage, twelfth_percentage, diploma_percentage, degree,
            sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
            sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa, cgpa,
            phone_number, whatsapp_number,
            history_of_arrears, history_arrears_count,
            standing_of_arrears, standing_arrears_count,
            linkedin_link, github_link
        } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "Missing user_id - please login again"
            });
        }

        const profilePhoto = req.files["profile_photo"] ? req.files["profile_photo"][0].filename : null;
        const resumeFile = req.files["resume_file"] ? req.files["resume_file"][0].filename : null;

        const sql = `
            INSERT INTO student_profiles (
                user_id, dob, personal_email, college_email, domain_interested,
                tenth_percentage, twelfth_percentage, diploma_percentage, degree,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa, cgpa,
                phone_number, whatsapp_number,
                history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count,
                linkedin_link, github_link, profile_photo, resume_file
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                phone_number = VALUES(phone_number),
                whatsapp_number = VALUES(whatsapp_number),
                history_of_arrears = VALUES(history_of_arrears),
                history_arrears_count = VALUES(history_arrears_count),
                standing_of_arrears = VALUES(standing_of_arrears),
                standing_arrears_count = VALUES(standing_arrears_count),
                linkedin_link = VALUES(linkedin_link),
                github_link = VALUES(github_link),
                profile_photo = COALESCE(VALUES(profile_photo), profile_photo),
                resume_file = COALESCE(VALUES(resume_file), resume_file)
        `;

        const values = [
            user_id, dob || null, personal_email || null, college_email || null, domain_interested || null,
            tenth_percentage || null, twelfth_percentage || null, diploma_percentage || null, degree || null,
            sem1_gpa || null, sem2_gpa || null, sem3_gpa || null, sem4_gpa || null,
            sem5_gpa || null, sem6_gpa || null, sem7_gpa || null, sem8_gpa || null, cgpa || null,
            phone_number || null, whatsapp_number || null,
            history_of_arrears || null, history_arrears_count || 0,
            standing_of_arrears || null, standing_arrears_count || 0,
            linkedin_link || null, github_link || null, profilePhoto, resumeFile
        ];

        db.query(sql, values, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "Could not save profile"
                });
            }

            res.status(200).json({
                success: true,
                message: "Profile saved successfully"
            });
        });
    }
);

module.exports = router;
=======
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { supabaseAdmin } = require("../supabase");

// ==========================================
// Multer: memory storage (no disk writes)
// Files go directly to Supabase Storage
// ==========================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const BUCKET = "resume"; // Your Supabase bucket name
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xdcctmnqmlvcibuhlcvx.supabase.co";

// Helper: upload a file buffer to Supabase Storage and return the public URL
async function uploadToSupabase(fileBuffer, originalName, fieldName, userId) {
    const ext = originalName.split(".").pop();
    const fileName = `${fieldName}_${userId}_${Date.now()}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, fileBuffer, {
            contentType: "application/octet-stream",
            upsert: true
        });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Return the public URL
    const { data } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

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
// Uploads files to Supabase Storage 'resume' bucket
// ==========================================
const cpUpload = upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "resume_file", maxCount: 1 }
]);

router.post("/profile/save", cpUpload, async (req, res) => {
    try {
        const b = req.body;
        const userId = b.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Start with existing URLs from form (preserved if no new file uploaded)
        let photoUrl = b.existing_profile_photo || null;
        let resumeUrl = b.existing_resume_file || null;

        // Upload profile photo to Supabase if provided
        if (req.files && req.files.profile_photo && req.files.profile_photo[0]) {
            const file = req.files.profile_photo[0];
            try {
                photoUrl = await uploadToSupabase(file.buffer, file.originalname, "photo", userId);
                console.log("✅ Photo uploaded to Supabase:", photoUrl);
            } catch (uploadErr) {
                console.error("❌ Photo upload failed:", uploadErr.message);
                return res.status(500).json({ success: false, message: "Photo upload to storage failed: " + uploadErr.message });
            }
        }

        // Upload resume to Supabase if provided
        if (req.files && req.files.resume_file && req.files.resume_file[0]) {
            const file = req.files.resume_file[0];
            try {
                resumeUrl = await uploadToSupabase(file.buffer, file.originalname, "resume", userId);
                console.log("✅ Resume uploaded to Supabase:", resumeUrl);
            } catch (uploadErr) {
                console.error("❌ Resume upload failed:", uploadErr.message);
                return res.status(500).json({ success: false, message: "Resume upload to storage failed: " + uploadErr.message });
            }
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

        // Check if profile row exists
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
                    photoUrl, resumeUrl, userId
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
                    b.linkedin_link || null, b.github_link || null, photoUrl, resumeUrl
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
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
