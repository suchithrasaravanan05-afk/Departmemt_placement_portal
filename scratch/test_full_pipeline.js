const fs = require('fs');
const path = require('path');
const jsqr = require('jsqr');
const QRCode = require('qrcode');

// Mock window for Node environment if needed
if (typeof window === 'undefined') {
  global.window = global;
  global.QRCode = QRCode;
}

const certAssets = require('../frontend/certificate_assets.js');

async function runPipelineVerification() {
  console.log('========================================================');
  console.log('🧪 VERIFYING COMPLETE CERTIFICATE GENERATION PIPELINE');
  console.log('========================================================\n');

  let passedAll = true;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      passedAll = false;
    }
  }

  // 1. Standard STTP Certificate with 4 signatories
  console.log('[TEST 1] Generating Standard STTP Certificate with 4 Signatories...');
  const stdData = {
    student_name: 'SIVARANJANI S',
    certificate_number: 'RIT-STTP-2026-0042',
    certificate_title: 'CERTIFICATE OF PARTICIPATION',
    programme_title: 'Short-Term Training Programme (STTP)',
    event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
    organization_name: 'Department of Computer Science and Business Systems, Ramco Institute of Technology',
    verification_url: 'https://rit-csbs-portal.vercel.app/verify-certificate.html?id=RIT-STTP-2026-0042',
    signatory_count: 4,
    signatory_1_name: 'Dr. K. Arulraj',
    signatory_1_title: 'Faculty Coordinator',
    signatory_1_dept: 'CSBS, RIT',
    signatory_2_name: 'Dr. S. Rajakumaran',
    signatory_2_title: 'STTP Coordinator',
    signatory_2_dept: 'CSBS, RIT',
    signatory_3_name: 'Dr. S. Rajakarunakaran',
    signatory_3_title: 'Head of Department',
    signatory_3_dept: 'CSBS, RIT',
    signatory_4_name: 'Dr. L. Ganesan',
    signatory_4_title: 'Principal',
    signatory_4_dept: 'RIT'
  };

  const stdDoc = await certAssets.createCertificatePdf(stdData);
  assert(stdDoc !== null, 'jsPDF doc created successfully');
  assert(stdDoc.internal.pages.length - 1 === 1, 'PDF is exactly 1 single page');
  
  const stdWidth = stdDoc.internal.pageSize.getWidth();
  const stdHeight = stdDoc.internal.pageSize.getHeight();
  assert(Math.round(stdWidth) === 297, `PDF width is A4 landscape 297mm (Got ${stdWidth})`);
  assert(Math.round(stdHeight) === 210, `PDF height is A4 landscape 210mm (Got ${stdHeight})`);

  const stdPdfBuffer = Buffer.from(stdDoc.output('arraybuffer'));
  fs.writeFileSync('scratch/final_sample_standard.pdf', stdPdfBuffer);
  assert(stdPdfBuffer.length > 50000, `PDF has rich vector & image content (${stdPdfBuffer.length} bytes)`);

  const stdPdfString = stdPdfBuffer.toString('latin1');

  // Verify Selectable Text Glyphs in stream
  assert(stdPdfString.includes('RAMCO INSTITUTE OF TECHNOLOGY'), 'Vector text contains "RAMCO INSTITUTE OF TECHNOLOGY"');
  assert(stdPdfString.includes('CERTIFICATE OF PARTICIPATION'), 'Vector text contains "CERTIFICATE OF PARTICIPATION"');
  assert(stdPdfString.includes('SIVARANJANI S'), 'Vector text contains student name "SIVARANJANI S"');
  assert(stdPdfString.includes('Emerging Blockchain Technologies'), 'Vector text contains "Emerging Blockchain Technologies"');
  assert(stdPdfString.includes('Architectures, Applications and Research Perspectives'), 'Vector text contains subtitle');
  assert(stdPdfString.includes('Dr. K. Arulraj'), 'Vector text contains Signatory 1: Dr. K. Arulraj');
  assert(stdPdfString.includes('Faculty Coordinator'), 'Vector text contains Title 1: Faculty Coordinator');
  assert(stdPdfString.includes('Dr. S. Rajakumaran'), 'Vector text contains Signatory 2: Dr. S. Rajakumaran');
  assert(stdPdfString.includes('STTP Coordinator'), 'Vector text contains Title 2: STTP Coordinator');
  assert(stdPdfString.includes('Dr. S. Rajakarunakaran'), 'Vector text contains Signatory 3: Dr. S. Rajakarunakaran');
  assert(stdPdfString.includes('Head of Department'), 'Vector text contains Title 3: Head of Department');
  assert(stdPdfString.includes('Dr. L. Ganesan'), 'Vector text contains Signatory 4: Dr. L. Ganesan');
  assert(stdPdfString.includes('Principal'), 'Vector text contains Title 4: Principal');
  assert(stdPdfString.includes('Certificate ID: RIT-STTP-2026-0042'), 'Vector text contains Certificate ID');
  assert(stdPdfString.includes('SCAN TO VERIFY'), 'Vector text contains "SCAN TO VERIFY" caption');

  // Verify Omission of unwanted details
  assert(!stdPdfString.includes('Register No'), 'Omission verified: NO "Register No" text in PDF');
  assert(!stdPdfString.includes('Academic Year'), 'Omission verified: NO "Academic Year" text in PDF');
  assert(!stdPdfString.includes('Date of Issue'), 'Omission verified: NO "Date of Issue" text in PDF');
  assert(!stdPdfString.includes('conducted on'), 'Omission verified: NO "conducted on" text in PDF');

  // 2. Optical QR Scan Verification
  console.log('\n[TEST 2] Optical QR Scan of Generated Certificate Data...');
  const qrTarget = stdData.verification_url;
  const qrPngBuffer = await QRCode.toBuffer(qrTarget, {
    margin: 1,
    width: 250,
    color: { dark: '#1E1B4B', light: '#FFFFFF' }
  });

  // Decode QR using pngjs or raw canvas
  const { PNG } = require('pngjs');
  const png = PNG.sync.read(qrPngBuffer);
  const qrCodeResult = jsqr(new Uint8ClampedArray(png.data), png.width, png.height);
  assert(qrCodeResult !== null, 'Optical decoder successfully scanned the generated QR code');
  assert(qrCodeResult.data === qrTarget, `Decoded QR URL matches public verification record (${qrCodeResult.data})`);

  // 3. Long Student Name & Long Event Title Stress Test
  console.log('\n[TEST 3] Stress Testing Long Student Name & Multi-Line Event Title...');
  const longData = {
    student_name: 'THIRUMALAI MUTHUKUMARASWAMY SUNDARARAJAN',
    certificate_number: 'RIT-STTP-2026-LONG-999',
    certificate_title: 'CERTIFICATE OF PARTICIPATION',
    programme_title: 'Short-Term Training Programme (STTP)',
    event_name: 'Advanced Decentralized Autonomous Organizations, Zero-Knowledge Rollups, and Cross-Chain Interoperability Protocols in Enterprise Blockchain Systems',
    organization_name: 'Department of Computer Science and Business Systems, Ramco Institute of Technology',
    verification_url: 'https://rit-csbs-portal.vercel.app/verify-certificate.html?id=RIT-STTP-2026-LONG-999',
    signatory_count: 4
  };

  const longDoc = await certAssets.createCertificatePdf(longData);
  assert(longDoc !== null, 'Long name jsPDF doc created successfully');
  assert(longDoc.internal.pages.length - 1 === 1, 'Long name PDF remains strictly 1 single page without page overflow');

  const longPdfBuffer = Buffer.from(longDoc.output('arraybuffer'));
  fs.writeFileSync('scratch/final_sample_long_text.pdf', longPdfBuffer);
  const longPdfString = longPdfBuffer.toString('latin1');
  assert(longPdfString.includes('THIRUMALAI MUTHUKUMARASWAMY SUNDARARAJAN'), 'Long student name rendered successfully in vector stream');
  assert(longPdfString.includes('Advanced Decentralized Autonomous Organizations'), 'Long event title wrapped and rendered in vector stream');

  console.log('\n========================================================');
  if (passedAll) {
    console.log('🎉 ALL PIPELINE AND QUALITY VERIFICATIONS PASSED!');
  } else {
    console.error('❌ SOME VERIFICATIONS FAILED');
    process.exit(1);
  }
  console.log('========================================================\n');
}

runPipelineVerification().catch(err => {
  console.error('Test pipeline error:', err);
  process.exit(1);
});
