const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

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
// On Vercel, files are written to /tmp/uploads — serve from there
const uploadServePath = process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadServePath));

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
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/student/") || req.path.startsWith("/admin/")) {
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
    next(err);
});

// Fallback to frontend index/login page
app.get("*", (req, res) => {
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
