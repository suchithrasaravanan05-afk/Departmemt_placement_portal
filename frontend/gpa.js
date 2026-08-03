// Grade Points (Anna University)
const gradePoints = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "U": 0
};

// Anna University CSBS Syllabus Data
const syllabus = {
    "2021": {
        "CSBS": {
            "Regular": {
                "Semester 1": [
                    { code: "HS3152 - Professional English - I", credit: 3 },
                    { code: "MA3151 - Matrices and Calculus", credit: 4 },
                    { code: "PH3151 - Engineering Physics", credit: 3 },
                    { code: "CY3151 - Engineering Chemistry", credit: 3 },
                    { code: "GE3151 - Problem Solving and Python", credit: 3 },
                    { code: "GE3152 - Heritage of Tamils", credit: 1 },
                    { code: "GE3171 - Python Programming Lab", credit: 2 },
                    { code: "BS3171 - Physics & Chemistry Lab", credit: 2 },
                    { code: "GE3172 - English Laboratory", credit: 1 }
                ],
                "Semester 2": [
                    { code: "HS3252 - Professional English - II", credit: 2 },
                    { code: "MA3251 - Statistics and Numerical Methods", credit: 4 },
                    { code: "PH3256 - Physics for Info Science", credit: 3 },
                    { code: "BE3251 - Basic Electrical Engineering", credit: 3 },
                    { code: "GE3251 - Engineering Graphics", credit: 4 },
                    { code: "AD3251 - Data Structures Design", credit: 3 },
                    { code: "GE3252 - Tamils and Technology", credit: 1 },
                    { code: "GE3271 - Engineering Practices Lab", credit: 2 },
                    { code: "AD3271 - Data Structures Lab", credit: 2 },
                    { code: "GE3272 - Communication Laboratory", credit: 2 }
                ],
                "Semester 3": [
                    { code: "MA3354 - Discrete Mathematics", credit: 4 },
                    { code: "CS3351 - Digital Principles & Org", credit: 4 },
                    { code: "CW3301 - Fundamentals of Economics", credit: 3 },
                    { code: "CS3391 - Object Oriented Programming", credit: 3 },
                    { code: "AD3351 - Design & Analysis of Algo", credit: 4 },
                    { code: "AD3491 - Fundamentals of Data Science", credit: 3 },
                    { code: "CW3311 - Economics Lab", credit: 1.5 },
                    { code: "CS3381 - OOP Laboratory", credit: 1.5 },
                    { code: "GE3361 - Professional Development", credit: 1 }
                ],
                "Semester 4": [
                    { code: "MA3391 - Probability & Statistics", credit: 4 },
                    { code: "CS3492 - Database Management Systems", credit: 3 },
                    { code: "AL3452 - Operating Systems Concepts", credit: 4 },
                    { code: "CW3401 - Introduction to Business", credit: 3 },
                    { code: "AL3451 - Machine Learning Essentials", credit: 3 },
                    { code: "GE3451 - Environmental Sciences", credit: 2 },
                    { code: "CS3481 - DBMS Laboratory", credit: 1.5 },
                    { code: "AD3461 - ML Laboratory", credit: 2 },
                    { code: "CW3411 - Business Communication Lab", credit: 1.5 }
                ],
                "Semester 5": [
                    { code: "CS3691 - Embedded Systems & IoT", credit: 4 },
                    { code: "CW3501 - Financial Management", credit: 3 },
                    { code: "CW3551 - Business Strategy", credit: 3 },
                    { code: "CCS335 - Cloud Computing", credit: 3 },
                    { code: "CCW332 - Enterprise Systems", credit: 3 },
                    { code: "CW3511 - Financial Analytics Lab", credit: 2 },
                    { code: "MX3084 - Disaster Management", credit: 0 }
                ],
                "Semester 6": [
                    { code: "CW3601 - Human Resource Management", credit: 3 },
                    { code: "CCS356 - Software Engineering", credit: 4 },
                    { code: "CW3551 - Marketing Management", credit: 3 },
                    { code: "CCS339 - Cyber Security", credit: 3 },
                    { code: "CCS361 - Robotic Process Automation", credit: 3 },
                    { code: "CW3006 - Operations Research", credit: 3 },
                    { code: "OCE351 - Renewable Energy", credit: 3 },
                    { code: "CCS367 - Web Tech for Business", credit: 3 },
                    { code: "MX3089 - Industrial Safety", credit: 0 }
                ],
                "Semester 7": [
                    { code: "GE3791 - Human Values & Ethics", credit: 2 },
                    { code: "GE3754 - Business Analytics", credit: 3 },
                    { code: "OMG351 - Supply Chain Management", credit: 3 },
                    { code: "OMR351 - Innovation & Tech", credit: 3 },
                    { code: "CBM370 - Business Capstone", credit: 3 }
                ],
                "Semester 8": [
                    { code: "CW3811 - Project Work / Internship", credit: 10 }
                ]
            },
            "Honours": {
                "Semester 5": [
                    { code: "CCS369 - Advanced AI & Deep Learning", credit: 3 },
                    { code: "CCS334 - Big Data Analytics", credit: 3 }
                ],
                "Semester 6": [
                    { code: "CCD334 - Fintech & Blockchain", credit: 3 },
                    { code: "CW3007 - Digital Marketing & Analytics", credit: 3 }
                ],
                "Semester 7": [
                    { code: "CW3003 - Quantum Computing Fundamentals", credit: 3 },
                    { code: "CCS372 - Cloud Architecture", credit: 3 }
                ]
            }
        }
    },
    "2025": {
        "CSBS": {
            "Regular": {
                "Semester 1": [
                    { code: "HS3152 - Technical English", credit: 3 },
                    { code: "MA3151 - Matrices & Calculus", credit: 4 },
                    { code: "PH3151 - Physics for Engineers", credit: 3 },
                    { code: "CY3151 - Chemistry for Engineers", credit: 3 },
                    { code: "GE3151 - Python Programming", credit: 3 },
                    { code: "GE3152 - Heritage of Tamils", credit: 1 },
                    { code: "GE3171 - Python Lab", credit: 2 },
                    { code: "BS3171 - Physics & Chemistry Lab", credit: 2 },
                    { code: "GE3172 - Language Lab", credit: 1 }
                ],
                "Semester 2": [
                    { code: "HS3252 - Professional English II", credit: 2 },
                    { code: "MA3251 - Statistics & Numerical Methods", credit: 4 },
                    { code: "PH3256 - Physics for Info Science", credit: 3 },
                    { code: "BE3251 - Electrical Engineering", credit: 3 },
                    { code: "GE3251 - Engineering Graphics", credit: 4 },
                    { code: "AD3251 - Data Structures Design", credit: 3 },
                    { code: "GE3252 - Tamils & Tech", credit: 1 },
                    { code: "GE3271 - Engineering Practices Lab", credit: 2 },
                    { code: "AD3271 - Data Structures Lab", credit: 2 }
                ],
                "Semester 3": [
                    { code: "MA3354 - Discrete Math", credit: 4 },
                    { code: "CS3351 - Digital Principles", credit: 4 },
                    { code: "CW3301 - Micro & Macro Economics", credit: 3 },
                    { code: "CS3391 - Object Oriented Programming", credit: 3 },
                    { code: "AD3351 - Design & Analysis of Algo", credit: 4 },
                    { code: "CW3311 - Business Economics Lab", credit: 1.5 },
                    { code: "CS3381 - OOP Lab", credit: 1.5 }
                ],
                "Semester 4": [
                    { code: "MA3391 - Probability & Statistics", credit: 4 },
                    { code: "CS3492 - DBMS", credit: 3 },
                    { code: "AL3452 - Operating Systems", credit: 4 },
                    { code: "CW3401 - Fundamentals of Finance", credit: 3 },
                    { code: "AL3451 - Machine Learning", credit: 3 },
                    { code: "CS3481 - DBMS Lab", credit: 1.5 },
                    { code: "CW3411 - Financial Tech Lab", credit: 1.5 }
                ],
                "Semester 5": [
                    { code: "CS3691 - IoT & Embedded Systems", credit: 4 },
                    { code: "CW3501 - Financial Management", credit: 3 },
                    { code: "CW3551 - Business Strategy", credit: 3 },
                    { code: "CCS335 - Cloud Computing", credit: 3 },
                    { code: "CW3511 - Business Analytics Lab", credit: 2 }
                ],
                "Semester 6": [
                    { code: "CW3601 - Human Resource Management", credit: 3 },
                    { code: "CCS356 - Software Engineering", credit: 4 },
                    { code: "CCS339 - Cyber Security", credit: 3 },
                    { code: "CCS361 - Robotic Process Automation", credit: 3 }
                ],
                "Semester 7": [
                    { code: "GE3791 - Human Values", credit: 2 },
                    { code: "GE3754 - Business Analytics", credit: 3 },
                    { code: "OMG351 - Supply Chain", credit: 3 }
                ],
                "Semester 8": [
                    { code: "CW3811 - Project Work", credit: 10 }
                ]
            },
            "Honours": {
                "Semester 5": [{ code: "CCS369 - Advanced AI", credit: 3 }],
                "Semester 6": [{ code: "CCD334 - Fintech", credit: 3 }],
                "Semester 7": [{ code: "CW3003 - Quantum Tech", credit: 3 }]
            }
        }
    }
};

