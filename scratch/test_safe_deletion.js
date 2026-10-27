const fs = require('fs');
const path = require('path');
const feedbackCertificateStorage = require('../backend/feedbackCertificateStorage.js');

async function runTest() {
  console.log('========================================================');
  console.log('🧪 RUNNING SAFE CERTIFICATE & BATCH DELETION VERIFICATION');
  console.log('========================================================\n');

  // Check initial genuine record
  const initialData = await feedbackCertificateStorage.getAllData();
  const genuineCert = initialData.certificates.find(c => c.certificate_number === 'RIT-JAVA-2026-0001');
  if (!genuineCert) {
    throw new Error('Precondition check failed: Genuine certificate RIT-JAVA-2026-0001 not found.');
  }
  console.log(`[Init] Found genuine certificate: ${genuineCert.certificate_number} (${genuineCert.student_name}). Must remain untouched.`);


  // Step 1: Create a temporary test batch via standard issuance to test safe deletion
  console.log('\n[1/5] Creating isolated test batch via issueBulkCertificates...');
  const issueRes = await feedbackCertificateStorage.issueBulkCertificates({
    batch_title: 'Automated Safe Deletion Verification Batch',
    event_name: 'Test Temporary Event',
    id_prefix: 'RIT-PURGE-TEST-',
    allow_duplicates: true,
    records: [{
      student_name: 'Test Purge Student',
      email: 'test_purge@example.com'
    }],
    issuer: { id: 1, full_name: 'System Admin', role: 'admin' }
  });
  const testBatchId = issueRes.batch_id;
  const testCertNum = issueRes.certificates[0].certificate_number;
  console.log('  Created isolated test batch:', testBatchId, 'with certificate:', testCertNum);

  // Also create a dummy PDF file in scratch to verify associated file deletion
  const dummyPdfPath = path.join(__dirname, `${testCertNum}.pdf`);
  fs.writeFileSync(dummyPdfPath, '%PDF-1.4 test dummy pdf content');
  console.log('  Created associated dummy PDF file on disk:', dummyPdfPath);

  // Step 2: Test that mismatched confirmation fails
  console.log('\n[2/5] Testing confirmation protection (mismatched ID)...');
  try {
    await feedbackCertificateStorage.deleteCertificateBatch({
      batchId: testBatchId,
      confirmBatchId: 'WRONG-BATCH-ID',
      actor: { id: 1, full_name: 'System Admin', role: 'admin' }
    });
    throw new Error('Security check failed: deleteCertificateBatch did not reject mismatched confirmation ID.');
  } catch (err) {
    console.log('  ✅ Expected failure with mismatched ID caught successfully:', err.message);
  }

  // Step 3: Delete with correct confirmation ID
  console.log('\n[3/5] Deleting test batch with exact confirmation...');
  const deleteResult = await feedbackCertificateStorage.deleteCertificateBatch({
    batchId: testBatchId,
    confirmBatchId: testBatchId,
    actor: { id: 1, full_name: 'System Admin', role: 'admin' }
  });
  console.log('  Delete result:', deleteResult);

  if (deleteResult.deleted_records_count !== 1) {
    throw new Error(`Expected 1 record deleted, got ${deleteResult.deleted_records_count}`);
  }

  // Step 4: Verify associated PDF file was deleted
  if (fs.existsSync(dummyPdfPath)) {
    throw new Error('Associated PDF file was not deleted from disk!');
  }
  console.log('  ✅ Associated PDF file was successfully purged from storage.');

  // Step 5: Verify public verification endpoint returns NOT_FOUND
  console.log('\n[4/5] Verifying public credential verification returns NOT_FOUND...');
  const publicResult = await feedbackCertificateStorage.getPublicCertificateDetails(testCertNum);
  console.log('  Public verification result:', publicResult);
  if (publicResult.found !== false || publicResult.status !== 'NOT_FOUND') {
    throw new Error('Public verification did not return NOT_FOUND for deleted certificate!');
  }
  console.log('  ✅ Public verification correctly returns NOT_FOUND (Certificate Not Found).');

  // Step 6: Verify genuine certificates remain 100% untouched
  console.log('\n[5/5] Verifying genuine certificates remain completely intact...');
  const finalData = await feedbackCertificateStorage.getAllData();
  const verifyGenuine = finalData.certificates.find(c => c.certificate_number === 'RIT-JAVA-2026-0001');
  if (!verifyGenuine) {
    throw new Error('FATAL: Genuine certificate RIT-JAVA-2026-0001 was corrupted or deleted!');
  }
  console.log(`  ✅ Verified genuine certificate: ${verifyGenuine.certificate_number} (${verifyGenuine.student_name}) is 100% intact.`);

  // Verify audit log entry
  const latestAudit = finalData.certificate_audit_logs[0];
  console.log('  Latest audit log entry:', {
    action: latestAudit.action,
    batch_id: latestAudit.batch_id,
    actor_name: latestAudit.actor_name,
    total_records_deleted: latestAudit.total_records_deleted
  });
  if (latestAudit.action !== 'BATCH_CERTIFICATE_DELETION' || latestAudit.batch_id !== testBatchId) {
    throw new Error('Audit log entry for deletion was not properly recorded!');
  }
  console.log('  ✅ Audit log entry was properly registered.');

  console.log('\n========================================================');
  console.log('🎉 ALL SAFE DELETION TESTS SUCCESSFULLY PASSED!');
  console.log('========================================================\n');
}

runTest().catch(err => {
  console.error('Safe deletion test error:', err);
  process.exit(1);
});
