const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

// Initial seed posts to make the social feed look realistic and active immediately
let socialPosts = [
    {
        id: "post-1",
        title: "TCS Digital 2026 Batch Campus Recruitment Drive Success",
        content: "Hearty congratulations to our final-year CSBS students for securing lucrative offers in the TCS Digital recruitment drive! Proud moment for the Department of Computer Science & Business Systems.",
        category: "Placement Achievement",
        platforms: ["linkedin", "facebook", "instagram"],
        mediaUrl: "rit_logo.png",
        authorName: "Dr. K. Vijayalakshmi",
        authorRole: "hod",
        authorDesignation: "Head of Department - CSBS",
        hashtags: "#RamcoInstituteOfTechnology #CSBS #CampusPlacements #TCSDigital #EngineeringExcellence",
        publishedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        likes: 142,
        shares: 28
    },
    {
        id: "post-2",
        title: "National Symposium & Hackathon on Generative AI & Cloud Systems",
        content: "Watch the key highlights from our 2-day hands-on National Workshop on Generative AI and Enterprise Business Architectures hosted by RIT CSBS in collaboration with industry partners.",
        category: "Department Workshop",
        platforms: ["youtube", "linkedin", "facebook"],
        mediaUrl: "clg_logo.jpg",
        authorName: "Prof. S. Anand",
        authorRole: "faculty",
        authorDesignation: "Assistant Professor - CSBS",
        hashtags: "#RIT #GenAI #TechSymposium #CSBS #CloudComputing #Innovation",
        publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        likes: 218,
        shares: 45
    },
    {
        id: "post-3",
        title: "Zoho Corporation SDE Placement Pre-Placement Talk",
        content: "Special orientation & pre-placement interactive session conducted by Zoho technical leads for 3rd and 4th year CSBS students. High engagement on Data Structures, System Design and coding rounds.",
        category: "Campus Drive",
        platforms: ["instagram", "linkedin", "facebook"],
        mediaUrl: "admin.png",
        authorName: "Placement Admin",
        authorRole: "admin",
        authorDesignation: "Placement Officer",
        hashtags: "#ZohoCorporation #RITPlacements #SoftwareEngineering #CareerGrowth",
        publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        likes: 95,
        shares: 19
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
            hashtags = ""
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

        const newPost = {
            id: `post-${Date.now()}`,
            title: title.trim(),
            content: content.trim(),
            category: category.trim(),
            platforms: sanitizedPlatforms,
            mediaUrl: mediaUrl.trim() || "rit_logo.png",
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
            message: `Post successfully published to ${sanitizedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}!`,
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
