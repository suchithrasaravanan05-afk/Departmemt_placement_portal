const express = require("express");
const router = express.Router();
const multer = require(require.resolve("multer", { paths: [process.cwd()] }));
const db = require("../db");
const { supabaseAdmin, supabase } = require("../supabase");
const { normalizeDepartment, getDepartmentById } = require("../utils/departmentNormalizer");
const feedbackCertificateStorage = require("../feedbackCertificateStorage");

// ==========================================
// Multer: memory storage (no disk writes)
// Files go directly to Supabase Storage
// ==========================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const fs = require("fs");
const path = require("path");

const BUCKET = "resume";
const uploadServePath = process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(__dirname, "../uploads");

// Helper: upload a file buffer to Supabase Storage or fallback to local disk
async function uploadToSupabase(fileBuffer, originalName, fieldName, userId) {
    const ext = originalName.split(".").pop();
    const fileName = `${fieldName}_${userId}_${Date.now()}.${ext}`;

    // Try Supabase Storage first if available
    if (supabaseAdmin && supabaseAdmin.storage) {
        try {
            const filePath = `uploads/${fileName}`;
            const { error } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(filePath, fileBuffer, {
                    contentType: "application/octet-stream",
                    upsert: true
                });

            if (!error) {
                const { data } = supabaseAdmin.storage
                    .from(BUCKET)
                    .getPublicUrl(filePath);
                if (data && data.publicUrl) return data.publicUrl;
            } else {
                console.warn("⚠️ Supabase Storage Upload Warning:", error.message);
            }
        } catch (supaErr) {
            console.warn("⚠️ Supabase Storage Exception:", supaErr.message);
        }
    }

    // Fallback: Save file buffer locally to uploadServePath
    try {
        if (!fs.existsSync(uploadServePath)) {
            fs.mkdirSync(uploadServePath, { recursive: true });
        }
        const localFilePath = path.join(uploadServePath, fileName);
        fs.writeFileSync(localFilePath, fileBuffer);
        console.log("✅ File saved to local storage:", localFilePath);
        return `/uploads/${fileName}`;
    } catch (diskErr) {
        console.error("❌ Disk storage fallback failed:", diskErr.message);
        throw new Error(`File storage failed: ${diskErr.message}`);
    }
}

// Middleware to parse JSON or form data
router.use(express.json());

