const http = require('http');
const app = require('../backend/server');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

async function run() {
  console.log('=== RUNNING CUSTOMIZABLE CERTIFICATE GENERATOR E2E TEST ===');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  const facultyToken = jwt.sign({
    id: 'test-fac-001',
    name: 'Dr. Faculty Coordinator',
    role: 'faculty_coordinator',
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
    // 1. Test GET /api/admin/certificate-generation/templates
    console.log('\n[TEST 1] Testing Template Presets API...');
    const tplRes = await fetch(`${baseUrl}/api/admin/certificate-generation/templates`, {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    const tplData = await tplRes.json();
    assert(tplData.success === true, 'GET /templates returns success: true');
    assert(Array.isArray(tplData.templates) && tplData.templates.length >= 1, `Found ${tplData.templates?.length} templates`);
    const sttpTpl = tplData.templates?.find(t => t.id === 'sttp_blockchain_2026' || t.id === 'tpl_sttp_blockchain_2026');
    assert(!!sttpTpl, 'Initial STTP Blockchain 2026 template is available');
    assert(sttpTpl?.signatory_count === 5, 'STTP template defaults to 5 signatories');

    // 2. Issue a batch with 5 signatories & custom STTP wording
    console.log('\n[TEST 2] Testing Issue Batch with 5 Signatories...');
    const batchPayload = {
      batch_title: 'STTP Blockchain Technologies Batch 1',
      event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
      event_date: '2026-10-12',
      academic_year: '2026-27',
      certificate_title: 'CERTIFICATE OF PARTICIPATION',
      certificate_type: 'STTP',
      programme_title: 'Short-Term Training Programme (STTP)',
      programme_dates: '10 – 12 October 2026',
      certificate_wording: 'This certificate is proudly presented to [STUDENT NAME] in recognition of active participation in the Short-Term Training Programme (STTP) on ‘Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives’, organized by the Department of Computer Science and Business Systems, Ramco Institute of Technology.',
      id_prefix: 'RIT-STTP-2026',
      signatory_count: 5,
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
      signatory_4_dept: 'RIT',
      signatory_5_name: 'Dr. R. Ramesh',
      signatory_5_title: 'Director',
      signatory_5_dept: 'RIT',
      allow_duplicates: true,
      records: [
        {
          student_name: 'Sivaranjani S',
          register_number: '953623244001',
          department: 'Computer Science and Business Systems',
          college_name: 'Ramco Institute of Technology',
          is_valid: true
        },
        {
          student_name: 'Suchithra S',
          register_number: '953623244002',
          department: 'Computer Science and Business Systems',
          college_name: 'Ramco Institute of Technology',
          is_valid: true
        }
      ]
    };

    const issueRes = await fetch(`${baseUrl}/api/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`
      },
      body: JSON.stringify(batchPayload)
    });
    const issueData = await issueRes.json();
    assert(issueData.success === true, 'Issue batch succeeds with HTTP 200');
    assert(issueData.total_issued === 2, 'Issued exactly 2 certificates');
    assert(Array.isArray(issueData.certificates) && issueData.certificates.length === 2, '2 certificate objects returned');

    const firstCert = issueData.certificates[0];
    assert(firstCert.student_name === 'Sivaranjani S', 'First certificate student name matches');
    assert(firstCert.certificate_number.startsWith('RIT-STTP-2026-'), `Certificate ID format matches prefix: ${firstCert.certificate_number}`);
    assert(firstCert.signatory_count === 5, 'Certificate reflects 5 signatories');
    assert(firstCert.signatory_5_name === 'Dr. R. Ramesh', 'Signatory 5 name stored correctly');

    // 3. Test Privacy & Public Verification
    console.log('\n[TEST 3] Testing Public Verification & Privacy Safeguards...');
    const verifyRes = await fetch(`${baseUrl}/api/public/verify-certificate/${encodeURIComponent(firstCert.certificate_number)}`);
    const verifyData = await verifyRes.json();
    assert(verifyData.success === true, 'Public verification API returns success: true');
    assert(verifyData.found === true, 'Certificate found in registry');
    assert(verifyData.certificate?.student_name === 'Sivaranjani S', 'Public verification exposes student name');
    assert(verifyData.certificate?.register_number === undefined, 'CRITICAL PRIVACY: Register number is NOT exposed in public verification');
    assert(verifyData.certificate?.signatory_count === 5, 'Public verification reflects 5 signatories');
    assert(verifyData.certificate?.signatory_1_name === 'Dr. K. Arulraj', 'Signatory 1 is Dr. K. Arulraj');
    assert(verifyData.certificate?.signatory_4_name === 'Dr. L. Ganesan', 'Signatory 4 is Dr. L. Ganesan');
    assert(verifyData.certificate?.signatory_5_name === 'Dr. R. Ramesh', 'Signatory 5 is Dr. R. Ramesh');
    assert(verifyData.certificate?.event_name === batchPayload.event_name, 'Event topic matches STTP');

    // 4. Test Revocation
    console.log('\n[TEST 4] Testing Revocation Flow...');
    const revokeRes = await fetch(`${baseUrl}/api/admin/certificate-generation/revoke/${encodeURIComponent(firstCert.certificate_number)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ reason: 'Test administrative audit' })
    });
    const revokeData = await revokeRes.json();
    assert(revokeData.success === true, 'Revocation API returns success: true');

    const reVerifyRes = await fetch(`${baseUrl}/api/public/verify-certificate/${encodeURIComponent(firstCert.certificate_number)}`);
    const reVerifyData = await reVerifyRes.json();
    assert(reVerifyData.status === 'REVOKED', 'Re-verification correctly reflects REVOKED status');
    assert(reVerifyData.certificate?.revocation_reason === 'Test administrative audit', 'Revocation reason exposed for audit');
    assert(reVerifyData.certificate?.register_number === undefined, 'Register number still protected even on revoked certificates');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n=======================================================`);
  console.log(`CUSTOM CERT GENERATOR TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
