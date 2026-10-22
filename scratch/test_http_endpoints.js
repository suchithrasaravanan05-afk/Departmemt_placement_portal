const http = require('http');
const app = require('../backend/server');

async function testHttp() {
  console.log('=== STARTING HTTP ROUTE & ENDPOINT INTEGRATION TESTS ===\n');
  
  // Start app on ephemeral port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on ${baseUrl}`);

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
    // 1. Test Public Standalone Verification Page HTML
    const pageRes = await fetch(`${baseUrl}/verify-certificate.html`);
    const pageHtml = await pageRes.text();
    assert(pageRes.status === 200, `GET /verify-certificate.html status 200`);
    assert(pageHtml.includes('RAMCO INSTITUTE OF TECHNOLOGY'), 'Verification page contains RIT branding');
    assert(pageHtml.includes('Certificate Verification Portal'), 'Verification page contains title');
    assert(pageHtml.includes('certIdInput'), 'Verification page contains certificate ID input');

    // 2. Test Public Verification API (Nonexistent certificate)
    const notFoundRes = await fetch(`${baseUrl}/api/public/verify-certificate/RIT-CSBS-2026-INVALID999`);
    const notFoundJson = await notFoundRes.json();
    assert(notFoundRes.status === 404, 'GET /api/public/verify-certificate/:invalid returns 404');
    assert(notFoundJson.status === 'NOT_FOUND', 'Response status is NOT_FOUND');
    assert(notFoundJson.message.includes('not found'), 'Returns clear not found message');

    // 3. Test Template Download Endpoint
    const tplRes = await fetch(`${baseUrl}/api/admin/certificate-generation/template-download`);
    assert(tplRes.status === 200, 'GET /api/admin/certificate-generation/template-download returns 200');
    const contentType = tplRes.headers.get('content-type') || '';
    assert(contentType.includes('spreadsheet') || contentType.includes('octet-stream'), 'Content-Type is Excel spreadsheet');
    const tplBuffer = await tplRes.arrayBuffer();
    assert(tplBuffer.byteLength > 1000, `Template spreadsheet has valid byte length (${tplBuffer.byteLength} bytes)`);

    // 4. Test Public Verification API with genuine certificate from DB
    const feedbackStorage = require('../backend/feedbackCertificateStorage');
    const allBatches = await feedbackStorage.getCertificateBatches();
    if (allBatches.length > 0) {
      const batchCerts = await feedbackStorage.getBatchCertificates(allBatches[0].id);
      if (batchCerts.length > 0) {
        const testCert = batchCerts[0];
        const genuineRes = await fetch(`${baseUrl}/api/public/verify-certificate/${testCert.certificate_number}`);
        const genuineJson = await genuineRes.json();
        assert(genuineRes.status === 200, `GET /api/public/verify-certificate/:valid status 200`);
        assert(genuineJson.success === true, 'Public verification success is true');
        assert(genuineJson.certificate && genuineJson.certificate.student_name, 'Returns verified student name');
        assert(!genuineJson.certificate.register_number && !genuineJson.certificate.registerNumber, 'Privacy preserved: Register number withheld from public API');
      }
    }

    console.log('\n=======================================================');
    console.log(`HTTP TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=======================================================');
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

testHttp().catch(err => {
  console.error('HTTP Test failure:', err);
  process.exit(1);
});
