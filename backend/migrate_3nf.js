const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function migrateMySQL() {
    console.log("Connecting to MySQL on localhost...");
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "Suji,19",
            database: process.env.DB_NAME || "csbs"
        });
        console.log("Connected to MySQL csbs database.");

        // 1. Ensure departments table has department_code and department_name
        try {
            await conn.query(`
                ALTER TABLE departments 
                ADD COLUMN department_code VARCHAR(50) UNIQUE AFTER id,
                ADD COLUMN department_name VARCHAR(255) UNIQUE AFTER department_code
            `);
            console.log("Added department_code and department_name columns to departments table.");
        } catch (e) {
            if (!e.message.includes("Duplicate column name")) {
                console.warn("Notice on departments alter:", e.message);
            }
        }

        // 2. Ensure CSBS department record exists
        await conn.query(`
            INSERT INTO departments (id, department_code, department_name, dept_code, dept_name)
            VALUES (1, 'CSBS', 'Computer Science and Business Systems', 'CSBS', 'Computer Science and Business Systems')
            ON DUPLICATE KEY UPDATE 
                department_code = VALUES(department_code),
                department_name = VALUES(department_name),
                dept_code = VALUES(dept_code),
                dept_name = VALUES(dept_name)
        `);
        console.log("Seeded/verified CSBS department record in departments table (id=1).");

        // 3. Ensure users table has department_id column
        try {
            await conn.query(`
                ALTER TABLE users 
                ADD COLUMN department_id INT AFTER year
            `);
            console.log("Added department_id column to users table.");
        } catch (e) {
            if (!e.message.includes("Duplicate column name")) {
                console.warn("Notice on users alter:", e.message);
            }
        }

        // 4. Update existing users to point to department_id = 1
        const [updateRes] = await conn.query(`
            UPDATE users SET department_id = 1 WHERE department_id IS NULL
        `);
        console.log(`Updated users: ${updateRes.affectedRows} row(s) updated to department_id = 1.`);

        // 5. Verify departments & users
        const [deptRows] = await conn.query("SELECT * FROM departments");
        console.log("Current departments in MySQL:", deptRows);

        const [userSample] = await conn.query("SELECT id, full_name, email, role, department_id, department FROM users LIMIT 3");
        console.log("Sample users in MySQL:", userSample);

        console.log("MySQL 3NF migration completed successfully!");
    } catch (err) {
        console.error("MySQL migration error:", err.message);
    } finally {
        if (conn) await conn.end();
    }
}

migrateMySQL();
