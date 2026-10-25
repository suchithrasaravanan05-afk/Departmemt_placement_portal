const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const fs = require("fs");

const db = require("./db");

let authRoutes;
try {
    authRoutes = require("./routes/auth");
} catch (e) {
    console.error("❌ Critical: Failed to load authRoutes:", e);
    throw e;
}

let studentRoutes;
try {
    studentRoutes = require("./routes/student");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load studentRoutes:", e.message || e);
}

let adminRoutes;
try {
    adminRoutes = require("./routes/admin");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load adminRoutes:", e.message || e);
}

let socialRoutes;
try {
    socialRoutes = require("./routes/social");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load socialRoutes:", e.message || e);
}

let facultyRoutes;
try {
    facultyRoutes = require("./routes/faculty");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load facultyRoutes:", e.message || e);
}

let certificateGenRoutes;
try {
    certificateGenRoutes = require("./routes/certificateGeneration");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load certificateGenRoutes:", e.message || e);
}

let feedbackCertificateStorage;
try {
    feedbackCertificateStorage = require("./feedbackCertificateStorage");
} catch (e) {
    console.warn("⚠️ Warning: Failed to load feedbackCertificateStorage:", e.message || e);
}

const app = express();
const PORT = process.env.PORT || 5500;

// Enable CORS & JSON Body Parser
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (resumes, photos)
const uploadServePath = process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(__dirname, "uploads");

// Ensure uploads directory exists on disk
if (!fs.existsSync(uploadServePath)) {
    try { fs.mkdirSync(uploadServePath, { recursive: true }); } catch (e) {}
}

app.use("/uploads", express.static(uploadServePath));

// Dedicated route handler for files in /uploads to prevent fallthrough to SPA route
app.get(["/uploads/:filename", "/api/uploads/:filename"], (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadServePath, filename);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>File Not Found</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #0f172a; }
                .card { max-width: 480px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                h2 { color: #ef4444; margin-bottom: 10px; }
                p { color: #64748b; font-size: 14px; line-height: 1.6; }
                code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a; }
                a { display: inline-block; margin-top: 20px; text-decoration: none; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; }
                a:hover { background: #1d4ed8; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>⚠️ File Not Found</h2>
                <p>The requested file <code>${filename}</code> was not found on the server.</p>
                <p>It may have been removed or was not saved to server storage.</p>
                <a href="javascript:history.back()">← Go Back</a>
            </div>
        </body>
        </html>
    `);
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// API Routes (Support both /api/* and root paths for Vercel serverless rewrites)
if (authRoutes) app.use(["/api/auth", "/auth"], authRoutes);
if (studentRoutes) app.use(["/api/student", "/student"], studentRoutes);
if (certificateGenRoutes) app.use(["/api/admin/certificate-generation", "/admin/certificate-generation"], certificateGenRoutes);
if (adminRoutes) app.use(["/api/admin", "/admin"], adminRoutes);
if (socialRoutes) app.use(["/api/social", "/social"], socialRoutes);
if (facultyRoutes) app.use(["/api/faculty", "/faculty"], facultyRoutes);

// Dedicated Public Certificate Verification API (No authentication required)
app.get(["/api/public/verify-certificate/:certId", "/public/verify-certificate/:certId"], async (req, res) => {
    if (!feedbackCertificateStorage) {
        return res.status(503).json({ success: false, message: "Certificate verification service temporarily unavailable." });
    }
    try {
        const certId = req.params.certId;
        const result = await feedbackCertificateStorage.getPublicCertificateDetails(certId);
        if (!result.found) {
            return res.status(404).json({
                success: false,
                found: false,
                status: "NOT_FOUND",
                message: result.message || "Certificate not found. Please check the certificate ID."
            });
        }
        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error("Public verify error:", e);
        res.status(500).json({ success: false, message: "Internal server error during certificate verification." });
    }
});

// Root Route
app.get(["/api/health", "/health"], (req, res) => {
    res.json({
        status: "Online",
        message: "🎓 Ramco Institute of Technology - CSBS Placement Portal Backend Operating Normally",
        dbMode: db.mode()
    });
});

// Global JSON Error Handler — ensures API routes NEVER return HTML on error
app.use((err, req, res, next) => {
    console.error("❌ Unhandled server error:", err.message || err);
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/student/") || req.path.startsWith("/admin/") || req.path.startsWith("/social/") || req.path.startsWith("/faculty/") || req.path.startsWith("/uploads/")) {
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
    next(err);
});

// Page route helpers
app.get("/placement", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/admin_dashboard.html"));
});

app.get("/social-media", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/social_dashboard.html"));
});

app.get(["/faculty-registration", "/faculty-register"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/faculty-registration.html"));
});

// Public Standalone Certificate Verification Page
app.get(["/verify-certificate", "/verify-certificate.html", "/verify"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/verify-certificate.html"));
});

// Fallback to frontend index/login page (excluding API, auth, admin, student, uploads, social, faculty, verify-certificate)
app.get("*", (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/auth") || req.path.startsWith("/student") || req.path.startsWith("/admin") || req.path.startsWith("/social") || req.path.startsWith("/faculty") || req.path.startsWith("/verify")) {
        return res.status(404).json({ success: false, message: "Endpoint not found" });
    }
    res.sendFile(path.join(__dirname, "../frontend/Form.html"));
});

// Start Server — only listen() when executed directly, never when required as serverless function
if (!process.env.VERCEL && require.main === module) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 RIT Placement Portal Backend running on http://localhost:${PORT}`);
        console.log(`=======================================================`);
    });
}

module.exports = app;