// DOM References
document.addEventListener("DOMContentLoaded", () => {
    initGpaCalculator();
});

function initGpaCalculator() {
    const regulationSelect = document.getElementById("regulation");
    const departmentSelect = document.getElementById("department");
    const semesterSelect = document.getElementById("semester");
    const courseTypeSelect = document.getElementById("courseType");
    const calculateBtn = document.getElementById("calculateBtn");
    const resetBtn = document.getElementById("resetBtn");
    const calculateCgpaBtn = document.getElementById("calculateCgpaBtn");
    const resetCgpaBtn = document.getElementById("resetCgpaBtn");

    if (regulationSelect) regulationSelect.addEventListener("change", loadSubjects);
    if (departmentSelect) departmentSelect.addEventListener("change", loadSubjects);
    if (semesterSelect) {
        semesterSelect.addEventListener("change", () => {
            toggleCourseType();
            const sem = semesterSelect.value;
            if (["Semester 1", "Semester 2", "Semester 3", "Semester 4"].includes(sem)) {
                loadSubjects();
            } else {
                const subContainer = document.getElementById("subjectsContainer");
                if (subContainer) subContainer.innerHTML = "";
            }
        });
    }
    if (courseTypeSelect) courseTypeSelect.addEventListener("change", loadSubjects);

    if (calculateBtn) calculateBtn.addEventListener("click", calculateGPA);
    if (resetBtn) resetBtn.addEventListener("click", resetGPA);

    if (calculateCgpaBtn) calculateCgpaBtn.addEventListener("click", calculateCGPAOverall);
    if (resetCgpaBtn) resetCgpaBtn.addEventListener("click", resetCGPAOverall);

    toggleCourseType();
}

