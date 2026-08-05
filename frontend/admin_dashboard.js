<<<<<<< HEAD
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
=======
const SERVER_BASE = (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"))
    ? "http://localhost:5500"
    : window.location.origin;

const API_BASE = `${SERVER_BASE}/api`;

let currentAdminToken = null;
let currentAdminUser = null;
let currentFetchedStudents = [];

document.addEventListener("DOMContentLoaded", () => {
    currentAdminToken = localStorage.getItem("token");
    currentAdminUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!currentAdminToken || !currentAdminUser || currentAdminUser.role !== "admin") {
        window.location.href = "Form.html";
        return;
    }

    document.getElementById("adminUserName").innerText = currentAdminUser.full_name || "Placement Admin";

    loadDashboardStats();
    fetchStudentRoster();
});

function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "Form.html";
}

function switchAdminTab(tabName) {
    document.getElementById("adminTabStudents").classList.toggle("hidden", tabName !== "students");
    document.getElementById("adminTabDrives").classList.toggle("hidden", tabName !== "drives");
    document.getElementById("adminTabApplications").classList.toggle("hidden", tabName !== "applications");

    document.getElementById("tabBtnStudents").classList.toggle("active", tabName === "students");
    document.getElementById("tabBtnPostDrive").classList.toggle("active", tabName === "drives");
    document.getElementById("tabBtnApps").classList.toggle("active", tabName === "applications");

    if (tabName === "students") fetchStudentRoster();
    if (tabName === "drives") loadAdminDrives();
    if (tabName === "applications") loadApplicationsList();
}

function showAdminAlert(message, isSuccess = false) {
    const box = document.getElementById("adminAlert");
    box.innerText = message;
    box.style.backgroundColor = isSuccess ? "#dcfce7" : "#fee2e2";
    box.style.color = isSuccess ? "#15803d" : "#b91c1c";
    box.style.border = isSuccess ? "1px solid #bbf7d0" : "1px solid #fca5a5";
    box.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideAdminAlert() {
    document.getElementById("adminAlert").classList.add("hidden");
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
            headers: { "Authorization": `Bearer ${currentAdminToken}` }
        });
        const data = await res.json();
        if (data.success && data.stats) {
            document.getElementById("statTotalStudents").innerText = data.stats.totalStudents || 0;
            document.getElementById("statPlacedStudents").innerText = data.stats.placedStudents || 0;
            document.getElementById("statActiveDrives").innerText = data.stats.activeDrives || 0;
            document.getElementById("statTotalApps").innerText = data.stats.totalApplications || 0;
        }
    } catch (e) {
        console.error("Stats load error:", e);
    }
}

