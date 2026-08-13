const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require(require.resolve("multer", { paths: [process.cwd()] }));

const fs = require("fs");

const db = require("./db");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const adminRoutes = require("./routes/admin");

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
app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/student", "/student"], studentRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);

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
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/student/") || req.path.startsWith("/admin/") || req.path.startsWith("/uploads/")) {
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
    next(err);
});

// Fallback to frontend index/login page (excluding API, auth, admin, student, uploads)
app.get("*", (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/auth") || req.path.startsWith("/student") || req.path.startsWith("/admin")) {
        return res.status(404).json({ success: false, message: "Endpoint not found" });
    }
    res.sendFile(path.join(__dirname, "../frontend/Form.html"));
});

// Start Server — never listen() on Vercel (it uses serverless handler instead)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 RIT Placement Portal Backend running on http://localhost:${PORT}`);
        console.log(`=======================================================`);
    });
}

module.exports = app;
