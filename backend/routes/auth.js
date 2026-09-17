const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
const { normalizeDepartment, getDepartmentById } = require("../utils/departmentNormalizer");

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

const permissionsStorage = require("../permissionsStorage");

// =========================
// REGISTER USER (Student or Admin)
// =========================
router.post("/register", async (req, res) => {
    try {
        const {
            full_name,
            register_number,
            email,
            password,
            role = "student",
            year,
            department,
            phone
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required." });
        }

        // 3NF Department Validation & Normalization
        const deptNorm = normalizeDepartment(department || req.body.department_id || "CSBS");
        if (!deptNorm.success) {
            return res.status(400).json({
                success: false,
                message: deptNorm.error
            });
        }

        // Check if email or register number already exists
        const checkSql = "SELECT * FROM users WHERE email = ? OR (register_number = ? AND register_number IS NOT NULL AND register_number != '')";
        
        db.query(checkSql, [email, register_number || null], async (err, results) => {
            if (err) {
                console.error("DB Error on Register Check:", err);
                return res.status(500).json({ success: false, message: "Database Error" });
            }

            if (results && results.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "User with this Email or Register Number already exists."
                });
            }

            // Encrypt Password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3NF: Store ONLY department_id in users (NO redundant department name or code)
            const sql = `
                INSERT INTO users (full_name, register_number, email, password, role, year, department_id, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [
                    full_name,
                    register_number || null,
                    email,
                    hashedPassword,
                    role,
                    year ? parseInt(year) : null,
                    deptNorm.department_id,
                    phone || null
                ],
                async (err, result) => {
                    if (err) {
                        console.error("Registration Failed:", err);
                        return res.status(500).json({ success: false, message: "Registration Failed: " + (err.message || err) });
                    }

                    const userId = result.insertId;

                    // Automatically create an empty student profile entry if user is a student
                    if (role === "student" && userId) {
                        db.query(
                            "INSERT INTO student_profiles (user_id, college_email, department, phone_number) VALUES (?, ?, ?, ?)",
                            [userId, email, deptNorm.department_name, phone || null],
                            () => {}
                        );
                    }

                    const userPerms = await permissionsStorage.getUserPermissions({ id: userId, email, role, register_number });

                    // Generate Token with permissions
                    const token = jwt.sign(
                        { 
                            id: userId, 
                            email, 
                            role, 
                            full_name,
                            placement_access: userPerms.placement_access,
                            social_media_access: userPerms.social_media_access
                        },
                        JWT_SECRET,
                        { expiresIn: "7d" }
                    );

                    res.status(201).json({
                        success: true,
                        message: "Registration successful!",
                        token,
                        adminToken: (role === "admin" || role === "faculty" || role === "hod") ? token : undefined,
                        user: {
                            id: userId,
                            full_name,
                            register_number,
                            email,
                            role,
                            designation: req.body.designation || (role === "faculty" ? "Assistant Professor — CSBS" : undefined),
                            year,
                            department_id: deptNorm.department_id,
                            department_code: deptNorm.department_code,
                            department_name: deptNorm.department_name,
                            department: deptNorm.department_name, // backwards-compatibility
                            phone,
                            placement_access: userPerms.placement_access,
                            social_media_access: userPerms.social_media_access
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error("Server Error on Register:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Helper for strict role validation
function validateRoleMatch(actualRole, requestedRole) {
    if (!requestedRole) return { match: true };
    const actual = (actualRole || "").toLowerCase();
    const reqRole = (requestedRole || "").toLowerCase();

    if (reqRole === "admin" && actual !== "admin") {
        return {
            match: false,
            message: "Access Denied: Your account does not have Administrator privileges."
        };
    }
    if (reqRole === "hod" && actual !== "hod" && actual !== "admin") {
        return {
            match: false,
            message: "Access Denied: Your account does not have Head of Department (HOD) privileges."
        };
    }
    if (reqRole === "faculty" && actual === "student") {
        return {
            match: false,
            message: "Access Denied: This account is registered as a Student. Please use the Student Login."
        };
    }
    if (reqRole === "student" && (actual === "faculty" || actual === "hod" || actual === "admin")) {
        return {
            match: false,
            message: "Access Denied: Staff accounts must use the Faculty Login portal."
        };
    }
    return { match: true };
}

// =========================
// LOGIN USER
// =========================
router.post("/login", async (req, res) => {
    const { email, identifier: customId, password, role: requestedRole } = req.body;
    const identifier = (customId || email || "").trim();

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: "Register Number / ID / Email and password are required." });
    }

    const idLower = identifier.toLowerCase();
    const idUpper = identifier.toUpperCase();

    // 1. Specific Test Preset: Faculty with ONLY Placement Access
    if ((idLower === "faculty_placement_only@rit.ac.in" || idUpper === "FAC-PLACEMENT-ONLY") && (password === "faculty123" || password === "password123")) {
        const roleCheck = validateRoleMatch("faculty", requestedRole);
        if (!roleCheck.match) {
            return res.status(403).json({ success: false, message: roleCheck.message });
        }
        const userObj = {
            id: 903,
            full_name: "Prof. R. Placement Coordinator",
            designation: "Assistant Professor & Placement Coordinator",
            register_number: "FAC-PLACEMENT-ONLY",
            email: "faculty_placement_only@rit.ac.in",
            role: "faculty",
            department: "Computer Science and Business Systems",
            placement_access: true,
            social_media_access: false
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "Faculty Login Successful (Placement Portal Access)!",
            token,
            adminToken: token,
            user: userObj
        });
    }

    // 2. Specific Test Preset: Faculty with ONLY Social Media Access
    if ((idLower === "faculty_social_only@rit.ac.in" || idUpper === "FAC-SOCIAL-ONLY") && (password === "faculty123" || password === "password123")) {
        const roleCheck = validateRoleMatch("faculty", requestedRole);
        if (!roleCheck.match) {
            return res.status(403).json({ success: false, message: roleCheck.message });
        }
        const userObj = {
            id: 904,
            full_name: "Prof. M. Social Media Coordinator",
            designation: "Assistant Professor & Social Media Lead",
            register_number: "FAC-SOCIAL-ONLY",
            email: "faculty_social_only@rit.ac.in",
            role: "faculty",
            department: "Computer Science and Business Systems",
            placement_access: false,
            social_media_access: true
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "Faculty Login Successful (Social Media Hub Access)!",
            token,
            adminToken: token,
            user: userObj
        });
    }

    // 3. Default Admin Login shortcut (both permissions)
    if ((idLower === "admin" || idUpper === "ADMIN001" || idLower === "admin@rit.ac.in") && password === "admin123") {
        const roleCheck = validateRoleMatch("admin", requestedRole);
        if (!roleCheck.match) {
            return res.status(403).json({ success: false, message: roleCheck.message });
        }
        const userObj = {
            id: 1,
            full_name: "Placement Admin",
            register_number: "ADMIN001",
            email: "admin@rit.ac.in",
            role: "admin",
            department: "Computer Science and Business Systems",
            placement_access: true,
            social_media_access: true
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "Admin Login Successful!",
            token,
            adminToken: token,
            user: userObj
        });
    }

    // 4. Default HOD Login shortcut (both permissions)
    if ((idLower === "hod" || idUpper === "HOD001" || idLower === "hod@rit.ac.in") && password === "hod123") {
        const roleCheck = validateRoleMatch("hod", requestedRole);
        if (!roleCheck.match) {
            return res.status(403).json({ success: false, message: roleCheck.message });
        }
        const userObj = {
            id: 901,
            full_name: "Dr. K. Vijayalakshmi",
            designation: "Head of Department - CSBS",
            register_number: "HOD-CSBS-01",
            email: "hod@rit.ac.in",
            role: "hod",
            department: "Computer Science and Business Systems",
            placement_access: true,
            social_media_access: true
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "HOD Login Successful!",
            token,
            adminToken: token,
            user: userObj
        });
    }

    // 5. Default Faculty Login shortcut (both permissions)
    if ((idLower === "faculty" || idUpper === "FACULTY001" || idLower === "faculty@rit.ac.in") && password === "faculty123") {
        const roleCheck = validateRoleMatch("faculty", requestedRole);
        if (!roleCheck.match) {
            return res.status(403).json({ success: false, message: roleCheck.message });
        }
        const userObj = {
            id: 902,
            full_name: "Prof. S. Anand",
            designation: "Assistant Professor - CSBS",
            register_number: "FAC-CSBS-02",
            email: "faculty@rit.ac.in",
            role: "faculty",
            department: "Computer Science and Business Systems",
            placement_access: true,
            social_media_access: true
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            success: true,
            message: "Faculty Login Successful!",
            token,
            adminToken: token,
            user: userObj
        });
    }

    // Database lookup for Student, Faculty, HOD or registered Admin
    db.query(
        "SELECT * FROM users WHERE register_number = ? OR email = ? OR (role = 'admin' AND (register_number = ? OR email = ?))",
        [identifier, identifier, identifier, identifier],
        async (err, results) => {
            try {
                if (err) {
                    console.error("Login DB Error:", err.message || err);
                    return res.status(500).json({ success: false, message: "Database Error: " + (err.message || "Query failed") });
                }

                if (!results || results.length === 0) {
                    return res.status(404).json({ success: false, message: "Invalid email or password." });
                }

                const user = results[0];

                if (!user || !user.password) {
                    return res.status(401).json({ success: false, message: "Account has no password set. Please reset your password." });
                }

                // Verify Password using bcrypt
                const match = await bcrypt.compare(password, user.password);

                if (!match) {
                    return res.status(401).json({ success: false, message: "Invalid email or password." });
                }

                // Strict Role Validation against authenticated user's actual database role
                const roleCheck = validateRoleMatch(user.role, requestedRole);
                if (!roleCheck.match) {
                    return res.status(403).json({ success: false, message: roleCheck.message });
                }

                // Retrieve fine-grained permissions from storage / database
                const perms = await permissionsStorage.getUserPermissions(user);

                // Generate JWT token including permissions
                const token = jwt.sign(
                    { 
                        id: user.id, 
                        email: user.email, 
                        role: user.role, 
                        full_name: user.full_name,
                        placement_access: perms.placement_access,
                        social_media_access: perms.social_media_access
                    },
                    JWT_SECRET,
                    { expiresIn: "7d" }
                );

                const deptInfo = getDepartmentById(user.department_id || 1);

                res.status(200).json({
                    success: true,
                    message: "Login successful!",
                    token,
                    adminToken: (user.role === "admin" || user.role === "faculty" || user.role === "hod") ? token : undefined,
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        register_number: user.register_number,
                        email: user.email,
                        role: user.role || "student",
                        year: user.year,
                        department_id: deptInfo.id,
                        department_code: deptInfo.department_code,
                        department_name: deptInfo.department_name,
                        department: deptInfo.department_name,
                        phone: user.phone,
                        placement_access: perms.placement_access,
                        social_media_access: perms.social_media_access
                    }
                });
            } catch (loginError) {
                console.error("Login Processing Error:", loginError);
                return res.status(500).json({ success: false, message: "Login processing error: " + (loginError.message || "Internal Error") });
            }
        }
    );
});

// =========================
// GET CURRENT LOGGED IN USER (VERIFY TOKEN & PERMISSIONS)
// =========================
router.get(["/me", "/profile"], (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Handle preset mock IDs smoothly
        if (decoded.id === 0 || decoded.id === 1 || decoded.id >= 900) {
            return res.json({
                success: true,
                user: {
                    id: decoded.id,
                    full_name: decoded.full_name,
                    email: decoded.email,
                    role: decoded.role,
                    register_number: decoded.register_number || decoded.email,
                    department: "Computer Science and Business Systems",
                    department_name: "Computer Science and Business Systems",
                    department_code: "CSBS",
                    placement_access: decoded.placement_access !== undefined ? decoded.placement_access : true,
                    social_media_access: decoded.social_media_access !== undefined ? decoded.social_media_access : (decoded.role !== "student")
                }
            });
        }

        db.query("SELECT id, full_name, register_number, email, role, year, department_id, department, phone FROM users WHERE id = ?", [decoded.id], async (err, results) => {
            if (err || !results || results.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            const rawUser = results[0];
            const deptInfo = getDepartmentById(rawUser.department_id || 1);
            const perms = await permissionsStorage.getUserPermissions(rawUser);

            res.json({
                success: true,
                user: {
                    ...rawUser,
                    department_id: deptInfo.id,
                    department_code: deptInfo.department_code,
                    department_name: deptInfo.department_name,
                    department: deptInfo.department_name,
                    placement_access: perms.placement_access,
                    social_media_access: perms.social_media_access
                }
            });
        });
    } catch (err) {
        return res.status(401).json({ success: false, message: "Your session has expired. Please log in again." });
    }
});

// =========================
// GET & UPDATE USER PERMISSIONS
// =========================
router.get("/permissions", (req, res) => {
    res.json({
        success: true,
        permissions: permissionsStorage.getAllPermissions(),
        role_defaults: permissionsStorage.ROLE_DEFAULTS
    });
});

router.post("/permissions", async (req, res) => {
    const { identifier, placement_access, social_media_access } = req.body;
    if (!identifier) {
        return res.status(400).json({ success: false, message: "User identifier (email or staff ID) is required." });
    }
    const updated = await permissionsStorage.setUserPermissions(identifier, {
        placement_access: Boolean(placement_access),
        social_media_access: Boolean(social_media_access)
    });
    res.json({ success: true, message: "Permissions updated successfully", updated });
});

// =========================
// GET PUBLIC PORTAL SETTINGS & BATCHES
// =========================
router.get("/settings", async (req, res) => {
    try {
        const settingsStorage = require("../settingsStorage");
        const settings = await settingsStorage.getSettings();
        res.json({ success: true, settings });
    } catch (err) {
        console.error("Error fetching portal settings:", err);
        res.status(500).json({ success: false, message: "Failed to load portal settings" });
    }
});

module.exports = router;