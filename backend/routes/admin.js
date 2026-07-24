const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const mysql = require("mysql2");

/* ===== DB CONNECTION ===== */
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Suji,19",
    database: "csbs"
});

/* ===== EMAIL CONFIG ===== */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "placementcell@gmail.com",
        pass: "APP_PASSWORD"
    }
});

/* ===== ROUTE ===== */
router.post("/send-notification", (req, res) => {
    const { companyName, description } = req.body;

    if (!companyName || !description) {
        return res.status(400).json({ message: "Missing data" });
    }

    const insertQuery = `
        INSERT INTO placement_notifications (company_name, description)
        VALUES (?, ?)
    `;

    db.query(insertQuery, [companyName, description], (err) => {
        if (err) return res.status(500).json({ message: "DB error" });

        const emailQuery = `SELECT email, full_name FROM users`;

        db.query(emailQuery, (err, students) => {
            if (err) return res.status(500).json({ message: "Email fetch error" });

            students.forEach(student => {
                transporter.sendMail({
                    from: "placementcell@gmail.com",
                    to: student.email,
                    subject: `Placement Notification – ${companyName}`,
                    html: `
                        <p>Dear ${student.full_name},</p>
                        <p>${description}</p>
                        <p>Please login to student dashboard.</p>
                    `
                });
            });

            res.json({ message: "Notification email sent successfully" });
        });
    });
});

module.exports = router;
