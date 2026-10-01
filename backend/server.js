const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require(require.resolve("multer", { paths: [process.cwd()] }));

const fs = require("fs");

const db = require("./db");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const adminRoutes = require("./routes/admin");
const socialRoutes = require("./routes/social");
const facultyRoutes = require("./routes/faculty");

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

    return res.status(404).json({ success: false, message: "Requested file not found on storage" });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// API Routes (Support both /api/* and root paths for Vercel serverless rewrites)
app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/student", "/student"], studentRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);
app.use(["/api/social", "/social"], socialRoutes);
app.use(["/api/faculty", "/faculty"], facultyRoutes);

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

// Fallback to frontend index/login page (excluding API, auth, admin, student, uploads, social, faculty)
app.get("*", (req, res) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/auth") || req.path.startsWith("/student") || req.path.startsWith("/admin") || req.path.startsWith("/social") || req.path.startsWith("/faculty")) {
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
