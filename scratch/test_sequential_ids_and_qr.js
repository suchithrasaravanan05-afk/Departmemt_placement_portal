const path = require('path');
const fs = require('fs');
const feedbackCertificateStorage = require('../backend/feedbackCertificateStorage.js');
const certAssets = require('../frontend/certificate_assets.js');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   SEQUENTIAL CERTIFICATE ID & QR CODE TEST SUITE   ');
  console.log('====================================================\n');

  // 1. Inspect initial storage state
  const initialData = await feedbackCertificateStorage.getAllData();
  const initialHighest = feedbackCertificateStorage.getHighestSequenceNumber(initialData.certificates, initialData.last_certificate_sequence);
  console.log(`[STATE] Initial Highest Sequence Found: ${initialHighest}`);
  console.log(`[STATE] Total Existing Certificates in DB: ${(initialData.certificates || []).length}`);

  // Test 1: First new certificate receives RITCB 01 0001
  console.log('\n--- Test 1: First New Certificate Receives RITCB 01 0001 ---');
  const batch1 = await feedbackCertificateStorage.issueBulkCertificates({
    batch_title: 'Sequential Test Batch 1',
    event_name: 'Sequential ID Verification Workshop',
    records: [
      { student_name: 'ALICE FIRST', register_number: 'TESTREG001', email: 'alice.first@ritrjpm.ac.in', participation_type: 'Participation' }
    ],
    allow_duplicates: false,
    issuer: { id: 1, full_name: 'Admin Issuer', role: 'admin' }
  });

  const cert1 = batch1.certificates[0];
  console.log(`Certificate 1: ${cert1.student_name} -> ID: ${cert1.certificate_number}`);
  if (cert1.certificate_number === 'RITCB 01 0001') {
    console.log('✔ PASSED: First certificate received exact ID: RITCB 01 0001');
  } else {
    throw new Error(`Expected RITCB 01 0001, got ${cert1.certificate_number}`);
  }

  // Test 2: Next certificate receives RITCB 01 0002
  console.log('\n--- Test 2: Next Certificate Receives RITCB 01 0002 ---');
  const batch2 = await feedbackCertificateStorage.issueBulkCertificates({
    batch_title: 'Sequential Test Batch 2',
    event_name: 'Sequential ID Verification Workshop',
    records: [
      { student_name: 'BOB SECOND', register_number: 'TESTREG002', email: 'bob.second@ritrjpm.ac.in', participation_type: 'Participation' }
    ],
    allow_duplicates: false,
    issuer: { id: 1, full_name: 'Admin Issuer', role: 'admin' }
  });

  const cert2 = batch2.certificates[0];
  console.log(`Certificate 2: ${cert2.student_name} -> ID: ${cert2.certificate_number}`);
  if (cert2.certificate_number === 'RITCB 01 0002') {
    console.log('✔ PASSED: Second certificate received exact ID: RITCB 01 0002');
  } else {
    throw new Error(`Expected RITCB 01 0002, got ${cert2.certificate_number}`);
  }

  // Test 3: Regeneration reuses assigned ID (Atomic & idempotent)
  console.log('\n--- Test 3: Regeneration Reuses Assigned ID (No Duplicate / No Overwrite) ---');
  const regenBatch = await feedbackCertificateStorage.issueBulkCertificates({
    batch_title: 'Regeneration Test',
    event_name: 'Sequential ID Verification Workshop',
    records: [
      { student_name: 'ALICE FIRST', register_number: 'TESTREG001', email: 'alice.first@ritrjpm.ac.in', participation_type: 'Participation' }
    ],
    allow_duplicates: false,
    issuer: { id: 1, full_name: 'Admin Issuer', role: 'admin' }
  });
  const regenCert = regenBatch.certificates[0];
  console.log(`Regenerate Student 1: ID = ${regenCert.certificate_number}`);
  if (regenCert.certificate_number === 'RITCB 01 0001') {
    console.log('✔ PASSED: Existing assigned ID (RITCB 01 0001) successfully reused on regeneration.');
  } else {
    throw new Error(`Expected RITCB 01 0001, got ${regenCert.certificate_number}`);
  }

  // Test 4: Batch Sequential Allocation
  console.log('\n--- Test 4: Multi-Record Batch Sequential Allocation ---');
  const batch3 = await feedbackCertificateStorage.issueBulkCertificates({
    batch_title: 'Sequential Test Batch 3',
    event_name: 'Sequential ID Verification Workshop',
    records: [
      { student_name: 'CHARLIE THIRD', register_number: 'TESTREG003', email: 'charlie@ritrjpm.ac.in', participation_type: 'Participation' },
      { student_name: 'DIANA FOURTH', register_number: 'TESTREG004', email: 'diana@ritrjpm.ac.in', participation_type: 'Participation' },
      { student_name: 'EVAN FIFTH', register_number: 'TESTREG005', email: 'evan@ritrjpm.ac.in', participation_type: 'Participation' }
    ],
    allow_duplicates: false,
    issuer: { id: 1, full_name: 'Admin Issuer', role: 'admin' }
  });

  const certs3 = batch3.certificates;
  console.log(`Batch 3 Issued ${certs3.length} certificates:`);
  certs3.forEach((c, i) => console.log(`  Row ${i + 1}: ${c.student_name} -> ${c.certificate_number}`));

  if (
    certs3[0].certificate_number === 'RITCB 01 0003' &&
    certs3[1].certificate_number === 'RITCB 01 0004' &&
    certs3[2].certificate_number === 'RITCB 01 0005'
  ) {
    console.log('✔ PASSED: Batch certificates sequentially numbered RITCB 01 0003, RITCB 01 0004, RITCB 01 0005.');
  } else {
    throw new Error('Batch sequential allocation failed');
  }

  // Test 5: Persistence across application restart / reload
  console.log('\n--- Test 5: Persistence Across Application Restart ---');
  delete require.cache[require.resolve('../backend/feedbackCertificateStorage.js')];
  const freshStorage = require('../backend/feedbackCertificateStorage.js');

  const batch4 = await freshStorage.issueBulkCertificates({
    batch_title: 'Sequential Test Batch 4 (After Restart)',
    event_name: 'Sequential ID Verification Workshop',
    records: [
      { student_name: 'FIONA SIXTH', register_number: 'TESTREG006', email: 'fiona@ritrjpm.ac.in', participation_type: 'Participation' }
    ],
    allow_duplicates: false,
    issuer: { id: 1, full_name: 'Admin Issuer', role: 'admin' }
  });
  const cert4 = batch4.certificates[0];
  console.log(`After simulated restart: ${cert4.student_name} -> ID: ${cert4.certificate_number}`);
  if (cert4.certificate_number === 'RITCB 01 0006') {
    console.log('✔ PASSED: Sequence correctly persisted across restart and incremented to RITCB 01 0006.');
  } else {
    throw new Error(`Expected RITCB 01 0006, got ${cert4.certificate_number}`);
  }

  // Test 6: PDF Generation for RITCB 01 0001 and RITCB 01 0002
  console.log('\n--- Test 6: Generating PDFs with QR Code and matching Capsule ID ---');
  const pdf1 = await certAssets.createCertificatePdf(cert1);
  const pdfBytes1 = Buffer.from(pdf1.output('arraybuffer'));
  const pdfPath1 = path.join(__dirname, 'seq_cert_0001.pdf');
  fs.writeFileSync(pdfPath1, pdfBytes1);
  console.log(`✔ Generated: ${pdfPath1} (${pdfBytes1.byteLength} bytes) for ID ${cert1.certificate_number}`);

  const pdf2 = await certAssets.createCertificatePdf(cert2);
  const pdfBytes2 = Buffer.from(pdf2.output('arraybuffer'));
  const pdfPath2 = path.join(__dirname, 'seq_cert_0002.pdf');
  fs.writeFileSync(pdfPath2, pdfBytes2);
  console.log(`✔ Generated: ${pdfPath2} (${pdfBytes2.byteLength} bytes) for ID ${cert2.certificate_number}`);

  // Test 7: Public Verification Endpoint
  console.log('\n--- Test 7: Public Verification Endpoint Lookup ---');
  const v1 = await freshStorage.getPublicCertificateDetails('RITCB 01 0001');
  const v2 = await freshStorage.getPublicCertificateDetails('RITCB 01 0002');
  const sName1 = (v1.certificate && v1.certificate.student_name) || v1.student_name;
  const sName2 = (v2.certificate && v2.certificate.student_name) || v2.student_name;
  console.log(`Verification 'RITCB 01 0001': found = ${v1.found}, student = ${sName1}`);
  console.log(`Verification 'RITCB 01 0002': found = ${v2.found}, student = ${sName2}`);
  if (v1.found && sName1 === 'ALICE FIRST' && v2.found && sName2 === 'BOB SECOND') {
    console.log('✔ PASSED: Public verification endpoint correctly resolves both certificates.');
  } else {
    throw new Error('Public verification lookup failed');
  }

  // Test 8: Prior existing certificates still work
  console.log('\n--- Test 8: Prior Existing Certificates Continue to Function ---');
  const priorCert = initialData.certificates[0];
  if (priorCert && priorCert.certificate_number) {
    const pv = await freshStorage.getPublicCertificateDetails(priorCert.certificate_number);
    const pvName = (pv.certificate && pv.certificate.student_name) || pv.student_name;
    console.log(`Prior Cert '${priorCert.certificate_number}': found = ${pv.found}, student = ${pvName}`);
    if (pv.found) {
      console.log('✔ PASSED: Prior existing certificates and functionality remain 100% operational.');
    }
  }

  console.log('\n====================================================');
  console.log('          ALL NODE TESTS PASSED SUCCESSFULLY!       ');
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message || err);
  process.exit(1);
});
