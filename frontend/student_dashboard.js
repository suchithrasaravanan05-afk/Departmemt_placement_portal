// Always use the current origin — works on Vercel, custom domain, etc.
const API_BASE = `${window.location.origin}/api`;

let currentUser = null;
let currentToken = null;
let currentProfile = null;
let isNewUser = false; // true if no profile data saved yet

// =====================================================
// BOOT: auth check + load profile
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    currentToken = localStorage.getItem("token");
    currentUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!currentToken || !currentUser || currentUser.role !== "student") {
        window.location.href = "Form.html";
        return;
    }

    document.getElementById("displayUserName").innerText = currentUser.full_name || "Student";
    document.getElementById("displayUserReg").innerText = `Reg No: ${currentUser.register_number || "N/A"}`;
    document.getElementById("regNumberInput").value = currentUser.register_number || "";
    document.getElementById("stdNameInput").value = currentUser.full_name || "";
    document.getElementById("collegeEmailInput").value = currentUser.email || "";

    document.querySelectorAll(".gpa-field").forEach(input => {
        input.addEventListener("input", calculateCGPA);
    });

    handleYearChange();
    loadStudentProfile();
    loadPlacementDrives();
});

// =====================================================
// AUTH
// =====================================================
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "Form.html";
}

// =====================================================
// TAB NAVIGATION
// =====================================================
function switchTab(tabName) {
    ["profile", "drives", "applications", "gpa"].forEach(t => {
        const tabEl = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btnEl = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabEl) tabEl.classList.toggle("hidden", t !== tabName);
        if (btnEl) btnEl.classList.toggle("active", t === tabName);
    });
    if (tabName === "drives") loadPlacementDrives();
    if (tabName === "applications") loadAppliedDrivesTable();
    if (tabName === "gpa" && typeof loadSubjects === "function") loadSubjects();
}

// =====================================================
// ALERT
// =====================================================
function showStudentAlert(message, isSuccess = false) {
    const box = document.getElementById("studentAlert");
    box.innerText = message;
    box.style.backgroundColor = isSuccess ? "#dcfce7" : "#fee2e2";
    box.style.color = isSuccess ? "#15803d" : "#b91c1c";
    box.style.border = isSuccess ? "1px solid #bbf7d0" : "1px solid #fca5a5";
    box.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => box.classList.add("hidden"), 6000);
}

