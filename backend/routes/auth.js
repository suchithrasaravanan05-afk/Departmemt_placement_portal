const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
<<<<<<< HEAD
const { issueAdminToken } = require("./admin");
=======

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0

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

<<<<<<< HEAD
        // Check if email or register number already exists
        db.query(
            "SELECT * FROM users WHERE email = ? OR register_number = ?",
            [email, register_number],
            async (err, results) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        success: false,
                        message: "Database Error"
                    });
                }

                if (results.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Email or Register Number already exists"
                    });
                }

                // Hash Password
                const hashedPassword = await bcrypt.hash(password, 10);

                const sql = `
                    INSERT INTO users
                    (full_name, register_number, email, password, year, department_code, phone)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sql,
                    [
                        full_name,
                        register_number,
                        email,
                        hashedPassword,
                        year,
                        department,
                        phone
                    ],
                    (err, result) => {

                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                success: false,
                                message: "Registration Failed"
                            });
                        }

                        res.status(201).json({
                            success: true,
                            message: "Registered Successfully"
                        });

                    }
                );
=======
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required." });
        }
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0

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

<<<<<<< HEAD
        res.status(500).json({
            success: false,
            message: "Server Error"
=======
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
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
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
<<<<<<< HEAD

    // The frontend's login field is labeled "Email ID / Username"
    // and posts it as `email`, but a student might type either
    // their register number or their actual email - so treat it
    // as a single identifier and match against both columns.
=======
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
    const { email, password } = req.body;
    const identifier = (email || "").trim();

    // ==========================
    // ADMIN LOGIN
    // ==========================

    if (identifier === "admin" && password === "admin123") {

        const adminToken = issueAdminToken();

        return res.status(200).json({
            success: true,
            role: "admin",
            adminToken,
            message: "Admin Login Successful"
        });

    }

    // ==========================
    // STUDENT LOGIN
    // ==========================

<<<<<<< HEAD
    db.query(
        "SELECT * FROM users WHERE register_number = ? OR email = ?",
        [identifier, identifier],
        async (err, results) => {
=======
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0

    db.query(
        "SELECT * FROM users WHERE email = ? OR register_number = ?",
        [email, email],
        async (err, results) => {
            if (err) {
<<<<<<< HEAD
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

=======
                console.error("Login DB Error:", err);
                return res.status(500).json({ success: false, message: "Database Error" });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({ success: false, message: "User not found with provided credentials." });
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
            }

            const user = results[0];

<<<<<<< HEAD
            const match = await bcrypt.compare(password, user.password);

            if (!match) {

                return res.status(401).json({
                    success: false,
                    message: "Wrong Password"
                });

=======
            // Verify Password using bcrypt
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(401).json({ success: false, message: "Invalid Password" });
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.status(200).json({

                success: true,
<<<<<<< HEAD
                role: "student",
                message: "Login Successful",

=======
                message: "Login successful!",
                token,
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    register_number: user.register_number,
                    email: user.email,
                    role: user.role || "student",
                    year: user.year,
                    department_code: user.department_code,
                    phone: user.phone
                }

            });
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