// ==========================================
// GET STUDENT PROFILE
// ==========================================
router.get("/profile/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT u.id as user_id, u.full_name, u.register_number, u.email, u.year, u.department_id, u.phone,
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

        const rawProfile = results[0];
        const deptInfo = getDepartmentById(rawProfile.department_id || 1);
        const enriched = {
            ...rawProfile,
            department_id: deptInfo.id,
            department_code: deptInfo.department_code,
            department_name: deptInfo.department_name,
            department: deptInfo.department_name // backwards-compatibility
        };

        res.json({ success: true, profile: enriched });
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
            const ext = (file.originalname || '').split('.').pop().toLowerCase();
            if (ext !== 'pdf' && !file.mimetype.includes('pdf')) {
                return res.status(400).json({ success: false, message: 'Invalid resume format: Only PDF files (.pdf) are allowed.' });
            }
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

        // 3NF: Department validation & normalization
        let deptNorm = null;
        if (b.department !== undefined && b.department !== null && String(b.department).trim().length > 0) {
            deptNorm = normalizeDepartment(b.department);
            if (!deptNorm.success) {
                return res.status(400).json({ success: false, message: deptNorm.error });
            }
            // Update users table with department_id (store ONLY department_id in users)
            const client = supabaseAdmin || supabase;
            if (client) {
                const { error: uErr } = await client.from("users").update({ department_id: deptNorm.department_id }).eq("id", userId);
                if (uErr && (uErr.message || "").includes("department_id")) {
                    await client.from("users").update({ department: deptNorm.department_name }).eq("id", userId);
                }
            }
        }
        const officialDeptName = deptNorm ? deptNorm.department_name : "Computer Science and Business Systems";

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
                    b.degree || "B.Tech", officialDeptName,
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
                    res.json({
                        success: true,
                        message: "Profile updated successfully!",
                        cgpa: calculatedCgpa,
                        department_id: deptNorm ? deptNorm.department_id : 1,
                        department_code: deptNorm ? deptNorm.department_code : "CSBS",
                        department_name: officialDeptName,
                        department: officialDeptName
                    });
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
                    b.degree || "B.Tech", officialDeptName,
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
                    res.json({
                        success: true,
                        message: "Profile saved successfully!",
                        cgpa: calculatedCgpa,
                        department_id: deptNorm ? deptNorm.department_id : 1,
                        department_code: deptNorm ? deptNorm.department_code : "CSBS",
                        department_name: officialDeptName,
                        department: officialDeptName
                    });
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

    // Get active drives (excluding ones deleted/archived for students)
    const sql = `
        SELECT pd.*, app.status as app_status, app.applied_at
        FROM placement_drives pd
        LEFT JOIN applications app ON pd.id = app.drive_id AND app.user_id = ?
        WHERE (pd.is_deleted_for_students = 0 OR pd.is_deleted_for_students IS NULL)
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

// ==========================================
// UPDATE PLACEMENT WILLINGNESS / INTEREST
// ==========================================
router.post("/placement-interest", async (req, res) => {
    const { userId, interest } = req.body; // interest: 'Interested' | 'Not Interested'


    if (!userId || !interest) {
        return res.status(400).json({ success: false, message: "User ID and placement interest status are required" });
    }

    try {
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({ success: false, message: "Database client unavailable" });
        }

        // Check if student profile exists, update or create
        const { data: existing } = await client.from("student_profiles").select("id, placement_willingness").eq("user_id", userId);

        if (existing && existing.length > 0) {
            const { error: upErr } = await client
                .from("student_profiles")
                .update({ placement_willingness: interest })
                .eq("user_id", userId);

            if (upErr) {
                console.warn("⚠️ placement_willingness column warning:", upErr.message);
            }
        }

        res.json({
            success: true,
            message: `Placement interest saved as "${interest}"!`,
            interest
        });
    } catch (err) {
        console.error("Placement interest error:", err);
        res.status(500).json({ success: false, message: "Server error while saving placement interest" });
    }
});

// ==========================================
// EVENT FEEDBACK & CERTIFICATES (STUDENT)
// ==========================================

// GET STUDENT EVENT FEEDBACKS
router.get("/event-feedbacks/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const feedbacks = await feedbackCertificateStorage.getStudentEventFeedbacks(userId);
        res.json({ success: true, event_feedbacks: feedbacks });
    } catch (e) {
        console.error("Get student event feedbacks error:", e);
        res.status(500).json({ success: false, message: "Failed to fetch event feedbacks" });
    }
});

// SUBMIT EVENT FEEDBACK & GENERATE CERTIFICATE
router.post("/feedback/submit", async (req, res) => {
    try {
        const { feedback_id, user_id, rating, learnings, comments, quiz_answers, feedback_answers } = req.body;
        if (!feedback_id || !user_id) {
            return res.status(400).json({ success: false, message: "Feedback ID and User ID are required" });
        }

        // Fetch student user details for certificate
        const client = supabaseAdmin || supabase;
        let student_info = {
            full_name: "Student",
            register_number: "---",
            department: "Computer Science and Business Systems"
        };

        if (client) {
            try {
                const { data: uData } = await client.from("users").select("*").eq("id", user_id);
                if (uData && uData[0]) {
                    const u = uData[0];
                    const dept = getDepartmentById(u.department_id || 1);
                    student_info = {
                        full_name: u.full_name,
                        register_number: u.register_number,
                        department: dept.department_name
                    };
                }
            } catch (e) {}
        }

        const result = await feedbackCertificateStorage.submitFeedbackAndGenerateCertificate({
            feedback_id,
            user_id,
            rating,
            learnings,
            comments,
            quiz_answers: quiz_answers || {},
            feedback_answers: feedback_answers || {},
            student_info
        });

        res.json({
            success: true,
            message: result.alreadySubmitted ? "Feedback already submitted. Certificate ready!" : "Feedback submitted successfully! Certificate generated.",
            submission: result.submission,
            certificate: result.certificate
        });
    } catch (e) {
        console.error("Submit feedback error:", e);
        res.status(500).json({ success: false, message: e.message || "Failed to submit feedback" });
    }
});

// GET STUDENT CERTIFICATES
router.get("/certificates/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const certificates = await feedbackCertificateStorage.getStudentCertificates(userId);
        res.json({ success: true, certificates });
    } catch (e) {
        console.error("Get student certificates error:", e);
        res.status(500).json({ success: false, message: "Failed to fetch certificates" });
    }
});

module.exports = router;