async function fetchStudentRoster() {
    const year = document.getElementById("filterYear").value;
    const minCgpa = document.getElementById("filterMinCgpa").value;
    const minTenth = document.getElementById("filterMinTenth") ? document.getElementById("filterMinTenth").value : "";
    const minTwelth = document.getElementById("filterMinTwelth") ? document.getElementById("filterMinTwelth").value : "";
    const maxArrears = document.getElementById("filterMaxArrears").value;
    const search = document.getElementById("filterSearch").value.trim();

    updateFilterChips();

    const query = new URLSearchParams();
    if (year) query.append("year", year);
    if (minCgpa) query.append("minCgpa", minCgpa);
    if (minTenth) query.append("minTenth", minTenth);
    if (minTwelth) query.append("minTwelth", minTwelth);
    if (maxArrears !== "") query.append("maxArrears", maxArrears);
    if (search) query.append("search", search);

    try {
        const res = await fetch(`${API_BASE}/admin/students?${query.toString()}`, {
            headers: { "Authorization": `Bearer ${currentAdminToken}` }
        });
        const data = await res.json();
        const tbody = document.getElementById("studentRosterTableBody");
        tbody.innerHTML = "";

        if (!data.success || !data.students || data.students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding: 30px;">No student records found matching filters.</td></tr>`;
            currentFetchedStudents = [];
            return;
        }

        currentFetchedStudents = data.students;

        data.students.forEach(s => {
            const cgpaVal = s.cgpa ? parseFloat(s.cgpa).toFixed(2) : "N/A";
            const tenthVal = s.tenth_percentage ? `${parseFloat(s.tenth_percentage).toFixed(1)}%` : "N/A";
            const twelthVal = s.twelth_percentage ? `${parseFloat(s.twelth_percentage).toFixed(1)}%` : "N/A";
            const arrearsVal = s.standing_arrears_count !== null ? s.standing_arrears_count : 0;
            let resumeLink = `<span class="text-muted">Not Uploaded</span>`;
            if (s.resume_file) {
                // resume_file is a full Supabase public URL — use it directly
                const resumeUrl = s.resume_file.startsWith("http") ? s.resume_file : `${SERVER_BASE}${s.resume_file}`;
                resumeLink = `<a href="${resumeUrl}" target="_blank" class="btn-success" style="padding: 4px 10px; font-size: 11px;"><i class="fa-solid fa-download"></i> Resume</a>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.year ? s.year + 'th Year' : 'N/A'}</strong></td>
                    <td>${s.register_number || 'N/A'}</td>
                    <td><strong>${s.full_name}</strong></td>
                    <td>${s.email}</td>
                    <td><span style="font-weight: 600;">${tenthVal}</span></td>
                    <td><span style="font-weight: 600;">${twelthVal}</span></td>
                    <td><span style="color: var(--accent); font-weight: 700;">${cgpaVal}</span></td>
                    <td><span class="badge ${arrearsVal > 0 ? 'badge-red' : 'badge-green'}">${arrearsVal} Arrears</span></td>
                    <td>${s.domain_interest || 'General'}</td>
                    <td>${resumeLink}</td>
                    <td>
                        <button
                            onclick="deleteStudent(${s.user_id}, '${s.full_name.replace(/'/g, "\\'")}')"
                            style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                            title="Delete student">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Fetch roster error:", e);
    }
}

// ==========================================
// DELETE STUDENT
// ==========================================
async function deleteStudent(userId, studentName) {
    if (!confirm(`⚠️ Are you sure you want to DELETE student "${studentName}"?\n\nThis will permanently remove their account, profile, and all applications. This action CANNOT be undone.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/students/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${currentAdminToken}` }
        });
        const data = await res.json();
        if (data.success) {
            showAdminAlert(`✅ Student "${studentName}" has been deleted.`, true);
            loadStudentRoster(); // refresh the table
        } else {
            showAdminAlert(`❌ Failed to delete: ${data.message}`);
        }
    } catch (e) {
        console.error("Delete student error:", e);
        showAdminAlert("❌ Server error while deleting student.");
    }
}

function applySeventyFilter() {
    document.getElementById("filterMinCgpa").value = "7.0";
    document.getElementById("filterMinTenth").value = "70";
    document.getElementById("filterMinTwelth").value = "70";
    fetchStudentRoster();
}

function clearAllFilters() {
    document.getElementById("filterYear").value = "";
    document.getElementById("filterMinCgpa").value = "";
    if (document.getElementById("filterMinTenth")) document.getElementById("filterMinTenth").value = "";
    if (document.getElementById("filterMinTwelth")) document.getElementById("filterMinTwelth").value = "";
    document.getElementById("filterMaxArrears").value = "";
    document.getElementById("filterSearch").value = "";
    fetchStudentRoster();
}

function updateFilterChips() {
    const container = document.getElementById("activeFilterChips");
    if (!container) return;
    container.innerHTML = "";

    const chips = [];
    const minCgpa = document.getElementById("filterMinCgpa").value;
    const minTenth = document.getElementById("filterMinTenth") ? document.getElementById("filterMinTenth").value : "";
    const minTwelth = document.getElementById("filterMinTwelth") ? document.getElementById("filterMinTwelth").value : "";
    const year = document.getElementById("filterYear").value;
    const maxArrears = document.getElementById("filterMaxArrears").value;

    if (minTenth === "70" && minTwelth === "70" && minCgpa === "7.0") {
        chips.push(`<span class="badge badge-blue" style="padding: 6px 12px; font-size: 12px;"><i class="fa-solid fa-star"></i> Quick Filter: 70%+ in 10th, 12th &amp; CGPA</span>`);
    } else {
        if (minCgpa) chips.push(`<span class="badge badge-blue">CGPA ≥ ${minCgpa}</span>`);
        if (minTenth) chips.push(`<span class="badge badge-blue">10th ≥ ${minTenth}%</span>`);
        if (minTwelth) chips.push(`<span class="badge badge-blue">12th ≥ ${minTwelth}%</span>`);
    }

    if (year) chips.push(`<span class="badge badge-blue">Year ${year}</span>`);
    if (maxArrears !== "") chips.push(`<span class="badge badge-blue">Arrears ≤ ${maxArrears}</span>`);

    container.innerHTML = chips.join(" ");
}

function downloadStudentExcel() {
    if (!currentFetchedStudents || currentFetchedStudents.length === 0) {
        alert("No student data available to export!");
        return;
    }

    // Column headers (Row 3 in sheet)
    const headers = [
        "Year", "Register No", "Name", "Email", "Department",
        "10th %", "12th %", "CGPA", "Domain Interest", "Phone"
    ];
    const numCols = headers.length;
    const lastCol = String.fromCharCode(64 + numCols); // e.g. "J" for 10 cols

    // Build worksheet data array-of-arrays
    const aoa = [];

    // Row 1: College name (merged)
    aoa.push(["RAMCO INSTITUTE OF TECHNOLOGY", ...Array(numCols - 1).fill("")]);

    // Row 2: Department name (merged)
    aoa.push(["Department of Computer Science and Business Systems", ...Array(numCols - 1).fill("")]);

    // Row 3: Column headers
    aoa.push(headers);

    // Rows 4+: Student data
    currentFetchedStudents.forEach(s => {
        aoa.push([
            s.year || "N/A",
            s.register_number || "N/A",
            s.full_name || "N/A",
            s.email || "N/A",
            s.department || "Computer Science and Business Systems",
            s.tenth_percentage || "N/A",
            s.twelth_percentage || "N/A",
            s.cgpa || "N/A",
            s.domain_interest || "N/A",
            s.phone || "N/A"
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // --- Merge cells for Row 1 and Row 2 ---
    worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }, // Row 1 merge
        { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }  // Row 2 merge
    ];

    // --- Column widths ---
    worksheet["!cols"] = [
        { wch: 6 },  // Year
        { wch: 16 }, // Register No
        { wch: 22 }, // Name
        { wch: 28 }, // Email
        { wch: 38 }, // Department
        { wch: 8 },  // 10th %
        { wch: 8 },  // 12th %
        { wch: 7 },  // CGPA
        { wch: 20 }, // Domain Interest
        { wch: 14 }  // Phone
    ];

    // --- Row heights ---
    worksheet["!rows"] = [
        { hpt: 28 }, // Row 1 height
        { hpt: 22 }, // Row 2 height
        { hpt: 18 }  // Row 3 (headers) height
    ];

    // --- Apply styles using SheetJS cell properties ---
    // Row 1: Dark navy background, white bold centered text
    const collegeNameStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1A2E44" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "2E8B7A" } },
            bottom: { style: "thin", color: { rgb: "2E8B7A" } },
            left: { style: "thin", color: { rgb: "2E8B7A" } },
            right: { style: "thin", color: { rgb: "2E8B7A" } }
        }
    };
    // Row 2: Teal background, dark bold centered text
    const deptNameStyle = {
        font: { bold: true, sz: 12, color: { rgb: "1A2E44" } },
        fill: { fgColor: { rgb: "2E8B7A" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "1A2E44" } },
            bottom: { style: "thin", color: { rgb: "1A2E44" } },
            left: { style: "thin", color: { rgb: "1A2E44" } },
            right: { style: "thin", color: { rgb: "1A2E44" } }
        }
    };
    // Row 3: Header row style
    const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2E4057" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "AAAAAA" } },
            bottom: { style: "thin", color: { rgb: "AAAAAA" } },
            left: { style: "thin", color: { rgb: "AAAAAA" } },
            right: { style: "thin", color: { rgb: "AAAAAA" } }
        }
    };
    // Data rows: subtle alternating style
    const dataStyle = {
        font: { sz: 10 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
    };
    const dataStyleAlt = {
        font: { sz: 10 },
        fill: { fgColor: { rgb: "EAF4F1" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
    };

    // Apply styles cell by cell
    for (let R = 0; R < aoa.length; R++) {
        for (let C = 0; C < numCols; C++) {
            const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[cellAddr]) worksheet[cellAddr] = { v: "", t: "s" };
            if (R === 0) {
                worksheet[cellAddr].s = collegeNameStyle;
            } else if (R === 1) {
                worksheet[cellAddr].s = deptNameStyle;
            } else if (R === 2) {
                worksheet[cellAddr].s = headerStyle;
            } else {
                worksheet[cellAddr].s = (R % 2 === 0) ? dataStyleAlt : dataStyle;
            }
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CSBS Students");

    const yearFilter = document.getElementById("filterYear").value || "All";
    XLSX.writeFile(workbook, `CSBS_Students_Year_${yearFilter}_Roster.xlsx`, { bookType: "xlsx", cellStyles: true });
}

async function handlePostDrive(e) {
    e.preventDefault();
    hideAdminAlert();

    const payload = {
        company_name: document.getElementById("driveCompany").value.trim(),
        job_role: document.getElementById("driveRole").value.trim(),
        package_ctc: document.getElementById("drivePackage").value.trim(),
        min_cgpa: document.getElementById("driveMinCgpa").value,
        max_standing_arrears: document.getElementById("driveMaxArrears").value,
        eligible_years: document.getElementById("driveYears").value,
        job_location: document.getElementById("driveLocation").value.trim(),
        deadline: document.getElementById("driveDeadline").value,
        description: document.getElementById("driveDescription").value.trim()
    };

    try {
        const res = await fetch(`${API_BASE}/admin/drives`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            showAdminAlert("Placement Drive posted successfully!", true);
            document.getElementById("postDriveForm").reset();
            loadAdminDrives();
            loadDashboardStats();
        } else {
            showAdminAlert(data.message || "Failed to post drive.");
        }
    } catch (e) {
        console.error(e);
        showAdminAlert("Server error posting drive.");
    }
}

async function loadAdminDrives() {
    try {
        const res = await fetch(`${API_BASE}/student/drives/0`);
        const data = await res.json();
        const container = document.getElementById("adminDrivesContainer");
        container.innerHTML = "";

        if (!data.success || !data.drives || data.drives.length === 0) {
            container.innerHTML = `<p class="text-muted">No placement drives posted yet.</p>`;
            return;
        }

        data.drives.forEach(drive => {
            const card = document.createElement("div");
            card.className = "drive-card";

            card.innerHTML = `
                <div>
                    <div class="drive-header">
                        <div class="company-title">${drive.company_name}</div>
                        <button class="btn-logout" style="background: rgba(239, 68, 68, 0.1); border-color: #ef4444;" onclick="deleteDrive(${drive.id})">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                    <div class="job-role-text">${drive.job_role}</div>
                    <p style="font-size: 13px; color: var(--text-secondary);">${drive.description || ''}</p>
                    <div class="drive-meta">
                        <div class="meta-item">
                            <span class="meta-label">Package CTC</span>
                            <span class="meta-val" style="color: var(--success);">${drive.package_ctc}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Min CGPA</span>
                            <span class="meta-val">${drive.min_cgpa || '0.0'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Max Arrears</span>
                            <span class="meta-val">${drive.max_standing_arrears !== null ? drive.max_standing_arrears : 'Any'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Deadline</span>
                            <span class="meta-val">${drive.deadline || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Load admin drives error:", e);
    }
}

async function deleteDrive(driveId) {
    if (!confirm("Are you sure you want to delete this placement drive?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/drives/${driveId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${currentAdminToken}` }
        });
        const data = await res.json();
        if (data.success) {
            showAdminAlert("Drive deleted successfully.", true);
            loadAdminDrives();
            loadDashboardStats();
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadApplicationsList() {
    try {
        const res = await fetch(`${API_BASE}/admin/applications`, {
            headers: { "Authorization": `Bearer ${currentAdminToken}` }
        });
        const data = await res.json();
        const tbody = document.getElementById("applicationsTableBody");
        tbody.innerHTML = "";

        if (!data.success || !data.applications || data.applications.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No student applications received yet.</td></tr>`;
            return;
        }

        data.applications.forEach(app => {
            let badgeClass = "badge-blue";
            if (app.status === "Selected") badgeClass = "badge-green";
            if (app.status === "Shortlisted") badgeClass = "badge-yellow";
            if (app.status === "Rejected") badgeClass = "badge-red";

            tbody.innerHTML += `
                <tr>
                    <td><strong>${app.company_name}</strong><br><small class="text-muted">${app.job_role}</small></td>
                    <td><strong>${app.full_name}</strong></td>
                    <td>${app.register_number || 'N/A'}</td>
                    <td>${app.year ? app.year + 'th' : 'N/A'}</td>
                    <td><span style="color: var(--accent); font-weight: 700;">${app.cgpa ? parseFloat(app.cgpa).toFixed(2) : 'N/A'}</span></td>
                    <td>${app.standing_arrears_count || 0}</td>
                    <td><span class="badge ${badgeClass}">${app.status}</span></td>
                    <td>
                        <select class="form-control" style="padding: 4px 8px; font-size: 12px;" onchange="updateAppStatus(${app.app_id}, this.value)">
                            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlist</option>
                            <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Select / Hired</option>
                            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Reject</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Load applications error:", e);
    }
}

async function updateAppStatus(appId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/admin/applications/status`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ application_id: appId, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showAdminAlert(`Candidate status updated to '${newStatus}'`, true);
            loadApplicationsList();
            loadDashboardStats();
        }
    } catch (e) {
        console.error(e);
    }
}
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
