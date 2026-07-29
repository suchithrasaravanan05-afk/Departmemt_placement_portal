const API_BASE = "http://localhost:5500/api";

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
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 30px;">No student records found matching filters.</td></tr>`;
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
                resumeLink = `<a href="http://localhost:5500${s.resume_file}" target="_blank" class="btn-success" style="padding: 4px 10px; font-size: 11px;"><i class="fa-solid fa-download"></i> Resume</a>`;
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
                </tr>
            `;
        });
    } catch (e) {
        console.error("Fetch roster error:", e);
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

    const excelData = currentFetchedStudents.map(s => ({
        "Year": s.year || "N/A",
        "Register Number": s.register_number || "N/A",
        "Student Name": s.full_name,
        "Email ID": s.email,
        "Phone": s.phone || "N/A",
        "CGPA": s.cgpa || "N/A",
        "10th %": s.tenth_percentage || "N/A",
        "12th %": s.twelth_percentage || "N/A",
        "Standing Arrears": s.standing_arrears_count || 0,
        "Domain Interest": s.domain_interest || "N/A",
        "LinkedIn": s.linkedin_link || "N/A",
        "GitHub": s.github_link || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CSBS Students");

    const yearFilter = document.getElementById("filterYear").value || "All";
    XLSX.writeFile(workbook, `CSBS_Students_Year_${yearFilter}_Roster.xlsx`);
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
