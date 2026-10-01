let app;
let initError = null;

try {
    // Pre-load core dependencies at root level to populate require.cache
    require(require.resolve("multer", { paths: [process.cwd()] }));
    require("express");
    require("cors");
    require("@supabase/supabase-js");

    app = require("../backend/server");
} catch (err) {
    console.error("❌ FATAL SERVERLESS STARTUP ERROR:", err);
    initError = err;
}

module.exports = (req, res) => {
    if (initError) {
        return res.status(500).json({
            success: false,
            error: "Serverless Startup Error",
            message: "An internal serverless startup error occurred. Please contact administrator.",
            code: initError.code || "INIT_ERR"
        });
    }
    return app(req, res);
};

