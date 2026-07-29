const API_BASE = "/api/student";

// =========================================================
// Guard: only a logged-in student gets to see this page.
// (Set by Form.js on successful student login.)
// =========================================================
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!currentUser || currentUser.role === "admin") {
    alert("Please login first.");
    window.location.href = "Form.html";
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("adminToken");
    window.location.href = "Form.html";
}

window.logout = logout;

// =========================================================
// Prefill read-only account fields from the logged-in user
// =========================================================
document.getElementById("yearDisplay").value = currentUser.year || "";
document.getElementById("regDisplay").value = currentUser.register_number || "";
document.getElementById("nameDisplay").value = currentUser.full_name || "";
document.getElementById("departmentDisplay").value = currentUser.department_code || "";
document.getElementById("collegeEmail").value = currentUser.email || "";

// =========================================================
// Arrears show/hide
// =========================================================
document.addEventListener("DOMContentLoaded", function () {

    const history = document.getElementById("historyArrears");
    const historyBox = document.getElementById("historyBox");

    const standing = document.getElementById("standingArrears");
    const standingBox = document.getElementById("standingBox");

    history.addEventListener("change", function () {
        historyBox.classList.toggle("hidden", this.value !== "yes");
    });

    standing.addEventListener("change", function () {
        standingBox.classList.toggle("hidden", this.value !== "yes");
    });

});

// =========================================================
// CGPA auto-calculation from whichever semester GPAs are filled
// =========================================================
const gpaInputs = document.querySelectorAll(".gpa");
const cgpaField = document.getElementById("cgpa");

function calculateCGPA() {
    let total = 0;
    let count = 0;

    gpaInputs.forEach(input => {
        if (input.value !== "") {
            const gpa = parseFloat(input.value);
            if (!isNaN(gpa)) {
                total += gpa;
                count++;
            }
        }
    });

    cgpaField.value = count > 0 ? (total / count).toFixed(2) : "";
}

gpaInputs.forEach(input => {
    input.addEventListener("input", calculateCGPA);
});

// =========================================================
// File size guard (10 MB)
// =========================================================
document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener("change", () => {
        if (input.files[0] && input.files[0].size > 10 * 1024 * 1024) {
            alert("File size must be under 10 MB");
            input.value = "";
        }
    });
});

// =========================================================
// View switching between the form and the submitted-details summary
// =========================================================
function showFormView() {
    document.getElementById("detailsView").classList.add("hidden");
    document.getElementById("formView").classList.remove("hidden");
}

function showDetailsView() {
    document.getElementById("formView").classList.add("hidden");
    document.getElementById("detailsView").classList.remove("hidden");
}

function renderDetails(p) {
    const row = (label, value) => `<div><strong>${label}:</strong> ${value ?? "-"}</div>`;

    document.getElementById("detailsContent").innerHTML = `
        ${row("Name", p.full_name)}
        ${row("Register No", p.register_number)}
        ${row("Year", p.year)}
        ${row("Date of Birth", p.dob ? p.dob.substring(0, 10) : null)}
        ${row("Personal Email", p.personal_email)}
        ${row("College Email", p.college_email || p.account_email)}
        ${row("Domain Interested", p.domain_interested)}
        ${row("Degree", p.degree)}
        ${row("10th %", p.tenth_percentage)}
        ${row("12th %", p.twelfth_percentage)}
        ${row("Diploma %", p.diploma_percentage)}
        ${row("CGPA", p.cgpa)}
        ${row("Phone", p.phone_number)}
        ${row("WhatsApp", p.whatsapp_number)}
        ${row("History Arrears", p.history_of_arrears === "yes" ? p.history_arrears_count : "No")}
        ${row("Standing Arrears", p.standing_of_arrears === "yes" ? p.standing_arrears_count : "No")}
        ${row("LinkedIn", p.linkedin_link ? `<a href="${p.linkedin_link}" target="_blank">Link</a>` : "-")}
        ${row("GitHub", p.github_link ? `<a href="${p.github_link}" target="_blank">Link</a>` : "-")}
        ${row("Resume", p.resume_file ? `<a href="${API_BASE.replace("/api/student","")}/uploads/${p.resume_file}" target="_blank">Download</a>` : "Not uploaded")}
        ${row("Photo", p.profile_photo ? `<a href="${API_BASE.replace("/api/student","")}/uploads/${p.profile_photo}" target="_blank">View</a>` : "Not uploaded")}
    `;
}

