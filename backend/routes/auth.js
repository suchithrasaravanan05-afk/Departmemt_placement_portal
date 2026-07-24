const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db");


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

        // Check if email already exists
        db.query(
            "SELECT * FROM users WHERE email = ? OR register_number = ?",
            [email, register_number],
            async (err, results) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Database Error"
                    });
                }

                if (results.length > 0) {
                    return res.status(400).json({
                        message: "Email or Register Number already exists"
                    });
                }

                // Encrypt Password
                const hashedPassword = await bcrypt.hash(password, 10);

                const sql = `
                INSERT INTO users
                (full_name, register_number, email, password, year, department, phone)
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
            message: "Server Error"
        });

    }

});


// =========================
// LOGIN
// =========================

router.post("/login", (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, results) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Database Error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "User Not Found"
                });
            }

            const user = results[0];

            const hashedPassword = password;

            if (!match) {
                return res.status(401).json({
                    message: "Wrong Password"
                });
            }

            res.status(200).json({
                success: true,
                message: "Login Successful",
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    register_number: user.register_number,
                    email: user.email,
                    year: user.year,
                    department: user.department,
                    phone: user.phone
                }
            });

        }
    );

});

module.exports = router;