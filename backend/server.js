const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db"); // Connects to MySQL
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());

// Test Database Connection
db.connect((err) => {
    if (err) {
        console.log("❌ Database Connection Failed");
        console.log(err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", require("./routes/student"));
app.use("/api/admin", require("./routes/admin"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve the frontend (Form.html, admin_dashboard.html, student_dashboard.html, etc.)
// Adjust "../frontend" if your frontend folder lives somewhere else relative to backend/
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});