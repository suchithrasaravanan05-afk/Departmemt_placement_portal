const path = require("path");

let multerInstance = null;

try {
    // 1. Explicitly load from root node_modules to bypass any corrupt /var/task/backend/node_modules
    multerInstance = require(path.join(__dirname, "../node_modules/multer"));
} catch (e1) {
    try {
        // 2. Standard require fallback
        multerInstance = require("multer");
    } catch (e2) {
        console.warn("⚠️ Warning: Failed to load multer from standard paths:", e2.message || e2);
    }
}

// 3. Fallback dummy if multer is unavailable (prevents crash on serverless startup)
if (!multerInstance) {
    multerInstance = function () {
        return {
            single: () => (req, res, next) => next(),
            array: () => (req, res, next) => next(),
            fields: () => (req, res, next) => next(),
            any: () => (req, res, next) => next()
        };
    };
    multerInstance.memoryStorage = () => ({});
    multerInstance.diskStorage = () => ({});
}

module.exports = multerInstance;