function switchCalcMode(mode) {
    const gpaSection = document.getElementById("gpaCalcSection");
    const cgpaSection = document.getElementById("cgpaCalcSection");
    const tabGpaBtn = document.getElementById("tabModeGpa");
    const tabCgpaBtn = document.getElementById("tabModeCgpa");

    if (mode === "gpa") {
        if (gpaSection) gpaSection.classList.remove("hidden");
        if (cgpaSection) cgpaSection.classList.add("hidden");
        if (tabGpaBtn) tabGpaBtn.classList.add("active");
        if (tabCgpaBtn) tabCgpaBtn.classList.remove("active");
    } else {
        if (gpaSection) gpaSection.classList.add("hidden");
        if (cgpaSection) cgpaSection.classList.remove("hidden");
        if (tabGpaBtn) tabGpaBtn.classList.remove("active");
        if (tabCgpaBtn) tabCgpaBtn.classList.add("active");
    }
}

function createHeading(title) {
    const subjectContainer = document.getElementById("subjectsContainer");
    if (!subjectContainer) return;
    const heading = document.createElement("h3");
    heading.innerHTML = title;
    heading.style.margin = "20px 0 10px";
    heading.style.color = "#1d3853";
    heading.style.fontSize = "16px";
    heading.style.borderBottom = "2px solid #e2e8f0";
    heading.style.paddingBottom = "5px";
    subjectContainer.appendChild(heading);
}

