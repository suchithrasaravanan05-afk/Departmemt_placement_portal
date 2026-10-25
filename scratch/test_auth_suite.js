const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../backend/server');
const apiHandler = require('../api/index');

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AUTH & SERVERLESS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Direct Serverless Handler Invocation Test (api/index.js)
  console.log('[SUITE 1] Testing api/index.js serverless entrypoint directly...');
  let mockResBody = '';
  let mockResStatus = 200;
  let mockResHeaders = {};

  const mockReq = {
    method: 'GET',
    url: '/api/health',
    path: '/api/health',
    headers: { host: 'localhost' }
  };

  const mockRes = {
    status(s) { mockResStatus = s; return this; },
    setHeader(k, v) { mockResHeaders[k] = v; return this; },
    json(data) { mockResBody = JSON.stringify(data); return this; },
    send(data) { mockResBody = data; return this; },
    end() {}
  };

  // Run serverless handler
  await new Promise(resolve => {
    // Wrap to catch response completion
    const origJson = mockRes.json;
    mockRes.json = function(d) {
      origJson.call(mockRes, d);
      resolve();
    };
    apiHandler(mockReq, mockRes);
  });

  assert(mockResStatus === 200, `api/index.js executed health check with status 200 (got ${mockResStatus})`);
  assert(mockResBody.includes('Online'), 'api/index.js health response confirms backend is Online');

  // 2. Start HTTP server on ephemeral port for endpoint tests
  console.log('\n[SUITE 2] Starting HTTP server for end-to-end authentication tests...');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2.1 Test Missing Identifier
    const resMissingId = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'somepassword', role: 'faculty' })
    });
    const jsonMissingId = await resMissingId.json();
    assert(resMissingId.status === 400, 'Rejects missing identifier with HTTP 400');
    assert(jsonMissingId.success === false, 'Missing identifier response success is false');

    // 2.2 Test Missing Password
    const resMissingPwd = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'faculty@rit.ac.in', role: 'faculty' })
    });
    const jsonMissingPwd = await resMissingPwd.json();
    assert(resMissingPwd.status === 400, 'Rejects missing password with HTTP 400');
    assert(jsonMissingPwd.success === false, 'Missing password response success is false');

    // 2.3 Test Placement Admin Login (Preset)
    const resAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'admin123',
        role: 'admin'
      })
    });
    const jsonAdmin = await resAdmin.json();
    assert(resAdmin.status === 200, 'Admin login succeeds with HTTP 200');
    assert(jsonAdmin.success === true, 'Admin login response success is true');
    assert(jsonAdmin.token && jsonAdmin.user && jsonAdmin.user.role === 'admin', 'Admin user object and token received');
    const adminDecoded = jwt.verify(jsonAdmin.token, JWT_SECRET);
    assert(adminDecoded.role === 'admin' && adminDecoded.placement_access === true, 'Admin token has role=admin and placement_access=true');

    // 2.4 Test Faculty Login (Preset)
    const resFaculty = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'faculty@rit.ac.in',
        password: 'faculty123',
        role: 'faculty'
      })
    });
    const jsonFaculty = await resFaculty.json();
    assert(resFaculty.status === 200, 'Faculty login succeeds with HTTP 200');
    assert(jsonFaculty.success === true, 'Faculty login response success is true');
    assert(jsonFaculty.token && jsonFaculty.user && jsonFaculty.user.role === 'faculty', 'Faculty user object and token received');

    // 2.5 Test Role mismatch: Attempting Admin Login with Faculty Credentials
    const resMismatch = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'faculty@rit.ac.in',
        password: 'faculty123',
        role: 'admin'
      })
    });
    const jsonMismatch = await resMismatch.json();
    assert(resMismatch.status === 403, 'Rejects unauthorized role escalation with HTTP 403');
    assert(jsonMismatch.success === false, 'Role mismatch returns success: false');
    assert(jsonMismatch.message.includes('Administrator privileges') || jsonMismatch.message.includes('Access Denied'), 'Provides clear access denied message');

    // 2.6 Test Student Invalid Password
    const resStudentBadPwd = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '953623244056',
        password: 'wrong_password_xyz',
        role: 'student'
      })
    });
    const jsonStudentBadPwd = await resStudentBadPwd.json();
    assert(resStudentBadPwd.status === 401, 'Rejects invalid credentials with HTTP 401');
    assert(jsonStudentBadPwd.success === false, 'Invalid credentials returns success: false');

    // 2.7 Test Non-existent User Login
    const resNotFound = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nonexistent_user_99999@ritrjpm.ac.in',
        password: 'somepassword',
        role: 'student'
      })
    });
    const jsonNotFound = await resNotFound.json();
    assert(resNotFound.status === 401, 'Non-existent user rejected with HTTP 401');
    assert(jsonNotFound.success === false, 'Returns success: false for non-existent user');

    // 2.8 Test Protected Route with Valid Admin Token
    const resProtected = await fetch(`${baseUrl}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jsonAdmin.token}`
      },
      body: JSON.stringify({
        title: 'Test Department Announcement',
        content: 'This is a test announcement post content for test verification.',
        platforms: ['linkedin']
      })
    });
    const jsonProtected = await resProtected.json();
    assert(resProtected.status === 201, 'Protected social route accessible with valid token (HTTP 201)');
    assert(jsonProtected.success === true, 'Protected route returns success: true');

    // 2.9 Test Protected Route with No Token
    const resNoToken = await fetch(`${baseUrl}/api/social/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Post',
        content: 'Should be rejected'
      })
    });
    assert(resNoToken.status === 401, `Protected route rejects request without token (HTTP ${resNoToken.status})`);

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
