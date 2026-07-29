const API_BASE = "/api/admin";

// =========================================================
// Guard: only an admin who actually logged in via Form.html
// gets to see this page.
// =========================================================
const adminToken = localStorage.getItem("adminToken");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!adminToken || !currentUser || currentUser.role !== "admin") {
    alert("Please login as admin first.");
    window.location.href = "Form.html";
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "x-admin-token": adminToken
    };
}

function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");
    window.location.href = "Form.html";
}

let allStudents = [];
let allDepartments = [];

// =========================
// Load departments (for the edit dropdown)
// =========================
function loadDepartments() {
    fetch(`${API_BASE}/departments`, {
        headers: authHeaders()
    })
    .then(async response => {
        const data = await response.json();
        if (data.success) {
            allDepartments = data.departments;
            const select = document.getElementById("editDepartment");
            select.innerHTML = allDepartments
                .map(d => `<option value="${d.dept_code}">${d.dept_name}</option>`)
                .join("");
        }
    })
    .catch(error => console.error(error));
}

// =========================
// Load students from backend
// =========================
function loadStudents() {
    return fetch(`${API_BASE}/students`, {
        headers: authHeaders()
    })
    .then(async response => {
        if (response.status === 401) {
            alert("Session expired. Please login again.");
            logout();
            return;
        }

        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Failed to load students");
            return;
        }

        allStudents = data.students;
        renderTable();
    })
    .catch(error => {
        console.error(error);
        alert("Cannot connect to server.");
    });
}

