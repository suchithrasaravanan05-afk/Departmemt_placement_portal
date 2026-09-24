const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { supabase, supabaseAdmin } = require("../supabase");
const permissionsStorage = require("../permissionsStorage");

// Local JSON persistence fallback file
const FACULTY_DATA_FILE = path.join(__dirname, "../faculty_registration.json");

// Helper: Read local faculty registrations
function readLocalFacultyRegistrations() {
    try {
        if (!fs.existsSync(FACULTY_DATA_FILE)) {
            const initial = { faculty_registrations: [] };
            fs.writeFileSync(FACULTY_DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
            return initial;
        }
        const content = fs.readFileSync(FACULTY_DATA_FILE, "utf8");
        return JSON.parse(content || '{"faculty_registrations":[]}');
    } catch (err) {
        console.error("Error reading local faculty registrations:", err);
        return { faculty_registrations: [] };
    }
}

// Helper: Save local faculty registrations
function saveLocalFacultyRegistrations(data) {
    try {
        fs.writeFileSync(FACULTY_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
        return true;
    } catch (err) {
        console.error("Error writing local faculty registrations:", err);
        return false;
    }
}

// ============================================================
// POST /api/faculty/register (Faculty Registration)
// ============================================================
router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            mobile,
            gender,
            department,
            designation,
            experience,
            qualification,
            specialization,
            password
        } = req.body;

        // 1. Mandatory field checks
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Please enter your full name." });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Please enter a valid email ID." });
        }
        if (!mobile || !mobile.trim()) {
            return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
        }
        if (!gender || !gender.trim() || gender === "Select Gender") {
            return res.status(400).json({ success: false, message: "Please select your gender." });
        }
        if (!department || !department.trim() || department === "Select Department") {
            return res.status(400).json({ success: false, message: "Please select your department." });
        }
        if (!designation || !designation.trim() || designation === "Select Designation") {
            return res.status(400).json({ success: false, message: "Please select your designation." });
        }
        if (experience === undefined || experience === null || experience === "" || isNaN(Number(experience))) {
            return res.status(400).json({ success: false, message: "Please enter your years of experience." });
        }
        const expNum = Number(experience);
        if (expNum < 0 || expNum > 50) {
            return res.status(400).json({ success: false, message: "Years of experience must be between 0 and 50." });
        }
        if (!qualification || !qualification.trim()) {
            return res.status(400).json({ success: false, message: "Please enter your qualification." });
        }
        if (!specialization || !specialization.trim()) {
            return res.status(400).json({ success: false, message: "Please enter your specialization." });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }

        // 2. Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: "Please enter a valid email ID format." });
        }

        // 3. 10-digit Indian Mobile number validation
        const cleanMobile = mobile.replace(/[^0-9]/g, "");
        if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
            return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
        }

        // 4. Password strength validation
        // Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 5. Check duplicate registration
        // A) Check local JSON storage
        const localData = readLocalFacultyRegistrations();
        const existingLocal = (localData.faculty_registrations || []).find(
            f => (f.email || "").toLowerCase() === normalizedEmail
        );
        if (existingLocal) {
            return res.status(400).json({
                success: false,
                message: "A faculty account with this Email ID is already registered."
            });
        }

        // B) Check Supabase users table or faculty_registration table if available
        const client = supabaseAdmin || supabase;
        if (client) {
            try {
                // Check users table
                const { data: userCheck } = await client
                    .from("users")
                    .select("id, email")
                    .eq("email", normalizedEmail);

                if (userCheck && userCheck.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "A user account with this Email ID is already registered."
                    });
                }

                // Check faculty_registration table
                const { data: facCheck } = await client
                    .from("faculty_registration")
                    .select("id, email")
                    .eq("email", normalizedEmail);

                if (facCheck && facCheck.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "A faculty account with this Email ID is already registered."
                    });
                }
            } catch (supaErr) {
                // Non-fatal if table doesn't exist yet
                console.warn("[Faculty Register] Supabase duplicate check notice:", supaErr.message);
            }
        }

        // 6. Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // 7. Prepare faculty record
        const nowIso = new Date().toISOString();
        const facultyId = Date.now();
        const isHod = (designation || "").toLowerCase().includes("head of department");
        const assignedRole = isHod ? "hod" : "faculty";

        const newRecord = {
            id: facultyId,
            name: name.trim(),
            email: normalizedEmail,
            mobile: cleanMobile,
            gender: gender.trim(),
            department: department.trim(),
            designation: designation.trim(),
            experience: expNum,
            qualification: qualification.trim(),
            specialization: specialization.trim(),
            password: hashedPassword,
            role: isHod ? "HOD" : "FACULTY",
            status: "Approved",
            created_at: nowIso
        };

        // 8. Persist to local storage
        localData.faculty_registrations.unshift(newRecord);
        saveLocalFacultyRegistrations(localData);

        // 9. Persist to Supabase users table & faculty_registration table
        if (client) {
            try {
                const staffRegNum = `FAC-${String(facultyId).slice(-4)}`;
                const userObj = {
                    full_name: name.trim(),
                    register_number: staffRegNum,
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: assignedRole,
                    department: department.trim(),
                    phone: cleanMobile,
                    created_at: nowIso
                };

                const { error: userInsertErr } = await client.from("users").insert([userObj]);
                if (userInsertErr) {
                    console.warn("[Faculty Register] Warning syncing to users table:", userInsertErr.message);
                } else {
                    console.log(`✅ Faculty synced directly into users table as: ${assignedRole}`);
                }
            } catch (uErr) {
                console.warn("[Faculty Register] Exception syncing to users table:", uErr.message);
            }

            try {
                await client.from("faculty_registration").insert([newRecord]);
                console.log("✅ Faculty record synced to Supabase faculty_registration table");
            } catch (e) {
                // Table might not exist in Supabase schema cache yet
            }
        }

        // 10. Assign default module permissions
        try {
            await permissionsStorage.setUserPermissions(normalizedEmail, {
                placement_access: true,
                social_media_access: true
            });
        } catch (pErr) {
            console.warn("[Faculty Register] Warning setting permissions:", pErr.message);
        }

        // 10. Return success response (without exposing hashed password)
        const safeData = {
            id: newRecord.id,
            name: newRecord.name,
            email: newRecord.email,
            mobile: newRecord.mobile,
            gender: newRecord.gender,
            department: newRecord.department,
            designation: newRecord.designation,
            experience: newRecord.experience,
            qualification: newRecord.qualification,
            specialization: newRecord.specialization,
            role: newRecord.role,
            status: newRecord.status,
            created_at: newRecord.created_at
        };

        return res.status(201).json({
            success: true,
            message: "Faculty registration successful! You can now login to the Faculty Portal.",
            data: safeData
        });

    } catch (err) {
        console.error("❌ Faculty Registration Error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred during faculty registration. Please try again."
        });
    }
});

// ============================================================
// GET /api/faculty/list (Admin helper / Verification endpoint)
// ============================================================
router.get("/list", (req, res) => {
    try {
        const localData = readLocalFacultyRegistrations();
        const safeList = (localData.faculty_registrations || []).map(f => {
            const { password, ...rest } = f;
            return rest;
        });
        res.json({ success: true, count: safeList.length, faculty_members: safeList });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch faculty registrations" });
    }
});

module.exports = router;
