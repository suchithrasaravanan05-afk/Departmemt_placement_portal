const express = require("express");
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