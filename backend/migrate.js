const mysql = require("mysql2");

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Suji,19",
    database: "csbs"
});

// Define desired columns for each table
const profileColumns = [
    { name: "dob", def: "DATE" },
    { name: "personal_email", def: "VARCHAR(100)" },
    { name: "college_email", def: "VARCHAR(100)" },
    { name: "domain_interest", def: "VARCHAR(100)" },
    { name: "tenth_percentage", def: "DECIMAL(5,2)" },
    { name: "twelth_percentage", def: "DECIMAL(5,2)" },
    { name: "diploma_percentage", def: "DECIMAL(5,2)" },
    { name: "degree", def: "VARCHAR(50) DEFAULT 'B.Tech'" },
    { name: "department", def: "VARCHAR(100) DEFAULT 'CSBS'" },
    { name: "sem1_gpa", def: "DECIMAL(4,2)" },
    { name: "sem2_gpa", def: "DECIMAL(4,2)" },
    { name: "sem3_gpa", def: "DECIMAL(4,2)" },
    { name: "sem4_gpa", def: "DECIMAL(4,2)" },
    { name: "sem5_gpa", def: "DECIMAL(4,2)" },
    { name: "sem6_gpa", def: "DECIMAL(4,2)" },
    { name: "sem7_gpa", def: "DECIMAL(4,2)" },
    { name: "sem8_gpa", def: "DECIMAL(4,2)" },
    { name: "cgpa", def: "DECIMAL(4,2)" },
    { name: "phone_number", def: "VARCHAR(15)" },
    { name: "whatsapp_number", def: "VARCHAR(15)" },
    { name: "history_of_arrears", def: "VARCHAR(10) DEFAULT 'no'" },
    { name: "history_arrears_count", def: "INT DEFAULT 0" },
    { name: "standing_of_arrears", def: "VARCHAR(10) DEFAULT 'no'" },
    { name: "standing_arrears_count", def: "INT DEFAULT 0" },
    { name: "linkedin_link", def: "VARCHAR(255)" },
    { name: "github_link", def: "VARCHAR(255)" },
    { name: "profile_photo", def: "VARCHAR(255)" },
    { name: "resume_file", def: "VARCHAR(255)" }
];

const userColumns = [
    { name: "role", def: "VARCHAR(20) DEFAULT 'student'" },
    { name: "department", def: "VARCHAR(100) DEFAULT 'Computer Science and Business Systems'" }
];

function addMissingColumns(tableName, wantedCols, existingCols, callback) {
    const existing = existingCols.map(c => c.Field.toLowerCase());
    const toAdd = wantedCols.filter(c => !existing.includes(c.name.toLowerCase()));

    if (toAdd.length === 0) {
        console.log(`✅ Table '${tableName}' already has all required columns.`);
        callback();
        return;
    }

    let done = 0;
    toAdd.forEach(col => {
        const q = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.def}`;
        conn.query(q, (err) => {
            if (err) {
                console.error(`❌ Failed to add ${col.name} to ${tableName}:`, err.message);
            } else {
                console.log(`✅ Added column '${col.name}' to '${tableName}'`);
            }
            done++;
            if (done === toAdd.length) callback();
        });
    });
}

conn.connect((err) => {
    if (err) {
        console.error("Connection failed:", err.message);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL. Checking tables...\n");

    // Check student_profiles columns
    conn.query("SHOW COLUMNS FROM student_profiles", (err, spCols) => {
        if (err) {
            console.log("⚠️  student_profiles table doesn't exist yet, will be created by server.");
            spCols = [];
        }

        conn.query("SHOW COLUMNS FROM users", (err2, userCols) => {
            if (err2) {
                console.log("⚠️  users table missing.");
                conn.end();
                return;
            }

            addMissingColumns("student_profiles", profileColumns, spCols || [], () => {
                addMissingColumns("users", userColumns, userCols, () => {
                    console.log("\n🎉 Migration complete! All required columns are present.");
                    conn.end();
                    process.exit(0);
                });
            });
        });
    });
});
