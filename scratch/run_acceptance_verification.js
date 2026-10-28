const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');
const JSZip = require('jszip');

// Import certificate assets and engine
const certAssets = require('../frontend/certificate_assets.js');

async function runAcceptanceVerification() {
  console.log('=== RUNNING FINAL ACCEPTANCE VERIFICATION ===\n');

  // Test Case 1: Standard Reference Certificate (Keerthana Mohan)
  console.log('[STEP 1] Generating standard reference certificate PDF...');
  const certDataStandard = {
    student_name: 'Keerthana Mohan',
    certificate_number: 'RIT-STTP-2026-0001',
    certificate_title: 'CERTIFICATE OF PARTICIPATION',
    programme_title: 'One Week Short-Term Training Programme (STTP)',
    event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
    department: 'Department of Computer Science and Business Systems',
    college_name: 'Ramco Institute of Technology, Rajapalayam',
    signatory_count: 6,
    signatory_1_name: 'Dr. M. Jeya Sundari',
    signatory_1_title: 'Faculty Coordinator',
    signatory_1_dept: 'CSBS, RIT',
    signatory_2_name: 'M. Rekha',
    signatory_2_title: 'Faculty Coordinator',
    signatory_2_dept: 'CSBS, RIT',
    signatory_3_name: 'M. Ramakrishnan',
    signatory_3_title: 'Faculty Coordinator',
    signatory_3_dept: 'CSBS, RIT',
    signatory_4_name: 'Dr. D. Kesavaraja',
    signatory_4_title: 'Convenor',
    signatory_4_dept: 'CSBS, RIT',
    signatory_5_name: 'Dr. S. Rajakarunakaran',
    signatory_5_title: 'Patron',
    signatory_5_dept: 'RIT',
    signatory_6_name: 'Dr. L. Ganesan',
    signatory_6_title: 'Chief Patron',
    signatory_6_dept: 'RIT'
  };

  const pdfDocStandard = await certAssets.createCertificatePdf(certDataStandard);
  const pdfBytesStandard = Buffer.from(pdfDocStandard.output('arraybuffer'));
  const standardPdfPath = path.join(__dirname, 'acceptance_certificate_standard.pdf');
  fs.writeFileSync(standardPdfPath, pdfBytesStandard);
  console.log(`  ✅ Standard PDF saved: ${standardPdfPath} (${pdfBytesStandard.length} bytes)`);

  // Test Case 2: Long Name and Long Event Description
  console.log('\n[STEP 2] Generating long name & long description certificate PDF...');
  const certDataLong = {
    student_name: 'Keerthana Mohan Ramachandran Subramanian',
    certificate_number: 'RIT-STTP-2026-0002',
    certificate_title: 'CERTIFICATE OF PARTICIPATION',
    programme_title: 'One Week Short-Term Training Programme (STTP)',
    event_name: 'Emerging Blockchain Technologies – Architectures, Applications, Smart Contracts, Consensus Protocols and Research Perspectives',
    department: 'Department of Computer Science and Business Systems',
    college_name: 'Ramco Institute of Technology, Rajapalayam',
    signatory_count: 6,
    signatory_1_name: 'Dr. M. Jeya Sundari',
    signatory_1_title: 'Faculty Coordinator',
    signatory_2_name: 'M. Rekha',
    signatory_2_title: 'Faculty Coordinator',
    signatory_3_name: 'M. Ramakrishnan',
    signatory_3_title: 'Faculty Coordinator',
    signatory_4_name: 'Dr. D. Kesavaraja',
    signatory_4_title: 'Convenor',
    signatory_5_name: 'Dr. S. Rajakarunakaran',
    signatory_5_title: 'Patron',
    signatory_6_name: 'Dr. L. Ganesan',
    signatory_6_title: 'Chief Patron'
  };

  const pdfDocLong = await certAssets.createCertificatePdf(certDataLong);
  const pdfBytesLong = Buffer.from(pdfDocLong.output('arraybuffer'));
  const longPdfPath = path.join(__dirname, 'acceptance_certificate_long.pdf');
  fs.writeFileSync(longPdfPath, pdfBytesLong);
  console.log(`  ✅ Long Name PDF saved: ${longPdfPath} (${pdfBytesLong.length} bytes)`);

  // Test Case 3: Batch ZIP Generation
  console.log('\n[STEP 3] Testing Batch ZIP Archive generation...');
  const zip = new JSZip();
  zip.file('001_Keerthana_Mohan_RIT-STTP-2026-0001.pdf', pdfBytesStandard);
  zip.file('002_Keerthana_LongName_RIT-STTP-2026-0002.pdf', pdfBytesLong);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const zipPath = path.join(__dirname, 'acceptance_certificates_batch.zip');
  fs.writeFileSync(zipPath, zipBuffer);
  console.log(`  ✅ Batch ZIP Archive generated successfully: ${zipPath} (${zipBuffer.length} bytes)`);

  console.log('\n=== PDF GENERATION & BATCH TESTS COMPLETED SUCCESSFULLY ===');
}

runAcceptanceVerification().catch(err => {
  console.error('Acceptance verification error:', err);
  process.exit(1);
});
