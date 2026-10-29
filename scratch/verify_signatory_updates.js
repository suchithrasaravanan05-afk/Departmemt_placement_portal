const fs = require('fs');
const path = require('path');
const { createCertificatePdf, drawRitCertificate, getSignatoryAsset } = require('../frontend/certificate_assets.js');

async function runTests() {
  console.log('=== TEST SUITE: SIGNATORY NAME DYNAMIC UPDATE VERIFICATION ===\n');
  let allPassed = true;

  // Test 1: User reported issue - Mrs. M. Rekha
  console.log('--- Test 1: Verifying Mrs. M. Rekha appears on generated PDF ---');
  const certData1 = {
    participant_name: 'John Doe',
    signatory_2_name: 'Mrs. M. Rekha',
    certificate_number: 'RITCB 01 0001'
  };

  const doc1 = await createCertificatePdf(certData1);
  const pdfStr1 = doc1.output();
  fs.writeFileSync(path.join(__dirname, 'test_output_mrs_rekha.pdf'), Buffer.from(doc1.output('arraybuffer')));

  const containsMrs = pdfStr1.includes('Mrs. M. Rekha');
  const containsMs = pdfStr1.includes('Ms. M. Rekha');

  if (containsMrs && !containsMs) {
    console.log('✔ PASS: "Mrs. M. Rekha" is rendered in the PDF.');
    console.log('✔ PASS: Outdated "Ms. M. Rekha" is NOT present in the PDF.');
  } else {
    console.error(`✖ FAIL: containsMrs=${containsMrs}, containsMs=${containsMs}`);
    allPassed = false;
  }

  // Test 2: Arbitrary name for Signatory 2
  console.log('\n--- Test 2: Verifying arbitrary custom name for Signatory 2 ---');
  const certData2 = {
    participant_name: 'Jane Smith',
    signatory_2_name: 'Prof. Rekha Murugesan',
    certificate_number: 'RITCB 01 0002'
  };

  const doc2 = await createCertificatePdf(certData2);
  const pdfStr2 = doc2.output();
  fs.writeFileSync(path.join(__dirname, 'test_output_arbitrary_sig2.pdf'), Buffer.from(doc2.output('arraybuffer')));

  if (pdfStr2.includes('Prof. Rekha Murugesan')) {
    console.log('✔ PASS: Arbitrary name "Prof. Rekha Murugesan" is rendered in the PDF.');
  } else {
    console.error('✖ FAIL: "Prof. Rekha Murugesan" not found in PDF output.');
    allPassed = false;
  }

  // Test 3: Dynamic updates across ALL 6 signatories simultaneously
  console.log('\n--- Test 3: Verifying dynamic updates for all 6 signatories ---');
  const customNames = [
    'Dr. Alpha One',
    'Mrs. Beta Two',
    'Mr. Gamma Three',
    'Dr. Delta Four',
    'Dr. Epsilon Five',
    'Dr. Zeta Six'
  ];

  const certData3 = {
    participant_name: 'Participant All Sigs',
    certificate_number: 'RITCB 01 0003',
    signatory_count: 6,
    signatory_1_name: customNames[0],
    signatory_2_name: customNames[1],
    signatory_3_name: customNames[2],
    signatory_4_name: customNames[3],
    signatory_5_name: customNames[4],
    signatory_6_name: customNames[5]
  };

  const doc3 = await createCertificatePdf(certData3);
  const pdfStr3 = doc3.output();
  fs.writeFileSync(path.join(__dirname, 'test_output_all_6_custom_sigs.pdf'), Buffer.from(doc3.output('arraybuffer')));

  let all6InPdf = true;
  customNames.forEach((name, idx) => {
    const present = pdfStr3.includes(name);
    if (present) {
      console.log(`  ✔ Signatory ${idx + 1} ("${name}") correctly rendered.`);
    } else {
      console.error(`  ✖ Signatory ${idx + 1} ("${name}") MISSING in PDF.`);
      all6InPdf = false;
    }
  });

  if (all6InPdf) {
    console.log('✔ PASS: All 6 dynamic signatory names rendered correctly without overrides.');
  } else {
    allPassed = false;
  }

  // Test 4: Verify default signature assets are preserved when custom names don't match default role keywords
  console.log('\n--- Test 4: Verifying signature graphics lookup resilience ---');
  for (let i = 1; i <= 6; i++) {
    const defaultRoles = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakarunakaran', 'ganesan'];
    const asset = getSignatoryAsset(defaultRoles[i - 1]);
    if (asset && asset.startsWith('data:image/png;base64,')) {
      console.log(`  ✔ Slot ${i} default signature asset resolved (${asset.length} chars).`);
    } else {
      console.error(`  ✖ Slot ${i} signature asset resolution failed!`);
      allPassed = false;
    }
  }

  console.log('\n===============================================================');
  if (allPassed) {
    console.log('🎉 ALL SIGNATORY UPDATE VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
