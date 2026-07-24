const express = require("express");
const cors = require("cors");

const db = require("./db"); // Connects to MySQL
const authRoutes = require("./routes/auth");

const app = express();
const PORT = 5500;

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

// Routes
app.use("/api/auth", authRoutes);

// Home Route
app.get("/", (req, res) => {
    res.send("🚀 College Placement Portal Backend Running Successfully");
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});