// =========================
// Render table (with optional year filter)
// =========================
function renderTable() {
    const table = document.getElementById("studentTable");
    const yearFilter = document.getElementById("yearFilter").value;

    const rows = allStudents.filter(s =>
        yearFilter === "" || String(s.year) === String(yearFilter)
    );

    if (rows.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="7">No students found.</td></tr>`;
        return;
    }

    table.innerHTML = rows.map(s => `
        <tr>
            <td>${s.year}</td>
            <td>${s.register_number}</td>
            <td>${s.full_name}</td>
            <td>${s.email}</td>
            <td>${s.department_name || s.department_code}</td>
            <td>${s.phone}</td>
            <td>${s.profile_submitted ? `Submitted (CGPA ${s.cgpa ?? "-"})` : "Not submitted"}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openView(${s.id})">View</button>
                <button class="action-btn edit-btn" onclick="openEdit(${s.id})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteStudent(${s.id})">Delete</button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("yearFilter").addEventListener("change", renderTable);

// =========================
// Placement eligibility filter + Excel export
// =========================
let currentEligibleList = [];

function applyEligibilityFilter() {
    const cutoff = parseFloat(document.getElementById("eligibilityCutoff").value);

    if (!cutoff) {
        alert("Select a cutoff percentage first.");
        return;
    }

    // Always refresh first - avoids filtering against a stale list if a
    // student submitted/updated their profile after this page last loaded.
    loadStudents().then(() => {

        // CGPA is on a 10-point scale, so the same cutoff is applied as
        // cutoff/10 (e.g. a 65% cutoff requires CGPA >= 6.5). Adjust this
        // if your institution uses a different CGPA-to-percentage formula.
        const cgpaCutoff = cutoff / 10;

        currentEligibleList = allStudents.filter(s => {
            const tenth = parseFloat(s.tenth_percentage);
            const twelfth = parseFloat(s.twelfth_percentage);
            const studentCgpa = parseFloat(s.cgpa);

            return !isNaN(tenth) && !isNaN(twelfth) && !isNaN(studentCgpa) &&
                   tenth >= cutoff && twelfth >= cutoff && studentCgpa >= cgpaCutoff;
        });

        renderEligibleTable(cutoff);
    });
}

function renderEligibleTable(cutoff) {
    const container = document.getElementById("eligibleResults");

    if (currentEligibleList.length === 0) {
        container.innerHTML = `<p style="color:#888;">No students meet the ${cutoff}% cutoff.</p>`;
        return;
    }

    container.innerHTML = `
        <p><strong>${currentEligibleList.length}</strong> student(s) meet the ${cutoff}% cutoff (10th, 12th & CGPA):</p>
        <table>
            <thead>
                <tr>
                    <th>Year</th><th>Register No</th><th>Name</th>
                    <th>10th %</th><th>12th %</th><th>CGPA</th><th>Domain</th>
                </tr>
            </thead>
            <tbody>
                ${currentEligibleList.map(s => `
                    <tr>
                        <td>${s.year}</td>
                        <td>${s.register_number}</td>
                        <td>${s.full_name}</td>
                        <td>${s.tenth_percentage ?? "-"}</td>
                        <td>${s.twelfth_percentage ?? "-"}</td>
                        <td>${s.cgpa ?? "-"}</td>
                        <td>${s.domain_interested ?? "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function downloadEligibleExcel() {
    if (currentEligibleList.length === 0) {
        alert("No eligible students to export - click 'Show Eligible Students' first.");
        return;
    }

    const headerRow = [
        "Year", "Register No", "Name", "Email", "Department", "Phone", "WhatsApp",
        "Date of Birth", "Personal Email", "College Email", "Domain Interested", "Degree",
        "10th %", "12th %", "Diploma %",
        "Sem 1 GPA", "Sem 2 GPA", "Sem 3 GPA", "Sem 4 GPA",
        "Sem 5 GPA", "Sem 6 GPA", "Sem 7 GPA", "Sem 8 GPA", "CGPA",
        "History Arrears", "History Arrears Count", "Standing Arrears", "Standing Arrears Count",
        "LinkedIn", "GitHub", "Resume File", "Photo File"
    ];

    const dataRows = currentEligibleList.map(s => [
        s.year,
        s.register_number,
        s.full_name,
        s.email,
        s.department_name || s.department_code,
        s.phone,
        s.whatsapp_number || "",
        s.dob ? s.dob.substring(0, 10) : "",
        s.personal_email || "",
        s.college_email || "",
        s.domain_interested || "",
        s.degree || "",
        s.tenth_percentage,
        s.twelfth_percentage,
        s.diploma_percentage,
        s.sem1_gpa, s.sem2_gpa, s.sem3_gpa, s.sem4_gpa,
        s.sem5_gpa, s.sem6_gpa, s.sem7_gpa, s.sem8_gpa,
        s.cgpa,
        s.history_of_arrears || "no",
        s.history_arrears_count || 0,
        s.standing_of_arrears || "no",
        s.standing_arrears_count || 0,
        s.linkedin_link || "",
        s.github_link || "",
        s.resume_file || "",
        s.profile_photo || ""
    ]);

    // Row 1: college name, Row 2: department name, Row 3: headers, then data
    const aoa = [
        ["RAMCO INSTITUTE OF TECHNOLOGY"],
        ["Department of Computer Science and Business Systems"],
        headerRow,
        ...dataRows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Merge the two title rows across all columns so they read as banners
    const lastCol = headerRow.length - 1;
    worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
    ];

    // Style: centered, bold, white text on a dark blue background,
    // matching the portal's colour scheme. Applied to every cell in
    // each merged row so the fill covers the whole banner, not just
    // the first cell.
    const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "1D3853" } },
        alignment: { horizontal: "center", vertical: "center" }
    };

    for (let col = 0; col <= lastCol; col++) {
        const collegeCellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        const deptCellRef = XLSX.utils.encode_cell({ r: 1, c: col });

        if (!worksheet[collegeCellRef]) worksheet[collegeCellRef] = { t: "s", v: "" };
        if (!worksheet[deptCellRef]) worksheet[deptCellRef] = { t: "s", v: "" };

        worksheet[collegeCellRef].s = titleStyle;
        worksheet[deptCellRef].s = titleStyle;
    }

    // Give the title rows some height so the styling reads clearly
    worksheet["!rows"] = [{ hpt: 26 }, { hpt: 22 }];

    // Reasonable column widths so the wider text fields aren't crushed
    worksheet["!cols"] = headerRow.map((_, i) =>
        [1, 2, 3, 8, 9, 10, 27, 28].includes(i) ? { wch: 22 } : { wch: 12 }
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eligible Students");

    const cutoff = document.getElementById("eligibilityCutoff").value;
    XLSX.writeFile(workbook, `Eligible_Students_${cutoff}percent.xlsx`);
}

// =========================
// Edit modal
// =========================
function openEdit(id) {
    const s = allStudents.find(st => st.id === id);
    if (!s) return;

    // Account fields come from the list already loaded
    document.getElementById("editId").value = s.id;
    document.getElementById("editName").value = s.full_name;
    document.getElementById("editReg").value = s.register_number;
    document.getElementById("editEmail").value = s.email;
    document.getElementById("editYear").value = s.year;
    document.getElementById("editDepartment").value = s.department_code;
    document.getElementById("editPhone").value = s.phone;

    // Profile fields need a dedicated fetch since the list view
    // only carries a summary (cgpa, domain_interested)
    fetch(`${API_BASE}/profile/${id}`, {
        headers: authHeaders()
    })
    .then(async response => {
        const data = await response.json();
        const p = data.success ? data.profile : {};

        document.getElementById("editDob").value = p.dob ? p.dob.substring(0, 10) : "";
        document.getElementById("editPersonalEmail").value = p.personal_email || "";
        document.getElementById("editDomain").value = p.domain_interested || "";
        document.getElementById("editDegree").value = p.degree || "";
        document.getElementById("editTenth").value = p.tenth_percentage || "";
        document.getElementById("editTwelfth").value = p.twelfth_percentage || "";
        document.getElementById("editDiploma").value = p.diploma_percentage || "";
        document.getElementById("editCgpa").value = p.cgpa || "";
        document.getElementById("editHistoryArrears").value = p.history_arrears_count || 0;
        document.getElementById("editStandingArrears").value = p.standing_arrears_count || 0;
        document.getElementById("editLinkedin").value = p.linkedin_link || "";
        document.getElementById("editGithub").value = p.github_link || "";

        document.getElementById("editModal").classList.add("open");
    })
    .catch(error => {
        console.error(error);
        alert("Could not load full profile - opening account fields only.");
        document.getElementById("editModal").classList.add("open");
    });
}

function closeModal() {
    document.getElementById("editModal").classList.remove("open");
}

function saveEdit() {
    const id = document.getElementById("editId").value;

    const historyCount = parseInt(document.getElementById("editHistoryArrears").value) || 0;
    const standingCount = parseInt(document.getElementById("editStandingArrears").value) || 0;

    const payload = {
        // account
        full_name: document.getElementById("editName").value.trim(),
        register_number: document.getElementById("editReg").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        year: document.getElementById("editYear").value,
        department_code: document.getElementById("editDepartment").value,
        phone: document.getElementById("editPhone").value.trim(),

        // profile
        dob: document.getElementById("editDob").value || null,
        personal_email: document.getElementById("editPersonalEmail").value.trim() || null,
        domain_interested: document.getElementById("editDomain").value.trim() || null,
        degree: document.getElementById("editDegree").value || null,
        tenth_percentage: document.getElementById("editTenth").value || null,
        twelfth_percentage: document.getElementById("editTwelfth").value || null,
        diploma_percentage: document.getElementById("editDiploma").value || null,
        cgpa: document.getElementById("editCgpa").value || null,
        history_of_arrears: historyCount > 0 ? "yes" : "no",
        history_arrears_count: historyCount,
        standing_of_arrears: standingCount > 0 ? "yes" : "no",
        standing_arrears_count: standingCount,
        linkedin_link: document.getElementById("editLinkedin").value.trim() || null,
        github_link: document.getElementById("editGithub").value.trim() || null
    };

    if (!payload.full_name || !payload.register_number || !payload.email ||
        !payload.year || !payload.department_code || !payload.phone) {
        alert("Please fill all account fields.");
        return;
    }

    fetch(`${API_BASE}/students/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload)
    })
    .then(async response => {
        const data = await response.json();
        alert(data.message);

        if (data.success) {
            closeModal();
            loadStudents();
        }
    })
    .catch(error => {
        console.error(error);
        alert("Cannot connect to server.");
    });
}

// =========================
// View full profile (admin only)
// =========================
function openView(id) {
    fetch(`${API_BASE}/profile/${id}`, {
        headers: authHeaders()
    })
    .then(async response => {
        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Could not load profile");
            return;
        }

        const p = data.profile;
        const row = (label, value) => `<div><strong>${label}:</strong> ${value ?? "-"}</div>`;

        document.getElementById("viewContent").innerHTML = `
            ${row("Name", p.full_name)}
            ${row("Register No", p.register_number)}
            ${row("Year", p.year)}
            ${row("Department", p.department_name)}
            ${row("College Email", p.college_email || p.email)}
            ${row("Personal Email", p.personal_email)}
            ${row("DOB", p.dob ? p.dob.substring(0, 10) : null)}
            ${row("Domain Interested", p.domain_interested)}
            ${row("Degree", p.degree)}
            ${row("10th %", p.tenth_percentage)}
            ${row("12th %", p.twelfth_percentage)}
            ${row("Diploma %", p.diploma_percentage)}
            ${row("CGPA", p.cgpa)}
            ${row("Phone", p.phone_number || p.phone)}
            ${row("WhatsApp", p.whatsapp_number)}
            ${row("History Arrears", p.history_of_arrears === "yes" ? p.history_arrears_count : "No")}
            ${row("Standing Arrears", p.standing_of_arrears === "yes" ? p.standing_arrears_count : "No")}
            ${row("LinkedIn", p.linkedin_link ? `<a href="${p.linkedin_link}" target="_blank">Link</a>` : "-")}
            ${row("GitHub", p.github_link ? `<a href="${p.github_link}" target="_blank">Link</a>` : "-")}
            ${row("Resume", p.resume_file ? `<a href="/uploads/${p.resume_file}" target="_blank">Download</a>` : "Not uploaded")}
            ${row("Photo", p.profile_photo ? `<a href="/uploads/${p.profile_photo}" target="_blank">View</a>` : "Not uploaded")}
        `;

        document.getElementById("viewModal").classList.add("open");
    })
    .catch(error => {
        console.error(error);
        alert("Cannot connect to server.");
    });
}

function closeViewModal() {
    document.getElementById("viewModal").classList.remove("open");
}

// =========================
// Delete (admin only)
// =========================
function deleteStudent(id) {
    if (!confirm("Delete this student? This cannot be undone.")) return;

    fetch(`${API_BASE}/students/${id}`, {
        method: "DELETE",
        headers: authHeaders()
    })
    .then(async response => {
        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadStudents();
        }
    })
    .catch(error => {
        console.error(error);
        alert("Cannot connect to server.");
    });
}

window.loadStudents = loadStudents;
window.applyEligibilityFilter = applyEligibilityFilter;
window.downloadEligibleExcel = downloadEligibleExcel;
window.openView = openView;
window.closeViewModal = closeViewModal;
window.openEdit = openEdit;
window.closeModal = closeModal;
window.saveEdit = saveEdit;
window.deleteStudent = deleteStudent;
window.logout = logout;

// Initial load
loadDepartments();
loadStudents();