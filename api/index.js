const fs = require("fs");
const path = require("path");

let app = null;
let initError = null;

// Ensure any phantom/corrupt backend/node_modules from legacy build cache is purged
try {
    const corruptBackendModules = path.join(__dirname, "../backend/node_modules");
    if (fs.existsSync(corruptBackendModules)) {
        fs.rmSync(corruptBackendModules, { recursive: true, force: true });
    }
} catch (e) {}

function initializeApp() {
    if (app) return app;
    try {
        // Statically declare dependencies for Vercel NFT tracing with defensive execution
        try { require("express"); } catch (e) {}
        try { require("cors"); } catch (e) {}
        try { require("multer"); } catch (e) {}
        try { require("@supabase/supabase-js"); } catch (e) {}
        try { require("jsonwebtoken"); } catch (e) {}
        try { require("bcryptjs"); } catch (e) {}
        try { require("nodemailer"); } catch (e) {}
        try { require("qrcode"); } catch (e) {}
        try { require("jspdf"); } catch (e) {}

        app = require("../backend/server");
        initError = null;
        return app;
    } catch (err) {
        console.error("❌ FATAL SERVERLESS STARTUP ERROR:", err.message || err);
        if (err.stack) {
            console.error(err.stack);
        }
        initError = err;
        return null;
    }
}

// Eager initialization on cold start
initializeApp();

module.exports = (req, res) => {
    const currentApp = app || initializeApp();
    if (!currentApp || initError) {
        console.error("❌ Request failed due to serverless startup error:", initError?.message || initError);
        return res.status(500).json({
            success: false,
            error: "Serverless Startup Error",
            message: initError ? `Backend startup error: ${initError.message || initError}` : "Authentication service is temporarily unavailable. Please try again.",
            code: initError?.code || "INIT_ERR"
        });
    }
    return currentApp(req, res);
};