// =====================================================
// VIEW / EDIT MODE TOGGLES
// =====================================================
function enterEditMode() {
    document.getElementById("profileViewMode").classList.add("hidden");
    document.getElementById("profileEditMode").classList.remove("hidden");

    // Hide cancel button if new user (they haven't saved yet, nothing to cancel to)
    const cancelBtn = document.getElementById("cancelEditBtn");
    const cancelBtn2 = document.getElementById("cancelEditBtn2");
    if (isNewUser) {
        if (cancelBtn) cancelBtn.classList.add("hidden");
        if (cancelBtn2) cancelBtn2.classList.add("hidden");
    } else {
        if (cancelBtn) cancelBtn.classList.remove("hidden");
        if (cancelBtn2) cancelBtn2.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitEditMode() {
    if (isNewUser) return; // can't go back if no profile exists yet
    document.getElementById("profileEditMode").classList.add("hidden");
    document.getElementById("profileViewMode").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// =====================================================
// YEAR ΓåÆ GPA FIELDS ENABLE/DISABLE
// =====================================================
function handleYearChange() {
    const year = parseInt(document.getElementById("yearSelect").value || "3");
    const enabledSems = year * 2;

    for (let i = 1; i <= 8; i++) {
        const field = document.getElementById(`sem${i}Gpa`);
        if (!field) continue;
        if (i <= enabledSems) {
            field.disabled = false;
            field.parentElement.style.opacity = "1";
        } else {
            field.disabled = true;
            field.value = "";
            field.parentElement.style.opacity = "0.4";
        }
    }
    calculateCGPA();
}

// =====================================================
// CGPA AUTO CALCULATION
// =====================================================
function calculateCGPA() {
    let total = 0, count = 0;
    for (let i = 1; i <= 8; i++) {
        const f = document.getElementById(`sem${i}Gpa`);
        if (f && !f.disabled && f.value !== "") {
            const v = parseFloat(f.value);
            if (!isNaN(v) && v >= 0) { total += v; count++; }
        }
    }
    const cgpaField = document.getElementById("calculatedCgpa");
    if (count > 0) {
        cgpaField.value = (total / count).toFixed(2);
    } else {
        cgpaField.value = "";
    }
}

// =====================================================
// ARREARS TOGGLE
// =====================================================
function toggleArrearCounts() {
    const hv = document.getElementById("historyArrearsSelect").value;
    const sv = document.getElementById("standingArrearsSelect").value;
    document.getElementById("grpHistoryCount").classList.toggle("hidden", hv !== "yes");
    document.getElementById("grpStandingCount").classList.toggle("hidden", sv !== "yes");
}

// =====================================================
// LOAD PROFILE FROM API
// =====================================================
async function loadStudentProfile() {
    document.getElementById("profileLoading").classList.remove("hidden");
    document.getElementById("profileViewContent").classList.add("hidden");
    document.getElementById("noProfileState").classList.add("hidden");

    try {
        const res = await fetch(`${API_BASE}/student/profile/${currentUser.id}`, {
            headers: { "Authorization": `Bearer ${currentToken}` }
        });
        const data = await res.json();

        document.getElementById("profileLoading").classList.add("hidden");

        if (data.success && data.profile && data.profile.dob) {
            // Profile exists ΓÇö populate view and form
            currentProfile = data.profile;
            isNewUser = false;
            populateViewMode(data.profile);
            populateEditForm(data.profile);
            // Show read-only view
            document.getElementById("profileViewContent").classList.remove("hidden");
            document.getElementById("profileEditMode").classList.add("hidden");
            document.getElementById("profileViewMode").classList.remove("hidden");
        } else {
            // New user ΓÇö no profile saved
            isNewUser = true;
            document.getElementById("noProfileState").classList.remove("hidden");
            // Auto-open edit mode for new users
            setTimeout(() => {
                enterEditMode();
            }, 500);
        }
    } catch (e) {
        console.error("Load profile error:", e);
        document.getElementById("profileLoading").classList.add("hidden");
        isNewUser = true;
        document.getElementById("noProfileState").classList.remove("hidden");
        setTimeout(() => enterEditMode(), 500);
    }
}

// =====================================================
// POPULATE READ-ONLY VIEW
// =====================================================
function populateViewMode(p) {
    const val = (v) => (v && String(v).trim() !== "") ? v : null;

    // Header
    document.getElementById("viewName").innerText = currentUser.full_name || p.full_name || "---";
    document.getElementById("viewReg").innerText = `Register No: ${currentUser.register_number || "---"} | Year: ${p.year || currentUser.year || "---"}`;

    // CGPA
    const cgpa = val(p.cgpa);
    document.getElementById("viewCgpaNum").innerText = cgpa ? parseFloat(cgpa).toFixed(2) : "--";

    // Profile photo in avatar (Supabase public URL ΓÇö no SERVER_BASE prefix needed)
    if (val(p.profile_photo)) {
        document.getElementById("viewAvatar").innerHTML = `<img src="${p.profile_photo}" alt="Photo">`;
    } else {
        const initials = (currentUser.full_name || "S").split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
        document.getElementById("viewAvatar").innerText = initials;
    }

    // Personal
    setDetailValue("viewDob", val(p.dob));
    setDetailValue("viewYear", val(p.year) ? `Year ${p.year}` : null);
    setDetailValue("viewPersonalEmail", val(p.personal_email));
    setDetailValue("viewCollegeEmail", val(p.college_email));
    setDetailValue("viewPhone", val(p.phone_number));
    setDetailValue("viewWhatsapp", val(p.whatsapp_number));
    setDetailValue("viewDomain", val(p.domain_interest));

    // Academic
    setDetailValue("viewTenth", val(p.tenth_percentage) ? `${p.tenth_percentage}%` : null);
    setDetailValue("viewTwelth", val(p.twelth_percentage) ? `${p.twelth_percentage}%` : null);
    setDetailValue("viewDiploma", val(p.diploma_percentage) ? `${p.diploma_percentage}%` : "Not Applicable");
    setDetailValue("viewDegree", val(p.degree) || "B.Tech");

    // GPA chips
    const gpaGrid = document.getElementById("viewGpaGrid");
    gpaGrid.innerHTML = "";
    const year = parseInt(p.year || currentUser.year || 3);
    const enabledSems = year * 2;
    for (let i = 1; i <= 8; i++) {
        const gpaVal = p[`sem${i}_gpa`];
        const hasVal = gpaVal && parseFloat(gpaVal) > 0;
        const chip = document.createElement("div");
        chip.className = `gpa-chip${i > enabledSems ? " disabled" : ""}`;
        chip.innerHTML = `
            <div class="sem-label">Sem ${i}</div>
            <div class="sem-val">${i <= enabledSems ? (hasVal ? parseFloat(gpaVal).toFixed(1) : "--") : "N/A"}</div>
        `;
        gpaGrid.appendChild(chip);
    }

    // Arrears
    const ha = val(p.history_of_arrears) || "no";
    const sa = val(p.standing_of_arrears) || "no";
    document.getElementById("viewHistoryArrears").innerHTML = `<span class="arrears-badge ${ha === "yes" ? "arrears-has" : "arrears-none"}">${ha === "yes" ? "Yes" : "No Arrears"}</span>`;
    document.getElementById("viewHistoryCount").innerText = ha === "yes" ? (p.history_arrears_count || 0) : "ΓÇö";
    document.getElementById("viewStandingArrears").innerHTML = `<span class="arrears-badge ${sa === "yes" ? "arrears-has" : "arrears-none"}">${sa === "yes" ? "Yes" : "No Arrears"}</span>`;
    document.getElementById("viewStandingCount").innerText = sa === "yes" ? (p.standing_arrears_count || 0) : "ΓÇö";

    // Links & files
    const linkedin = val(p.linkedin_link);
    const github = val(p.github_link);
    const photo = val(p.profile_photo);
    const resume = val(p.resume_file);

    document.getElementById("viewLinkedin").innerHTML = linkedin ? `<a href="${linkedin}" target="_blank"><i class="fa-brands fa-linkedin"></i> View Profile</a>` : "<span class='empty'>Not Added</span>";
    document.getElementById("viewGithub").innerHTML = github ? `<a href="${github}" target="_blank"><i class="fa-brands fa-github"></i> View Profile</a>` : "<span class='empty'>Not Added</span>";
    // Supabase public URLs ΓÇö use directly without SERVER_BASE prefix
    document.getElementById("viewPhoto").innerHTML = photo ? `<a href="${photo}" target="_blank"><i class="fa-solid fa-image"></i> View Photo</a>` : "<span class='empty'>Not Uploaded</span>";
    document.getElementById("viewResume").innerHTML = resume ? `<a href="${resume}" target="_blank"><i class="fa-solid fa-file-pdf"></i> View Resume</a>` : "<span class='empty'>Not Uploaded</span>";
}

function setDetailValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value) {
        el.innerText = value;
        el.classList.remove("empty");
    } else {
        el.innerText = "Not provided";
        el.classList.add("empty");
    }
}

// =====================================================
// POPULATE EDIT FORM WITH EXISTING DATA
// =====================================================
function populateEditForm(p) {
    if (p.year) { document.getElementById("yearSelect").value = p.year; handleYearChange(); }
    if (p.dob) document.getElementById("dobInput").value = p.dob;
    if (p.personal_email) document.getElementById("personalEmailInput").value = p.personal_email;
    if (p.college_email) document.getElementById("collegeEmailInput").value = p.college_email;
    if (p.domain_interest) document.getElementById("domainInput").value = p.domain_interest;
    if (p.tenth_percentage) document.getElementById("tenthInput").value = p.tenth_percentage;
    if (p.twelth_percentage) document.getElementById("twelthInput").value = p.twelth_percentage;
    if (p.diploma_percentage) document.getElementById("diplomaInput").value = p.diploma_percentage;
    if (p.degree) document.getElementById("degreeInput").value = p.degree;

    for (let i = 1; i <= 8; i++) {
        const el = document.getElementById(`sem${i}Gpa`);
        if (el && !el.disabled && p[`sem${i}_gpa`]) el.value = p[`sem${i}_gpa`];
    }

    if (p.phone_number) document.getElementById("phoneInput").value = p.phone_number;
    if (p.whatsapp_number) document.getElementById("whatsappInput").value = p.whatsapp_number;
    if (p.history_of_arrears) document.getElementById("historyArrearsSelect").value = p.history_of_arrears;
    if (p.history_arrears_count) document.getElementById("historyArrearsCount").value = p.history_arrears_count;
    if (p.standing_of_arrears) document.getElementById("standingArrearsSelect").value = p.standing_of_arrears;
    if (p.standing_arrears_count) document.getElementById("standingArrearsCount").value = p.standing_arrears_count;
    if (p.linkedin_link) document.getElementById("linkedinInput").value = p.linkedin_link;
    if (p.github_link) document.getElementById("githubInput").value = p.github_link;

    toggleArrearCounts();
    calculateCGPA();

    // Supabase public URLs ΓÇö use directly without SERVER_BASE prefix
    if (p.profile_photo) document.getElementById("existingPhotoLink").innerHTML = `<a href="${p.profile_photo}" target="_blank">≡ƒô╖ View current photo</a>`;
    if (p.resume_file) document.getElementById("existingResumeLink").innerHTML = `<a href="${p.resume_file}" target="_blank">≡ƒôä View current resume</a>`;
}

// =====================================================
// SAVE PROFILE
// =====================================================
async function saveStudentProfile(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("user_id", currentUser.id);
    formData.append("dob", document.getElementById("dobInput").value);
    formData.append("personal_email", document.getElementById("personalEmailInput").value);
    formData.append("college_email", document.getElementById("collegeEmailInput").value);
    formData.append("domain_interest", document.getElementById("domainInput").value);
    formData.append("tenth_percentage", document.getElementById("tenthInput").value);
    formData.append("twelth_percentage", document.getElementById("twelthInput").value);
    formData.append("diploma_percentage", document.getElementById("diplomaInput").value);
    formData.append("degree", document.getElementById("degreeInput").value);
    formData.append("department", "CSBS");

    for (let i = 1; i <= 8; i++) {
        const f = document.getElementById(`sem${i}Gpa`);
        formData.append(`sem${i}_gpa`, (f && !f.disabled) ? (f.value || "") : "");
    }

    formData.append("cgpa", document.getElementById("calculatedCgpa").value);
    formData.append("phone_number", document.getElementById("phoneInput").value);
    formData.append("whatsapp_number", document.getElementById("whatsappInput").value);

    const hv = document.getElementById("historyArrearsSelect").value;
    const sv = document.getElementById("standingArrearsSelect").value;
    formData.append("history_of_arrears", hv);
    formData.append("history_arrears_count", hv === "yes" ? (document.getElementById("historyArrearsCount").value || 0) : 0);
    formData.append("standing_of_arrears", sv);
    formData.append("standing_arrears_count", sv === "yes" ? (document.getElementById("standingArrearsCount").value || 0) : 0);

    formData.append("linkedin_link", document.getElementById("linkedinInput").value);
    formData.append("github_link", document.getElementById("githubInput").value);

    const photoFile = document.getElementById("photoUpload").files[0];
    const resumeFile = document.getElementById("resumeUpload").files[0];

    // Pass existing Supabase URLs so backend preserves them if no new file is chosen
    if (currentProfile && currentProfile.profile_photo) {
        formData.append("existing_profile_photo", currentProfile.profile_photo);
    }
    if (currentProfile && currentProfile.resume_file) {
        formData.append("existing_resume_file", currentProfile.resume_file);
    }

    if (photoFile) formData.append("profile_photo", photoFile);
    if (resumeFile) formData.append("resume_file", resumeFile);

    try {
        const response = await fetch(`${API_BASE}/student/profile/save`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${currentToken}` },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            isNewUser = false;
            showStudentAlert("Γ£à Profile saved successfully!", true);
            // Reload profile and switch to view mode
            await loadStudentProfile();
        } else {
            showStudentAlert("Γ¥î " + (data.message || "Failed to save profile."));
        }
    } catch (e) {
        console.error(e);
        showStudentAlert("Γ¥î Server error. Please try again.");
    }
}

// =====================================================
// PLACEMENT DRIVES
// =====================================================
async function loadPlacementDrives() {
    try {
        const res = await fetch(`${API_BASE}/student/drives/${currentUser.id}`);
        const data = await res.json();
        const container = document.getElementById("drivesGridContainer");
        container.innerHTML = "";

        if (!data.success || !data.drives || data.drives.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted);">No placement drives posted currently.</p>`;
            return;
        }

        data.drives.forEach(drive => {
            const appliedStatus = drive.app_status;
            let statusBadge = appliedStatus
                ? `<span class="badge badge-green"><i class="fa-solid fa-check-circle"></i> ${appliedStatus}</span>`
                : `<span class="badge badge-blue">Open</span>`;
            let btnAction = appliedStatus
                ? `<button class="btn-success" disabled><i class="fa-solid fa-check"></i> Applied</button>`
                : `<button class="btn-primary" onclick="applyForDrive(${drive.id})"><i class="fa-solid fa-paper-plane"></i> Apply Now</button>`;

            const card = document.createElement("div");
            card.className = "drive-card";
            card.innerHTML = `
                <div>
                    <div class="drive-header">
                        <div class="company-title">${drive.company_name}</div>
                        ${statusBadge}
                    </div>
                    <div class="job-role-text">${drive.job_role}</div>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${drive.description || ""}</p>
                    <div class="drive-meta">
                        <div class="meta-item"><span class="meta-label">Package CTC</span><span class="meta-val" style="color: var(--success);">${drive.package_ctc}</span></div>
                        <div class="meta-item"><span class="meta-label">Min CGPA</span><span class="meta-val">${drive.min_cgpa || "None"}</span></div>
                        <div class="meta-item"><span class="meta-label">Max Arrears</span><span class="meta-val">${drive.max_standing_arrears ?? "Any"}</span></div>
                        <div class="meta-item"><span class="meta-label">Location</span><span class="meta-val">${drive.job_location || "Flexible"}</span></div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                    <span style="font-size: 12px; color: var(--text-muted);">Deadline: ${drive.deadline || "N/A"}</span>
                    ${btnAction}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Load drives error:", e);
    }
}

async function applyForDrive(driveId) {
    try {
        const res = await fetch(`${API_BASE}/student/drives/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` },
            body: JSON.stringify({ drive_id: driveId, user_id: currentUser.id })
        });
        const data = await res.json();
        if (data.success) {
            showStudentAlert(data.message, true);
            loadPlacementDrives();
        } else {
            showStudentAlert(data.message);
        }
    } catch (e) {
        showStudentAlert("Error applying for drive.");
    }
}

async function loadAppliedDrivesTable() {
    try {
        const res = await fetch(`${API_BASE}/student/drives/${currentUser.id}`);
        const data = await res.json();
        const tbody = document.getElementById("appliedDrivesTableBody");
        tbody.innerHTML = "";

        const applied = (data.drives || []).filter(d => d.app_status);
        if (applied.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">You haven't applied to any drives yet.</td></tr>`;
            return;
        }

        applied.forEach(d => {
            const badgeClass = { Selected: "badge-green", Shortlisted: "badge-yellow", Rejected: "badge-red" }[d.app_status] || "badge-blue";
            tbody.innerHTML += `
                <tr>
                    <td><strong>${d.company_name}</strong></td>
                    <td>${d.job_role}</td>
                    <td style="color: var(--success); font-weight: 700;">${d.package_ctc}</td>
                    <td>${d.applied_at ? new Date(d.applied_at).toLocaleDateString() : "Recently"}</td>
                    <td><span class="badge ${badgeClass}">${d.app_status}</span></td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Load applied drives error:", e);
    }
}
