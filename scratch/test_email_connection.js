const { verifyConnection } = require("../backend/services/emailService");

async function run() {
    console.log("Testing Gmail SMTP authentication...");
    const res = await verifyConnection();
    console.log("Result:", res);
}

run();