function createSubjectRow(subject) {
    const subjectContainer = document.getElementById("subjectsContainer");
    if (!subjectContainer) return;

    const row = document.createElement("div");
    row.className = "subject-row";
    row.innerHTML = `
        <input type="text" class="subjectCode" value="${subject.code}" title="${subject.code}" readonly>
        <input type="number" class="credit" value="${subject.credit}" readonly>
        <select class="grade" required>
            <option value="">Grade</option>
            <option value="O">O (10)</option>
            <option value="A+">A+ (9)</option>
            <option value="A">A (8)</option>
            <option value="B+">B+ (7)</option>
            <option value="B">B (6)</option>
            <option value="C">C (5)</option>
            <option value="U">U (0 - Arrear)</option>
        </select>
    `;
    subjectContainer.appendChild(row);
}

function toggleCourseType() {
    const semesterSelect = document.getElementById("semester");
    const section = document.getElementById("courseTypeSection");
    const courseType = document.getElementById("courseType");
    const subjectContainer = document.getElementById("subjectsContainer");

    if (!semesterSelect || !section || !courseType) return;

    const semester = semesterSelect.value;
    if (["Semester 5", "Semester 6", "Semester 7", "Semester 8"].includes(semester)) {
        section.style.display = "block";
        courseType.selectedIndex = 0;
        if (subjectContainer) subjectContainer.innerHTML = "";
    } else {
        section.style.display = "none";
        courseType.value = "Regular";
    }
}

function loadSubjects() {
    const regulation = document.getElementById("regulation")?.value;
    const department = document.getElementById("department")?.value;
    const semester = document.getElementById("semester")?.value;
    const subjectContainer = document.getElementById("subjectsContainer");

    if (!subjectContainer) return;
    subjectContainer.innerHTML = "";

    if (!regulation || !department || !semester) {
        return;
    }

    const isHighSem = ["Semester 5", "Semester 6", "Semester 7", "Semester 8"].includes(semester);
    const courseTypeSection = document.getElementById("courseTypeSection");
    const courseTypeVal = document.getElementById("courseType")?.value;

    if (isHighSem && courseTypeSection && courseTypeSection.style.display !== "none" && !courseTypeVal) {
        return;
    }

    const courseType = courseTypeVal || "Regular";
    const regData = syllabus[regulation] || syllabus["2021"];
    const deptData = regData[department] || regData["CSBS"];

    const regularSubjects = deptData?.["Regular"]?.[semester] || [];
    const honoursSubjects = deptData?.["Honours"]?.[semester] || [];

    if (regularSubjects.length === 0 && honoursSubjects.length === 0) {
        subjectContainer.innerHTML = `<p style="padding: 15px; text-align: center; color: #64748b;">No subjects found for ${semester} under Regulation ${regulation}.</p>`;
        return;
    }

    if (courseType === "Regular") {
        createHeading("Regular Subjects");
        regularSubjects.forEach(subject => createSubjectRow(subject));
    } else {
        createHeading("Regular Subjects");
        regularSubjects.forEach(subject => createSubjectRow(subject));

        if (honoursSubjects.length > 0) {
            createHeading("Honours Subjects");
            honoursSubjects.forEach(subject => createSubjectRow(subject));
        }
    }
}

