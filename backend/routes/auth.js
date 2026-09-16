const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
const { normalizeDepartment, getDepartmentById } = require("../utils/departmentNormalizer");

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

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
                (err, result) => {
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

                    // Generate Token
                    const token = jwt.sign(
                        { id: userId, email, role, full_name },
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
                            phone
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

// =========================
// LOGIN USER
// =========================
router.post("/login", (req, res) => {
    const { email, identifier: customId, password } = req.body;
    const identifier = (customId || email || "").trim();

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: "Register Number / Admin ID and password are required." });
    }

    const idLower = identifier.toLowerCase();
    const idUpper = identifier.toUpperCase();

    // Default Admin Login shortcut
    if ((idLower === "admin" || idUpper === "ADMIN001" || idLower === "admin@rit.ac.in") && password === "admin123") {
        const token = jwt.sign(
            { id: 0, email: "admin@rit.ac.in", role: "admin", full_name: "Placement Admin" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        return res.status(200).json({
            success: true,
            message: "Admin Login Successful!",
            token,
            adminToken: token,
            user: {
                id: 0,
                full_name: "Placement Admin",
                register_number: "ADMIN001",
                email: "admin@rit.ac.in",
                role: "admin"
            }
        });
    }

    // Default HOD Login shortcut
    if ((idLower === "hod" || idUpper === "HOD001" || idLower === "hod@rit.ac.in") && password === "hod123") {
        const token = jwt.sign(
            { id: 901, email: "hod@rit.ac.in", role: "hod", full_name: "Dr. K. Vijayalakshmi (HOD)" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        return res.status(200).json({
            success: true,
            message: "HOD Login Successful!",
            token,
            user: {
                id: 901,
                full_name: "Dr. K. Vijayalakshmi",
                designation: "Head of Department - CSBS",
                register_number: "HOD-CSBS-01",
                email: "hod@rit.ac.in",
                role: "hod"
            }
        });
    }

    // Default Faculty Login shortcut
    if ((idLower === "faculty" || idUpper === "FACULTY001" || idLower === "faculty@rit.ac.in") && password === "faculty123") {
        const token = jwt.sign(
            { id: 902, email: "faculty@rit.ac.in", role: "faculty", full_name: "Prof. S. Anand (Faculty)" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        return res.status(200).json({
            success: true,
            message: "Faculty Login Successful!",
            token,
            user: {
                id: 902,
                full_name: "Prof. S. Anand",
                designation: "Assistant Professor - CSBS",
                register_number: "FAC-CSBS-02",
                email: "faculty@rit.ac.in",
                role: "faculty"
            }
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
                    return res.status(404).json({ success: false, message: "User not found with provided credentials." });
                }

                const user = results[0];

                if (!user || !user.password) {
                    return res.status(401).json({ success: false, message: "Account has no password set. Please reset your password." });
                }

                // Verify Password using bcrypt
                const match = await bcrypt.compare(password, user.password);

                if (!match) {
                    return res.status(401).json({ success: false, message: "Invalid Password" });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
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
                        department: deptInfo.department_name, // backwards-compatibility
                        phone: user.phone
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
// GET CURRENT LOGGED IN USER (VERIFY TOKEN)
// =========================
router.get("/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db.query("SELECT id, full_name, register_number, email, role, year, department_id, department, phone FROM users WHERE id = ?", [decoded.id], (err, results) => {
            if (err || !results || results.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            const rawUser = results[0];
            const deptInfo = getDepartmentById(rawUser.department_id || 1);
            res.json({
                success: true,
                user: {
                    ...rawUser,
                    department_id: deptInfo.id,
                    department_code: deptInfo.department_code,
                    department_name: deptInfo.department_name,
                    department: deptInfo.department_name
                }
            });
        });
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
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