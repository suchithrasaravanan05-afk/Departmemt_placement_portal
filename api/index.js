let app;
let initError = null;

try {
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
            message: initError.message || String(initError),
            code: initError.code,
            stack: initError.stack
        });
    }
    return app(req, res);
};