function calculateGPA() {
    const rows = document.querySelectorAll("#subjectsContainer .subject-row");
    const gpaResultEl = document.getElementById("gpaResult");
    if (!gpaResultEl) return;

    if (rows.length === 0) {
        alert("Please select Regulation, Department, Semester and Course Type to view subjects.");
        return;
    }

    let totalCredits = 0;
    let totalCreditPoints = 0;
    let hasEmptyGrade = false;
    let arrearsCount = 0;

    rows.forEach(row => {
        const credit = parseFloat(row.querySelector(".credit").value);
        const grade = row.querySelector(".grade").value;

        if (!grade) {
            hasEmptyGrade = true;
        } else if (!isNaN(credit)) {
            if (grade === "U") arrearsCount++;
            totalCredits += credit;
            totalCreditPoints += credit * (gradePoints[grade] || 0);
        }
    });

    if (hasEmptyGrade) {
        alert("Please select a Grade for all subjects before calculating.");
        return;
    }

    if (totalCredits === 0) {
        alert("Total credits cannot be zero.");
        return;
    }

    const gpa = totalCreditPoints / totalCredits;
    gpaResultEl.innerText = gpa.toFixed(2);

    const badge = document.getElementById("gpaBadge");
    if (badge) {
        if (arrearsCount > 0) {
            badge.className = "result-badge warning";
            badge.innerText = `GPA: ${gpa.toFixed(2)} (${arrearsCount} Arrear(s) Selected)`;
        } else {
            badge.className = "result-badge pass";
            badge.innerText = `GPA: ${gpa.toFixed(2)} — All Subjects Passed! 🎉`;
        }
    }
}

function resetGPA() {
    const reg = document.getElementById("regulation");
    const dept = document.getElementById("department");
    const sem = document.getElementById("semester");
    const ct = document.getElementById("courseType");
    const container = document.getElementById("subjectsContainer");
    const result = document.getElementById("gpaResult");
    const badge = document.getElementById("gpaBadge");

    if (reg) reg.selectedIndex = 0;
    if (dept) dept.selectedIndex = 0;
    if (sem) sem.selectedIndex = 0;
    if (ct) ct.selectedIndex = 0;
    toggleCourseType();

    if (container) container.innerHTML = "";
    if (result) result.innerText = "0.00";
    if (badge) {
        badge.innerText = "";
        badge.className = "result-badge";
    }
}

// CGPA Overall Calculation across semesters
function calculateCGPAOverall() {
    let totalGpaSum = 0;
    let semCount = 0;

    for (let i = 1; i <= 8; i++) {
        const semInput = document.getElementById(`cgpaSem${i}`);
        if (semInput && semInput.value !== "") {
            const val = parseFloat(semInput.value);
            if (!isNaN(val) && val >= 0 && val <= 10) {
                totalGpaSum += val;
                semCount++;
            }
        }
    }

    const resultEl = document.getElementById("cgpaResult");
    const badgeEl = document.getElementById("cgpaBadge");

    if (semCount === 0) {
        alert("Please enter at least one Semester GPA to calculate CGPA.");
        return;
    }

    const cgpa = totalGpaSum / semCount;
    if (resultEl) resultEl.innerText = cgpa.toFixed(2);
    if (badgeEl) {
        badgeEl.className = "result-badge pass";
        badgeEl.innerText = `Cumulative CGPA over ${semCount} semester(s): ${cgpa.toFixed(2)}`;
    }
}

function resetCGPAOverall() {
    for (let i = 1; i <= 8; i++) {
        const semInput = document.getElementById(`cgpaSem${i}`);
        if (semInput) semInput.value = "";
    }
    const resultEl = document.getElementById("cgpaResult");
    const badgeEl = document.getElementById("cgpaBadge");

    if (resultEl) resultEl.innerText = "0.00";
    if (badgeEl) {
        badgeEl.innerText = "";
        badgeEl.className = "result-badge";
    }
}
