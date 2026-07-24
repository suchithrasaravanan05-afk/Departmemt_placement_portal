const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Suji,19",
    database: "csbs"
});

module.exports = db;