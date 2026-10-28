const fs = require('fs');
const path = require('path');
const { createCertificatePdf } = require('../frontend/certificate_assets.js');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');

async function main() {
  console.log('====================================================');
  console.log('🚀 RUNNING FINAL ACCEPTANCE & PRODUCTION VERIFICATION');
  console.log('====================================================');

  // 1. Generate real certificate PDF for standard name
  console.log('\n[1/5] Generating standard certificate PDF...');
  const cert1 = await createCertificatePdf({
    participant_name: 'Keerthana Mohan',
    certificate_number: 'RIT-STTP-2026-FINAL',
    programme_title: 'One Week Short-Term Training Programme (STTP)',
    event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
    department: 'Department of Computer Science and Business Systems',
    college_name: 'Ramco Institute of Technology, Rajapalayam',
    programme_dates: 'October 12, 2026, to October 18, 2026',
    signatory_1_name: 'Dr. M. Jeya Sundari',
    signatory_2_name: 'Ms. M. Rekha',
    signatory_3_name: 'Mr. M. Rama Krishnan',
    signatory_4_name: 'Dr. D. Kesavaraja',
    signatory_5_name: 'Dr. S. Rajakarunakaran',
    signatory_6_name: 'Dr. L. Ganesan'
  });

  const pdfBuf1 = Buffer.from(cert1.output('arraybuffer'));
  fs.writeFileSync('scratch/final_acceptance_cert.pdf', pdfBuf1);
  console.log('  ✅ Standard certificate PDF generated:', pdfBuf1.length, 'bytes');

  // 2. Generate long name certificate PDF
  console.log('\n[2/5] Generating long-name certificate PDF for typography & scaling test...');
  const cert2 = await createCertificatePdf({
    participant_name: 'Dr. Sivaranjani Krishnamoorthy Ananthapadmanabhan',
    certificate_number: 'RIT-STTP-2026-LONG',
    programme_title: 'One Week Short-Term Training Programme (STTP)',
    event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
    department: 'Department of Computer Science and Business Systems',
    college_name: 'Ramco Institute of Technology, Rajapalayam',
    programme_dates: 'October 12, 2026, to October 18, 2026'
  });

  const pdfBuf2 = Buffer.from(cert2.output('arraybuffer'));
  fs.writeFileSync('scratch/final_acceptance_cert_long.pdf', pdfBuf2);
  console.log('  ✅ Long-name certificate PDF generated:', pdfBuf2.length, 'bytes');

  // 3. Render PDF to PNG using python script with pypdfium2
  console.log('\n[3/5] Rendering generated PDF to high-resolution PNG...');
  const { execSync } = require('child_process');
  execSync('python -c "import pypdfium2 as pdfium; doc = pdfium.PdfDocument(\'scratch/final_acceptance_cert.pdf\'); page = doc[0]; pil_img = page.render(scale=3).to_pil(); pil_img.save(\'scratch/final_acceptance_cert.png\'); print(\'Rendered successfully:\', pil_img.size)"', { stdio: 'inherit' });

  // 4. Decode QR code optically from the rendered image
  console.log('\n[4/5] Optically decoding QR Code from rendered image...');
  const pngData = fs.readFileSync('scratch/final_acceptance_cert.png');
  const png = PNG.sync.read(pngData);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  if (code && code.data) {
    console.log('  ✅ Optical QR decode SUCCESS! Target URL:', code.data);
    if (code.data === 'RIT-STTP-2026-FINAL' || code.data.includes('RIT-STTP-2026-FINAL')) {
      console.log('  ✅ Verification ID format is verified and accurate.');
    } else {
      throw new Error('Unexpected QR URL or ID: ' + code.data);
    }
  } else {
    throw new Error('QR code optical decode failed on rendered certificate image.');
  }

  // 5. Verify text searchability and extraction
  console.log('\n[5/5] Verifying text extraction & searchability from PDF...');
  const textOutput = execSync('python -c "import pypdfium2 as pdfium; doc = pdfium.PdfDocument(\'scratch/final_acceptance_cert.pdf\'); textpage = doc[0].get_textpage(); print(textpage.get_text_range())"', { encoding: 'utf8' });
  console.log('  Extracted Text Sample:');
  console.log('  ----------------------------------------------------');
  console.log(textOutput.trim().split('\n').map(l => '  ' + l).join('\n'));
  console.log('  ----------------------------------------------------');

  const requiredPhrases = [
    'RAMCO INSTITUTE OF TECHNOLOGY',
    'CERTIFICATE OF PARTICIPATION',
    'This is to certify that',
    'Keerthana Mohan',
    'Emerging Blockchain Technologies',
    'Department of Computer Science and Business Systems',
    'Faculty Coordinator',
    'Dr. M. Jeya Sundari',
    'Ms. M. Rekha',
    'Mr. M. Rama Krishnan',
    'Convenor',
    'Dr. D. Kesavaraja',
    'Patron',
    'Dr. S. Rajakarunakaran',
    'Chief Patron',
    'Dr. L. Ganesan',
    'RIT-STTP-2026-FINAL'
  ];

  for (const phrase of requiredPhrases) {
    if (!textOutput.includes(phrase)) {
      throw new Error(`Searchable text check failed: Missing phrase "${phrase}"`);
    }
  }
  console.log('  ✅ All key text phrases are completely selectable, searchable, and intact in the PDF!');

  console.log('\n====================================================');
  console.log('🎉 ALL FINAL ACCEPTANCE CRITERIA SUCCESSFULLY PASSED!');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
