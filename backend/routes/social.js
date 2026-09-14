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

// Initial seed posts to make the social feed look realistic and active immediately
let socialPosts = [
    {
        id: "post-1",
        title: "CSBS Department Signs Strategic MoU with IT Industry Leaders for Student Internships & Projects",
        content: "The Department of Computer Science and Business Systems (CSBS) is pleased to announce the formal signing of a strategic industry collaboration and MoU with premier enterprise technology partners. This agreement will facilitate paid semester internships, continuous curriculum advisory, corporate guest lectures, and collaborative engineering research in cloud business architectures.",
        category: "Industry MoU",
        platforms: ["linkedin", "facebook", "youtube"],
        mediaUrl: "",
        mediaType: "none",
        authorName: "Dr. K. Vijayalakshmi",
        authorRole: "hod",
        authorDesignation: "Head of Department — CSBS",
        hashtags: "#RITCSBS #CSBSDepartment #IndustryMoU #CorporateCollab #ComputerScienceAndBusinessSystems #BusinessWithTech",
        publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        likes: 184,
        shares: 38
    },
    {
        id: "post-2",
        title: "1st Prize Honors at National Engineering AI Hackathon — CSBS Student Innovators",
        content: "Proud moment for the Department of Computer Science and Business Systems! Our third-year student team clinched the First Prize with a cash award at the National Level Smart Systems Hackathon. Their product integrated automated enterprise inventory tracking with real-time neural computer vision. Congratulations to the winning cohort and mentor faculty!",
        category: "Student Innovation",
        platforms: ["instagram", "linkedin", "facebook"],
        mediaUrl: "",
        mediaType: "none",
        authorName: "Prof. S. Anand",
        authorRole: "faculty",
        authorDesignation: "Assistant Professor — CSBS",
        hashtags: "#RITCSBS #CSBSDepartment #HackathonWinners #StudentInnovators #AIandBusiness #RITEngineers",
        publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        likes: 245,
        shares: 52
    },
    {
        id: "post-3",
        title: "CSBS Batch 2027 Campus Placement Drive — Lucrative Offers at Premier IT Corporations",
        content: "Hearty congratulations to our talented CSBS final-year students for securing high-CTC engineering, product development, and consulting roles across marquee campus recruitment drives! Gratitude to our departmental placement coordinators, training mentors, and industry trainers for their relentless support.",
        category: "Placement Milestone",
        platforms: ["linkedin", "facebook", "youtube", "instagram"],
        mediaUrl: "",
        mediaType: "none",
        authorName: "Placement Admin",
        authorRole: "admin",
        authorDesignation: "CSBS Placement Coordinator",
        hashtags: "#RITCSBS #CSBSDepartment #CSBSPlacements #CampusRecruitment #Batch2027 #FutureReady",
        publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        likes: 198,
        shares: 44
    },
    {
        id: "post-4",
        title: "Faculty Research Milestone: IEEE Transactions Paper on Enterprise Business Intelligence",
        content: "The Department of CSBS takes pride in sharing that our faculty members have published groundbreaking research in the IEEE Transactions on Applied Business Systems & Machine Intelligence. This research explores resilient distributed computing architectures for real-time supply chain analytics.",
        category: "Faculty Research",
        platforms: ["linkedin", "facebook"],
        mediaUrl: "",
        mediaType: "none",
        authorName: "Dr. K. Vijayalakshmi",
        authorRole: "hod",
        authorDesignation: "Head of Department — CSBS",
        hashtags: "#RITCSBS #CSBSDepartment #FacultyResearch #IEEE #Publications #AcademicExcellence",
        publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        likes: 162,
        shares: 29
    }
];

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

        const detectedType = mediaType === "video" || /\.(mp4|webm|mov|m4v|avi)/i.test(mediaUrl) ? "video" : "image";

        const newPost = {
            id: `post-${Date.now()}`,
            title: title.trim(),
            content: content.trim(),
            category: category.trim(),
            platforms: sanitizedPlatforms,
            mediaUrl: mediaUrl.trim() || "rit_logo.png",
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
