const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");

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
            department = "Computer Science and Business Systems",
            phone
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required." });
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

            const sql = `
                INSERT INTO users (full_name, register_number, email, password, role, year, department, phone)
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
                    department,
                    phone || null
                ],
                (err, result) => {
                    if (err) {
                        console.error("Registration Failed:", err);
                        return res.status(500).json({ success: false, message: "Registration Failed" });
                    }

                    const userId = result.insertId;

                    // Automatically create an empty student profile entry if user is a student
                    if (role === "student" && userId) {
                        db.query(
                            "INSERT INTO student_profiles (user_id, college_email, department, phone_number) VALUES (?, ?, ?, ?)",
                            [userId, email, department, phone || null],
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
                        user: {
                            id: userId,
                            full_name,
                            register_number,
                            email,
                            role,
                            year,
                            department,
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
    const { email, password } = req.body;
    const identifier = (email || "").trim();

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: "Email/Register No and password are required." });
    }

    // Default Admin Login shortcut
    if ((identifier === "admin" || identifier === "admin@rit.ac.in") && password === "admin123") {
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
                register_number: "ADMIN",
                email: "admin@rit.ac.in",
                role: "admin"
            }
        });
    }

    // Database lookup for Student or registered Admin
    db.query(
        "SELECT * FROM users WHERE email = ? OR register_number = ?",
        [identifier, identifier],
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

                res.status(200).json({
                    success: true,
                    message: "Login successful!",
                    token,
                    adminToken: user.role === "admin" ? token : undefined,
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        register_number: user.register_number,
                        email: user.email,
                        role: user.role || "student",
                        year: user.year,
                        department: user.department,
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
        db.query("SELECT id, full_name, register_number, email, role, year, department, phone FROM users WHERE id = ?", [decoded.id], (err, results) => {
            if (err || !results || results.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            res.json({ success: true, user: results[0] });
        });
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
});

module.exports = router;