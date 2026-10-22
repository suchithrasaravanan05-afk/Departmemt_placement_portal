const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const QRCode = require('qrcode');
const feedbackCertificateStorage = require('../backend/feedbackCertificateStorage');

async function runTests() {
  console.log('=== STARTING END-TO-END CERTIFICATE GENERATION & VERIFICATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Unique Certificate ID Generation
  console.log('1. Testing Unique Certificate ID Generation...');
  const id1 = feedbackCertificateStorage.generateUniqueCertificateId('2026', 'CSBS', []);
  const id2 = feedbackCertificateStorage.generateUniqueCertificateId('2026', 'CSBS', [{ certificate_number: id1 }]);
  assert(id1.startsWith('RIT-CSBS-2026-'), `Certificate ID format correct: ${id1}`);
  assert(id1 !== id2, `Successive IDs are unique: ${id1} vs ${id2}`);
  assert(id1.length >= 18, `Certificate ID has sufficient entropy (length ${id1.length})`);

  // 2. Test Dynamic Academic Year handling (not hardcoded to 2026)
  const idFuture = feedbackCertificateStorage.generateUniqueCertificateId('2028-2029', 'CSBS', []);
  assert(idFuture.startsWith('RIT-CSBS-2028-2029-'), `Future academic year handled dynamically: ${idFuture}`);

  // 3. Test In-Memory & File Validation Engine
  console.log('\n2. Testing Validation Engine (Mandatory fields, dates, aliases, duplicates)...');
  const sampleRawRows = [
    // Valid row 1
    {
      'Student Name': 'Ananya R',
      'Register Number': '953621205001',
      'Department': 'Computer Science and Business Systems',
      'Academic Year': '2025-2026',
      'Event Name': 'National AI Hackathon 2026',
      'Event Date': '2026-03-15',
      'Participation Type': 'First Prize Winner',
      'Certificate Issue Date': '2026-03-20'
    },
    // Valid row 2 (header aliases: Name, Reg No, Achievement)
    {
      'Name': 'Karthik S',
      'Reg No': '953621205002',
      'Dept': 'CSBS',
      'Academic Year': '2025-2026',
      'Event': 'National AI Hackathon 2026',
      'Date': '15/03/2026',
      'Achievement': 'Special Mention',
      'Issue Date': '2026-03-20'
    },
    // Invalid row 3: Missing Student Name
    {
      'Student Name': '',
      'Register Number': '953621205003',
      'Department': 'CSBS',
      'Event Name': 'Cloud Computing Symposium',
      'Event Date': '2026-04-10'
    },
    // Invalid row 4: Invalid Date format
    {
      'Student Name': 'Deepak M',
      'Register Number': '953621205004',
      'Department': 'CSBS',
      'Event Name': 'Cloud Computing Symposium',
      'Event Date': 'invalid-date-xyz'
    },
    // Duplicate row 5: Duplicate of row 1 in same file
    {
      'Student Name': 'Ananya R',
      'Register Number': '953621205001',
      'Department': 'CSBS',
      'Event Name': 'National AI Hackathon 2026',
      'Event Date': '2026-03-15'
    }
  ];

  const validationResult = await feedbackCertificateStorage.validateBatchRecords(sampleRawRows);
  assert(validationResult.summary.totalRows === 5, `Total rows parsed: ${validationResult.summary.totalRows} (expected 5)`);
  assert(validationResult.summary.validCount === 2, `Valid rows count: ${validationResult.summary.validCount} (expected 2)`);
  assert(validationResult.summary.invalidCount === 2, `Invalid rows count: ${validationResult.summary.invalidCount} (expected 2)`);
  assert(validationResult.summary.duplicateCount === 1, `Intra-batch duplicate count: ${validationResult.summary.duplicateCount} (expected 1)`);
  
  // Verify error details on invalid rows
  const row3 = validationResult.records.find(r => r.rowNumber === 3);
  assert(row3 && !row3.isValid && row3.errors.some(e => e.includes('Student Name')), 'Row 3 correctly flagged for missing Student Name');
  
  const row4 = validationResult.records.find(r => r.rowNumber === 4);
  assert(row4 && !row4.isValid && row4.errors.some(e => e.includes('Invalid Event Date')), 'Row 4 correctly flagged for invalid date');

  const row5 = validationResult.records.find(r => r.rowNumber === 5);
  assert(row5 && row5.isDuplicate && row5.duplicateType === 'file', 'Row 5 correctly flagged as duplicate within uploaded file');

  // 4. Test Excel Spreadsheet Creation & Parsing
  console.log('\n3. Testing Excel File Creation & Parsing with Sanitization...');
  const testWb = xlsx.utils.book_new();
  const testWs = xlsx.utils.json_to_sheet([
    {
      'Student Name': '=cmd|/c calc!A0', // Formula injection attempt
      'Register Number': '953621205099',
      'Department': 'CSBS',
      'Academic Year': '2025-2026',
      'Event Name': 'Cyber Security Conclave',
      'Event Date': '2026-05-10',
      'Participation Type': 'Delegate'
    }
  ]);
  xlsx.utils.book_append_sheet(testWb, testWs, 'Template');
  const buffer = xlsx.write(testWb, { type: 'buffer', bookType: 'xlsx' });

  // Read back and verify sanitization
  const parsedWb = xlsx.read(buffer, { type: 'buffer' });
  const rawRows = xlsx.utils.sheet_to_json(parsedWb.Sheets[parsedWb.SheetNames[0]], { raw: false, defval: '' });
  const sanitizedValResult = await feedbackCertificateStorage.validateBatchRecords(rawRows);
  const sanitizedStudent = sanitizedValResult.records[0].studentName;
  assert(!sanitizedStudent.startsWith('='), `Formula injection sanitized: leading '=' removed/escaped -> "${sanitizedStudent}"`);

  // 5. Test Bulk Certificate Issuance
  console.log('\n4. Testing Bulk Certificate Issuance...');
  const testEventName = `TechPulse Symposium ${Date.now()}`;
  const validBatchRecords = [
    {
      studentName: 'Priya Dharshini K',
      registerNumber: '953621205010',
      department: 'Computer Science and Business Systems',
      academicYear: '2025-2026',
      eventName: testEventName,
      eventDate: '2026-04-12',
      participationType: 'First Place - Web Development Hackathon',
      certificateIssueDate: '2026-04-15'
    },
    {
      studentName: 'Suresh Kumar V',
      registerNumber: '953621205011',
      department: 'Computer Science and Business Systems',
      academicYear: '2025-2026',
      eventName: testEventName,
      eventDate: '2026-04-12',
      participationType: 'Certificate of Participation',
      certificateIssueDate: '2026-04-15'
    }
  ];

  const issueResult = await feedbackCertificateStorage.issueBulkCertificates({
    batchName: 'TechPulse 2026 - CSBS Batch 1',
    eventTitle: testEventName,
    certificateTitle: 'Certificate of Merit & Participation',
    issuer: { name: 'Dr. Placement Coordinator', email: 'coordinator@ritrjpm.ac.in', role: 'Faculty Coordinator' },
    records: validBatchRecords,
    signatories: {
      signatory1: { title: 'Faculty Coordinator', name: 'Dr. K. Vijayalakshmi' },
      signatory2: { title: 'Head of Department', name: 'Dr. M. Kaliappan' },
      signatory3: { title: 'Principal', name: 'Dr. L. Ganesan' }
    }
  });

  assert(issueResult.success === true, 'Bulk issuance succeeded');
  assert(issueResult.issuedCount === 2, `Issued count is 2 (got ${issueResult.issuedCount})`);
  assert(issueResult.batch && issueResult.batch.id, `Batch ID created: ${issueResult.batch ? issueResult.batch.id : 'N/A'}`);
  assert(issueResult.certificates.length === 2, 'Two certificates returned in result');

  const cert1 = issueResult.certificates[0];
  const cert2 = issueResult.certificates[1];
  console.log(`    Issued Cert 1: ID = ${cert1.certificate_number}, Student = ${cert1.student_name}`);
  console.log(`    Issued Cert 2: ID = ${cert2.certificate_number}, Student = ${cert2.student_name}`);
  assert(cert1.certificate_number !== cert2.certificate_number, 'Certificates have distinct unique IDs');
  assert(cert1.verification_status === 'VERIFIED', 'Certificate 1 has status VERIFIED');
  assert(cert1.signatory1_name === 'Dr. K. Vijayalakshmi', 'Signatory 1 stored properly');

  // 6. Test Prevent Duplicate Issuance on Repeated Generation
  console.log('\n5. Testing Duplicate Issuance Prevention Against Database...');
  const duplicateBatchAttempt = [
    {
      studentName: 'Priya Dharshini K',
      registerNumber: '953621205010',
      department: 'Computer Science and Business Systems',
      academicYear: '2025-2026',
      eventName: testEventName,
      eventDate: '2026-04-12',
      participationType: 'First Place - Web Development Hackathon',
      certificateIssueDate: '2026-04-15'
    }
  ];
  const reValidation = await feedbackCertificateStorage.validateBatchRecords(duplicateBatchAttempt);
  assert(reValidation.summary.duplicateCount === 1, 'Duplicate check flags existing student/event in database');
  assert(reValidation.records[0].duplicateType === 'database', 'Flagged specifically as database duplicate');

  // 7. Test QR Code Generation
  console.log('\n6. Testing QR Code Generation...');
  const verifyUrl = `http://localhost:5500/verify-certificate.html?id=${encodeURIComponent(cert1.certificate_number)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR code data URL generated successfully');
  assert(qrDataUrl.length > 500, `QR code payload has valid image size (${qrDataUrl.length} chars)`);

  // 8. Test Public Verification Endpoint (Privacy & Status Checks)
  console.log('\n7. Testing Public Verification API (Privacy & Sanitization)...');
  const pubVerify = await feedbackCertificateStorage.getPublicCertificateDetails(cert1.certificate_number);
  assert(pubVerify.found === true, 'Public verification found certificate');
  assert(pubVerify.status === 'VERIFIED', 'Status is VERIFIED');
  assert(pubVerify.certificate.studentName === 'Priya Dharshini K', 'Returns student name');
  assert(pubVerify.certificate.eventName === testEventName, 'Returns event name');
  assert(pubVerify.certificate.certificateNumber === cert1.certificate_number, 'Returns matching certificate ID');
  // Privacy check: registerNumber and sensitive internal db ids must NOT be exposed in public endpoint
  assert(!pubVerify.certificate.registerNumber, 'Privacy check: student registerNumber is NOT exposed publicly');
  assert(!pubVerify.certificate.studentEmail, 'Privacy check: student email is NOT exposed publicly');
  assert(!pubVerify.certificate.studentPhone, 'Privacy check: student phone is NOT exposed publicly');

  // Test Nonexistent Certificate ID
  const notFoundVerify = await feedbackCertificateStorage.getPublicCertificateDetails('RIT-CSBS-2026-NONEXISTENT123');
  assert(notFoundVerify.found === false, 'Non-existent certificate correctly returns found: false');
  assert(notFoundVerify.status === 'NOT_FOUND', 'Non-existent certificate status is NOT_FOUND');

  // 9. Test Certificate Revocation & Audit Logging
  console.log('\n8. Testing Certificate Revocation & Audit Trail...');
  const revokeResult = await feedbackCertificateStorage.revokeCertificate({
    certId: cert1.certificate_number,
    reason: 'Test administrative cancellation: Disciplinary committee update',
    issuer: { name: 'Admin Faculty', email: 'admin@ritrjpm.ac.in', role: 'Faculty Coordinator' }
  });
  assert(revokeResult.success === true, 'Revocation succeeded');

  // Re-verify publicly after revocation
  const revokedVerify = await feedbackCertificateStorage.getPublicCertificateDetails(cert1.certificate_number);
  assert(revokedVerify.found === true, 'Revoked certificate is found in records');
  assert(revokedVerify.status === 'REVOKED', 'Status changed to REVOKED');
  assert(revokedVerify.certificate.revocationReason.includes('Disciplinary'), 'Revocation reason included in verified response');

  // 10. Test Audit Log Entry
  const allData = await feedbackCertificateStorage.getAllData();
  const auditEntries = allData.certificate_audit_logs.filter(l => l.certificate_number === cert1.certificate_number || l.batch_id === issueResult.batch.id);
  assert(auditEntries.length >= 2, `Audit entries recorded for issuance and revocation (count: ${auditEntries.length})`);
  const revokeAudit = auditEntries.find(l => l.action === 'REVOKED');
  assert(revokeAudit && (revokeAudit.performed_by_name === 'Admin Faculty' || revokeAudit.actor_name === 'Admin Faculty'), 'Revocation audit log contains issuer name');

  // 11. Test Batch History Retrieval
  console.log('\n9. Testing Batch & Certificate Retrieval APIs...');
  const batches = await feedbackCertificateStorage.getCertificateBatches();
  assert(batches.length > 0, `Batches retrieved: ${batches.length}`);
  const batchCerts = await feedbackCertificateStorage.getBatchCertificates(issueResult.batch.id);
  assert(batchCerts.length === 2, `Certificates for batch retrieved: ${batchCerts.length} (expected 2)`);

  console.log('\n=======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
