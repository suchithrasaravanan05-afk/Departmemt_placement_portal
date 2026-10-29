const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

async function testFullSuite() {
  const certAssets = require('../frontend/certificate_assets.js');

  // Test standard certificate with "Keerthana Mohan"
  const docStandard = await certAssets.createCertificatePdf({
    student_name: 'Keerthana Mohan',
    certificate_number: 'RITCB 01 0001'
  });
  fs.writeFileSync(path.join(__dirname, 'acceptance_certificate_standard.pdf'), Buffer.from(docStandard.output('arraybuffer')));
  console.log('Saved acceptance_certificate_standard.pdf');

  // Test template view with "Mr./Ms. PARTICIPANT NAME"
  const docTmpl = await certAssets.createCertificatePdf({
    student_name: 'Mr./Ms. PARTICIPANT NAME',
    certificate_number: 'RITCB 01 0001'
  });
  fs.writeFileSync(path.join(__dirname, 'acceptance_certificate_template.pdf'), Buffer.from(docTmpl.output('arraybuffer')));
  console.log('Saved acceptance_certificate_template.pdf');
}

testFullSuite().catch(console.error);
