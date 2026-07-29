const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db");
const { issueAdminToken } = require("./admin");

// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {

    try {

        const {
            full_name,
            register_number,
            email,
            password,
            year,
            department,
            phone
        } = req.body;

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

            }
        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});


// =========================
// LOGIN
// =========================
router.post("/login", (req, res) => {

    // The frontend's login field is labeled "Email ID / Username"
    // and posts it as `email`, but a student might type either
    // their register number or their actual email - so treat it
    // as a single identifier and match against both columns.
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

    db.query(
        "SELECT * FROM users WHERE register_number = ? OR email = ?",
        [identifier, identifier],
        async (err, results) => {

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

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);

            if (!match) {

                return res.status(401).json({
                    success: false,
                    message: "Wrong Password"
                });

            }

            res.status(200).json({

                success: true,
                role: "student",
                message: "Login Successful",

                user: {
                    id: user.id,
                    full_name: user.full_name,
                    register_number: user.register_number,
                    email: user.email,
                    year: user.year,
                    department_code: user.department_code,
                    phone: user.phone
                }

            });

        }

    );

});

module.exports = router;