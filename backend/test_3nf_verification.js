const http = require("http");

function postJSON(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: "localhost",
            port: 5500,
            path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data)
            }
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on("error", reject);
        req.write(data);
        req.end();
    });
}

function getJSON(path, token) {
    return new Promise((resolve, reject) => {
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const req = http.request({
            hostname: "localhost",
            port: 5500,
            path,
            method: "GET",
            headers
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on("error", reject);
        req.end();
    });
}

async function runTests() {
    console.log("====================================================");
    console.log("🧪 RUNNING 3NF DEPARTMENT NORMALIZATION TEST SUITE");
    console.log("====================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details) {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name}`, details || "");
            failed++;
        }
    }

    // Test 1: Invalid department rejection ("Mechanical")
    try {
        const res = await postJSON("/api/auth/register", {
            full_name: "Test Mech User",
            email: `test_mech_${Date.now()}@rit.ac.in`,
            password: "password123",
            department: "Mechanical"
        });
        assert(
            "Reject invalid department 'Mechanical'",
            res.status === 400 && res.body.message.includes("Invalid department"),
            res
        );
    } catch (e) {
        assert("Reject invalid department 'Mechanical'", false, e.message);
    }

    // Test 2: Invalid department rejection ("Random String")
    try {
        const res = await postJSON("/api/auth/register", {
            full_name: "Test Random User",
            email: `test_rand_${Date.now()}@rit.ac.in`,
            password: "password123",
            department: "Random Department XYZ"
        });
        assert(
            "Reject random department string",
            res.status === 400 && res.body.message.includes("Invalid department"),
            res
        );
    } catch (e) {
        assert("Reject random department string", false, e.message);
    }

    // Test 3: Accept lowercase "csbs"
    const ts = Date.now();
    let token1;
    let user1Id;
    try {
        const res = await postJSON("/api/auth/register", {
            full_name: "Student CSBS Lower",
            register_number: `9536${String(ts).slice(-8)}`,
            email: `csbs_lower_${ts}@rit.ac.in`,
            password: "password123",
            department: "csbs"
        });
        assert(
            "Accept 'csbs' lowercase -> department_id = 1",
            res.status === 201 && res.body.user && res.body.user.department_id === 1 && res.body.user.department_code === "CSBS",
            res
        );
        token1 = res.body?.token;
        user1Id = res.body?.user?.id;
    } catch (e) {
        assert("Accept 'csbs' lowercase", false, e.message);
    }

    // Test 4: Accept typo "Computer Scinece and Business Sytems"
    const ts2 = Date.now() + 1;
    try {
        const res = await postJSON("/api/auth/register", {
            full_name: "Student Typo Variant",
            register_number: `9536${String(ts2).slice(-8)}`,
            email: `csbs_typo_${ts2}@rit.ac.in`,
            password: "password123",
            department: "Computer Scinece and Business Sytems"
        });
        assert(
            "Accept typo 'Computer Scinece and Business Sytems' -> department_id = 1",
            res.status === 201 && res.body.user && res.body.user.department_id === 1 && res.body.user.department_name === "Computer Science and Business Systems",
            res
        );
    } catch (e) {
        assert("Accept typo 'Computer Scinece and Business Sytems'", false, e.message);
    }

    // Test 5: Accept uppercase "COMPUTER SCIENCE AND BUSINESS SYSTEMS" with extra whitespace
    const ts3 = Date.now() + 2;
    try {
        const res = await postJSON("/api/auth/register", {
            full_name: "Student Spaces Variant",
            register_number: `9536${String(ts3).slice(-8)}`,
            email: `csbs_spaces_${ts3}@rit.ac.in`,
            password: "password123",
            department: "   COMPUTER   SCIENCE   AND   BUSINESS   SYSTEMS   "
        });
        assert(
            "Accept uppercase with extra spaces -> department_id = 1",
            res.status === 201 && res.body.user && res.body.user.department_id === 1,
            res
        );
    } catch (e) {
        assert("Accept uppercase with extra spaces", false, e.message);
    }

    // Test 6: Verify /auth/me returns 3NF department info
    if (token1) {
        try {
            const res = await getJSON("/api/auth/me", token1);
            assert(
                "/api/auth/me returns normalized 3NF department fields",
                res.status === 200 && res.body.user && res.body.user.department_id === 1 && res.body.user.department_code === "CSBS" && res.body.user.department_name === "Computer Science and Business Systems",
                res
            );
        } catch (e) {
            assert("/api/auth/me returns 3NF department fields", false, e.message);
        }
    }

    // Test 7: Verify Student Profile endpoint returns 3NF fields
    if (user1Id) {
        try {
            const res = await getJSON(`/api/student/profile/${user1Id}`);
            assert(
                "/api/student/profile/:id returns department_id = 1 and official name",
                res.status === 200 && res.body.profile && res.body.profile.department_id === 1 && res.body.profile.department_name === "Computer Science and Business Systems",
                res
            );
        } catch (e) {
            assert("/api/student/profile/:id returns 3NF fields", false, e.message);
        }
    }

    // Test 8: Verify Admin GET /students includes official department name
    try {
        const res = await getJSON("/api/admin/students");
        const list = res.body && res.body.students ? res.body.students : res.body;
        assert(
            "Admin GET /students returns student list with department_id and department_name",
            res.status === 200 && Array.isArray(list) && list.length > 0 && list.some(s => s.department_id === 1 && s.department_name === "Computer Science and Business Systems"),
            res
        );
    } catch (e) {
        assert("Admin GET /students verification", false, e.message);
    }

    console.log("\n====================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("====================================================");
}

runTests();
