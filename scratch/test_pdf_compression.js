const { createCertificatePdf } = require("../backend/services/emailService");
const fs = require('fs');

async function testCompress() {
    const certDoc = await createCertificatePdf({
        certificate_number: 'RIT-TEST-COMPRESS',
        participant_name: 'Keerthana Mohan'
    });
    const buf = Buffer.from(certDoc.output('arraybuffer'));
    console.log("Current PDF size:", buf.length, "bytes");
}

testCompress();
