let app = null;
let initError = null;

function initializeApp() {
    if (app) return app;
    try {
        // Pre-load core dependencies statically for Vercel NFT bundler tracing
        require("multer");
        require("express");
        require("cors");
        require("@supabase/supabase-js");

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
            message: "Authentication service is temporarily unavailable. Please try again or contact the CSBS department administrator.",
            code: initError?.code || "INIT_ERR"
        });
    }
    return currentApp(req, res);
};