function prefillForm(p) {
    if (p.dob) document.getElementById("dob").value = p.dob.substring(0, 10);
    if (p.personal_email) document.getElementById("personalEmail").value = p.personal_email;
    if (p.domain_interested) document.getElementById("domainInterested").value = p.domain_interested;
    if (p.tenth_percentage) document.getElementById("tenthPercentage").value = p.tenth_percentage;
    if (p.twelfth_percentage) document.getElementById("twelfthPercentage").value = p.twelfth_percentage;
    if (p.diploma_percentage) document.getElementById("diplomaPercentage").value = p.diploma_percentage;
    if (p.degree) document.getElementById("degree").value = p.degree;
    if (p.sem1_gpa) document.getElementById("sem1Gpa").value = p.sem1_gpa;
    if (p.sem2_gpa) document.getElementById("sem2Gpa").value = p.sem2_gpa;
    if (p.sem3_gpa) document.getElementById("sem3Gpa").value = p.sem3_gpa;
    if (p.sem4_gpa) document.getElementById("sem4Gpa").value = p.sem4_gpa;
    if (p.sem5_gpa) document.getElementById("sem5Gpa").value = p.sem5_gpa;
    if (p.sem6_gpa) document.getElementById("sem6Gpa").value = p.sem6_gpa;
    if (p.sem7_gpa) document.getElementById("sem7Gpa").value = p.sem7_gpa;
    if (p.sem8_gpa) document.getElementById("sem8Gpa").value = p.sem8_gpa;
    if (p.cgpa) document.getElementById("cgpa").value = p.cgpa;
    if (p.phone_number) document.getElementById("phoneNumber").value = p.phone_number;
    if (p.whatsapp_number) document.getElementById("whatsappNumber").value = p.whatsapp_number;
    if (p.history_of_arrears) {
        document.getElementById("historyArrears").value = p.history_of_arrears;
        document.getElementById("historyBox").classList.toggle("hidden", p.history_of_arrears !== "yes");
        document.getElementById("historyArrearsCount").value = p.history_arrears_count || "";
    }
    if (p.standing_of_arrears) {
        document.getElementById("standingArrears").value = p.standing_of_arrears;
        document.getElementById("standingBox").classList.toggle("hidden", p.standing_of_arrears !== "yes");
        document.getElementById("standingArrearsCount").value = p.standing_arrears_count || "";
    }
    if (p.linkedin_link) document.getElementById("linkedinLink").value = p.linkedin_link;
    if (p.github_link) document.getElementById("githubLink").value = p.github_link;
}

// Check on load whether this student already has a saved profile -
// if so, prefill the form (for editing) and show the details view.
fetch(`${API_BASE}/profile/${currentUser.id}`)
    .then(async response => {
        const data = await response.json();
        if (data.success && data.profile && data.profile.user_id) {
            prefillForm(data.profile);
            renderDetails(data.profile);
            showDetailsView();
        }
    })
    .catch(error => console.error(error));

// =========================================================
// Submit profile
// =========================================================
const form = document.getElementById("profileForm");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("user_id", currentUser.id);
    formData.append("dob", document.getElementById("dob").value);
    formData.append("personal_email", document.getElementById("personalEmail").value.trim());
    formData.append("college_email", document.getElementById("collegeEmail").value.trim());
    formData.append("domain_interested", document.getElementById("domainInterested").value.trim());
    formData.append("tenth_percentage", document.getElementById("tenthPercentage").value);
    formData.append("twelfth_percentage", document.getElementById("twelfthPercentage").value);
    formData.append("diploma_percentage", document.getElementById("diplomaPercentage").value);
    formData.append("degree", document.getElementById("degree").value);
    formData.append("sem1_gpa", document.getElementById("sem1Gpa").value);
    formData.append("sem2_gpa", document.getElementById("sem2Gpa").value);
    formData.append("sem3_gpa", document.getElementById("sem3Gpa").value);
    formData.append("sem4_gpa", document.getElementById("sem4Gpa").value);
    formData.append("sem5_gpa", document.getElementById("sem5Gpa").value);
    formData.append("sem6_gpa", document.getElementById("sem6Gpa").value);
    formData.append("sem7_gpa", document.getElementById("sem7Gpa").value);
    formData.append("sem8_gpa", document.getElementById("sem8Gpa").value);
    formData.append("cgpa", document.getElementById("cgpa").value);
    formData.append("phone_number", document.getElementById("phoneNumber").value.trim());
    formData.append("whatsapp_number", document.getElementById("whatsappNumber").value.trim());
    formData.append("history_of_arrears", document.getElementById("historyArrears").value);
    formData.append("history_arrears_count", document.getElementById("historyArrearsCount").value || 0);
    formData.append("standing_of_arrears", document.getElementById("standingArrears").value);
    formData.append("standing_arrears_count", document.getElementById("standingArrearsCount").value || 0);
    formData.append("linkedin_link", document.getElementById("linkedinLink").value.trim());
    formData.append("github_link", document.getElementById("githubLink").value.trim());

    const photo = document.getElementById("profilePhoto").files[0];
    const resume = document.getElementById("resumeFile").files[0];

    if (photo) formData.append("profile_photo", photo);
    if (resume) formData.append("resume_file", resume);

    fetch(`${API_BASE}/profile`, {
        method: "POST",
        body: formData
    })
    .then(async response => {
        const data = await response.json();
        alert(data.message);

        if (data.success) {
            // Refetch to get the freshly saved data (including file names)
            // and show the summary view instead of leaving the form open.
            fetch(`${API_BASE}/profile/${currentUser.id}`)
                .then(async res2 => {
                    const data2 = await res2.json();
                    if (data2.success) {
                        renderDetails(data2.profile);
                        showDetailsView();
                    }
                })
                .catch(err => console.error(err));
        }
    })
    .catch(error => {
        console.error(error);
        alert("Server not reachable.");
    });
});