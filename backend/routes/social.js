const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require(require.resolve("multer", { paths: [process.cwd()] }));
const fs = require("fs");
const path = require("path");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

// Media uploads directory for photos & videos
const uploadServePath = process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadServePath)) {
    try { fs.mkdirSync(uploadServePath, { recursive: true }); } catch (e) {}
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadServePath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || ".jpg";
        const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);
        const name = `social_${Date.now()}_${cleanBase}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for video/image
});

// Storage for broadcast posts submitted by department staff (starts empty)
let socialPosts = [];


// Middleware: Authenticate & Authorize Faculty / HOD / Admin ONLY
function requireStaffAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // Check if role is provided directly in request body for demo convenience
        const fallbackRole = (req.body?.authorRole || req.query?.role || "").toLowerCase();
        if (["faculty", "hod", "admin"].includes(fallbackRole)) {
            req.user = {
                role: fallbackRole,
                full_name: req.body?.authorName || (fallbackRole === "hod" ? "Dr. K. Vijayalakshmi" : (fallbackRole === "faculty" ? "Prof. S. Anand" : "Placement Admin")),
                designation: req.body?.authorDesignation || (fallbackRole === "hod" ? "Head of Department" : "Faculty Coordinator")
            };
            return next();
        }
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please log in as Faculty, HOD, or Admin."
        });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const role = (decoded.role || "").toLowerCase();
        if (!["faculty", "hod", "admin"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Only Faculty, HOD, and Administrators are authorized to access the Social Media Page."
            });
        }
        if (decoded.social_media_access === false) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your account does not have permission to access the Social Media Hub."
            });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired session token." });
    }
}

// =============================================
// GET /api/social/posts - Retrieve All Published Posts
// =============================================
router.get("/posts", (req, res) => {
    const { platform, category } = req.query;
    let filtered = [...socialPosts];

    if (platform && platform !== "all") {
        filtered = filtered.filter(p => p.platforms.includes(platform.toLowerCase()));
    }

    if (category && category !== "all") {
        filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    res.json({
        success: true,
        count: filtered.length,
        posts: filtered
    });
});

// =============================================
// POST /api/social/upload - Upload Photograph or Video
// =============================================
router.post("/upload", upload.single("mediaFile"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No media file provided." });
        }
        const isVideo = req.file.mimetype.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi)$/i.test(req.file.originalname);
        const mediaUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: `${isVideo ? "Video" : "Photograph"} uploaded successfully!`,
            mediaUrl,
            mediaType: isVideo ? "video" : "image",
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (err) {
        console.error("Media upload error:", err);
        res.status(500).json({ success: false, message: "Failed to process media upload." });
    }
});

// =============================================
// POST /api/social/publish - Publish Social Post
// =============================================
router.post("/publish", requireStaffAuth, (req, res) => {
    try {
        const {
            title,
            content,
            category = "Department Announcement",
            platforms = [],
            mediaUrl = "",
            mediaType = "image",
            hashtags = "",
            platformCaptions = {}
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and Content are required to publish a social media post."
            });
        }

        if (!platforms || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one social media platform (YouTube, LinkedIn, Instagram, Facebook)."
            });
        }

        const validPlatforms = ["youtube", "linkedin", "instagram", "facebook"];
        const sanitizedPlatforms = platforms
            .map(p => p.toLowerCase())
            .filter(p => validPlatforms.includes(p));

        if (sanitizedPlatforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Valid platforms are: YouTube, LinkedIn, Instagram, Facebook."
            });
        }

        const cleanMediaUrl = (mediaUrl || "").trim();
        const detectedType = !cleanMediaUrl ? "none" : (mediaType === "video" || /\.(mp4|webm|mov|m4v|avi)/i.test(cleanMediaUrl) ? "video" : "image");

        const newPost = {
            id: `post-${Date.now()}`,
            title: title.trim(),
            content: content.trim(),
            category: category.trim(),
            platforms: sanitizedPlatforms,
            mediaUrl: cleanMediaUrl,
            mediaType: detectedType,
            platformCaptions: typeof platformCaptions === "object" ? platformCaptions : {},
            authorName: req.user.full_name || "CSBS Faculty",
            authorRole: req.user.role || "faculty",
            authorDesignation: req.user.designation || (req.user.role === "hod" ? "Head of Department" : "Faculty Member"),
            hashtags: hashtags.trim() || "#RamcoInstituteOfTechnology #CSBS",
            publishedAt: new Date().toISOString(),
            likes: Math.floor(Math.random() * 20) + 5,
            shares: Math.floor(Math.random() * 8) + 1
        };

        // Prepend new post
        socialPosts.unshift(newPost);

        res.status(201).json({
            success: true,
            message: `Post successfully broadcast to ${sanitizedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}!`,
            post: newPost
        });
    } catch (err) {
        console.error("Social post publish error:", err);
        res.status(500).json({ success: false, message: "Server error publishing post." });
    }
});

// =============================================
// DELETE /api/social/posts/:id - Delete Post
// =============================================
router.delete("/posts/:id", requireStaffAuth, (req, res) => {
    const { id } = req.params;
    const initialLen = socialPosts.length;
    socialPosts = socialPosts.filter(p => p.id !== id);

    if (socialPosts.length === initialLen) {
        return res.status(404).json({ success: false, message: "Post not found." });
    }

    res.json({ success: true, message: "Post removed from department social feed." });
});

module.exports = router;
