const http = require('http');
const app = require('../backend/server');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const feedbackCertificateStorage = require('../backend/feedbackCertificateStorage');

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

async function run() {
  console.log('=== RUNNING CERTIFICATE GENERATOR & PERMISSIONS COMPREHENSIVE SUITE ===');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  const adminToken = jwt.sign({
    id: 'test-admin-001',
    name: 'Placement Administrator',
    role: 'admin',
    department: 'Placement Cell'
  }, JWT_SECRET, { expiresIn: '8h' });

  const facultyToken = jwt.sign({
    id: 'test-fac-001',
    name: 'Dr. Faculty Coordinator',
    role: 'faculty_coordinator',
    department: 'CSBS'
  }, JWT_SECRET, { expiresIn: '8h' });

  const jaToken = jwt.sign({
    id: 'test-ja-001',
    name: 'JA Faculty Member',
    role: 'ja_faculty',
    department: 'CSBS'
  }, JWT_SECRET, { expiresIn: '8h' });

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

  try {
    // -------------------------------------------------------------
    // TEST 1: 10 DISTINCT SAMPLE NAMES VALIDATION (0 FALSE DUPLICATES)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing 10 Distinct Sample Students (No Register Numbers, Shared Event)...');
    const tenDistinctNames = [
      "Aravind Swamy K",
      "Bhavani Shankar T",
      "Chandrasekar M",
      "Deepa Lakshmi V",
      "Elango Pandian S",
      "Fathima Banu A",
      "Gowtham Raj R",
      "Hari Prasath B",
      "Indhuja Devi P",
      "Jeeva Kumar C"
    ];

    const testEvent = "Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives";

    const tenRecords = tenDistinctNames.map((name) => ({
      student_name: name,
      department: "Computer Science and Business Systems",
      event_name: testEvent,
      participation_type: "Participation"
    }));

    const valResult = await feedbackCertificateStorage.validateBatchRecords(tenRecords);
    assert(valResult.total_records === 10, 'Total records processed is 10');
    assert(valResult.valid_records === 10, `All 10 distinct students are VALID (Got ${valResult.valid_records})`);
    assert(valResult.duplicate_records === 0, `ZERO false duplicates flagged for 10 distinct students (Got ${valResult.duplicate_records})`);
    assert(valResult.invalid_records === 0, `ZERO invalid records flagged (Got ${valResult.invalid_records})`);

    // -------------------------------------------------------------
    // TEST 2: GENUINE DUPLICATE DETECTION (IN-FILE & IN-DATABASE)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Genuine Duplicate Detection...');
    const duplicateBatch = [
      {
        student_name: "Aravind Swamy K",
        department: "Computer Science and Business Systems",
        event_name: testEvent,
        participation_type: "Participation"
      },
      {
        student_name: "Bhavani Shankar T",
        department: "Computer Science and Business Systems",
        event_name: testEvent,
        participation_type: "Participation"
      },
      {
        student_name: "Aravind Swamy K", // Duplicate of row 1 in same file!
        department: "Computer Science and Business Systems",
        event_name: testEvent,
        participation_type: "Participation"
      }
    ];

    const dupValResult = await feedbackCertificateStorage.validateBatchRecords(duplicateBatch);
    assert(dupValResult.total_records === 3, 'Total records is 3');
    assert(dupValResult.duplicate_records === 1, `Exactly 1 duplicate flagged (Got ${dupValResult.duplicate_records})`);
    assert(dupValResult.records[0].is_duplicate === false, 'Row 1 is valid (not duplicate)');
    assert(dupValResult.records[1].is_duplicate === false, 'Row 2 is valid (not duplicate)');
    assert(dupValResult.records[2].is_duplicate === true, 'Row 3 is flagged as DUPLICATE');
    assert(dupValResult.records[2].duplicate_type === 'file', 'Duplicate type is "file"');

    // -------------------------------------------------------------
    // TEST 3: ROLE AUTHORIZATION — ADMINISTRATOR ISSUANCE
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Administrator Role Permission on /issue-batch...');
    const adminBatchPayload = {
      batch_title: 'Admin STTP Blockchain Batch',
      event_name: testEvent,
      certificate_title: 'CERTIFICATE OF PARTICIPATION',
      certificate_type: 'Participation',
      programme_title: 'One Week STTP',
      id_prefix: 'RIT-STTP-2026',
      signatory_count: 5,
      allow_duplicates: true,
      records: [
        {
          student_name: 'Chandrasekar M',
          department: 'Computer Science and Business Systems',
          event_name: testEvent,
          participation_type: 'Participation',
          is_valid: true
        }
      ]
    };

    const adminRes = await fetch(`${baseUrl}/api/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(adminBatchPayload)
    });

    const adminData = await adminRes.json();
    assert(adminRes.status === 200, `Administrator can generate certificates (HTTP ${adminRes.status})`);
    assert(adminData.success === true, 'Administrator issuance returned success: true');
    assert(adminData.total_issued === 1, 'Admin issued 1 certificate successfully');

    // -------------------------------------------------------------
    // TEST 4: ROLE AUTHORIZATION — FACULTY COORDINATOR ISSUANCE
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Faculty Coordinator Role Permission on /issue-batch...');
    const facBatchPayload = {
      batch_title: 'Faculty STTP Blockchain Batch',
      event_name: testEvent,
      certificate_title: 'CERTIFICATE OF PARTICIPATION',
      certificate_type: 'Participation',
      programme_title: 'One Week STTP',
      id_prefix: 'RIT-STTP-2026',
      signatory_count: 5,
      allow_duplicates: true,
      records: [
        {
          student_name: 'Deepa Lakshmi V',
          department: 'Computer Science and Business Systems',
          event_name: testEvent,
          participation_type: 'Participation',
          is_valid: true
        }
      ]
    };

    const facRes = await fetch(`${baseUrl}/api/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`
      },
      body: JSON.stringify(facBatchPayload)
    });

    const facData = await facRes.json();
    assert(facRes.status === 200, `Faculty Coordinator can generate certificates (HTTP ${facRes.status})`);
    assert(facData.success === true, 'Faculty Coordinator issuance returned success: true');

    // -------------------------------------------------------------
    // TEST 5: ROLE AUTHORIZATION — UNAUTHORIZED ROLE BLOCKED
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Unauthorized Roles are Blocked...');
    const jaRes = await fetch(`${baseUrl}/api/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jaToken}`
      },
      body: JSON.stringify(facBatchPayload)
    });

    assert(jaRes.status === 403, `JA Faculty is BLOCKED from generating certificates (Got HTTP ${jaRes.status})`);
    const jaData = await jaRes.json();
    assert(jaData.success === false, 'JA Faculty response has success: false');

    const anonRes = await fetch(`${baseUrl}/api/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facBatchPayload)
    });
    assert(anonRes.status === 401, `Unauthenticated request is BLOCKED (Got HTTP ${anonRes.status})`);

    // -------------------------------------------------------------
    // TEST 6: PUBLIC VERIFICATION PRIVACY (NO REGISTER NUMBER)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Public Verification & Privacy Safeguards...');
    const issuedCert = adminData.certificates[0];
    const pubVerifyRes = await fetch(`${baseUrl}/api/public/verify-certificate/${encodeURIComponent(issuedCert.certificate_number)}`);
    const pubVerifyData = await pubVerifyRes.json();

    assert(pubVerifyRes.status === 200, 'Public verification API returns HTTP 200');
    assert(pubVerifyData.success === true && pubVerifyData.found === true, 'Certificate is found in registry');
    assert(pubVerifyData.certificate?.student_name === 'Chandrasekar M', 'Student name is exposed');
    assert(pubVerifyData.certificate?.register_number === undefined, 'CRITICAL: register_number is NOT in public verification response');

    // -------------------------------------------------------------
    // TEST 7: DOWNLOADABLE EXCEL TEMPLATE HAS NO REG NO / DATES
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Template Download Headers...');
    const tplDlRes = await fetch(`${baseUrl}/api/admin/certificate-generation/template-download`);
    assert(tplDlRes.status === 200, 'Template download returns HTTP 200');
    const tplBuffer = await tplDlRes.arrayBuffer();
    const wb = xlsx.read(Buffer.from(tplBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
    console.log('  Downloaded template headers:', headers);

    assert(headers.includes('Student Name'), 'Template contains "Student Name"');
    assert(headers.includes('Department'), 'Template contains "Department"');
    assert(!headers.includes('Register Number'), 'Template does NOT contain "Register Number"');
    assert(!headers.includes('Academic Year'), 'Template does NOT contain "Academic Year"');
    assert(!headers.includes('Certificate Issue Date'), 'Template does NOT contain "Certificate Issue Date"');

    // -------------------------------------------------------------
    // TEST 8: REVOCATION CAPABILITY FOR ADMIN
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Administrator Revocation Permission...');
    const revokeRes = await fetch(`${baseUrl}/api/admin/certificate-generation/revoke/${encodeURIComponent(issuedCert.certificate_number)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Audit cancellation test' })
    });
    const revokeData = await revokeRes.json();
    assert(revokeRes.status === 200, 'Administrator can revoke certificate (HTTP 200)');
    assert(revokeData.success === true, 'Revocation success: true');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n=======================================================`);
  console.log(`SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
