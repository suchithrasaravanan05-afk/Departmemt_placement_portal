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

const subjectContainer = document.getElementById("subjectsContainer");

const calculateBtn = document.getElementById("calculateBtn");
const resetBtn = document.getElementById("resetBtn");
function createHeading(title) {

    const heading = document.createElement("h3");

    heading.innerHTML = title;

    heading.style.margin = "20px 0 10px";

    heading.style.color = "#1d3853";

    subjectContainer.appendChild(heading);

}

function createSubjectRow(subject) {

    const row = document.createElement("div");

    row.className = "subject-row";

    row.innerHTML = `
        <input type="text"
               class="subjectCode"
               value="${subject.code}"
               readonly>

        <input type="number"
               class="credit"
               value="${subject.credit}"
               readonly>

        <select class="grade">
            <option value="">Grade</option>
            <option value="O">O</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B+">B+</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="U">U</option>
        </select>
    `;

    subjectContainer.appendChild(row);

}
// Function

function loadSubjects() {

    const regulation = document.getElementById("regulation").value;
    const department = document.getElementById("department").value;
    const semester = document.getElementById("semester").value;

    subjectContainer.innerHTML = "";

    if (!regulation || !department || !semester) {
    return;
}

// For Semester 5–8, wait until Course Type is selected
if (
    (semester === "Semester 5" ||
     semester === "Semester 6" ||
     semester === "Semester 7" ||
     semester === "Semester 8") &&
    document.getElementById("courseTypeSection").style.display === "block" &&
    !document.getElementById("courseType").value
) {
    return;
}

    const courseType = document.getElementById("courseType").value;

const regularSubjects =
    syllabus?.[regulation]?.[department]?.["Regular"]?.[semester] || [];

const honoursSubjects =
    syllabus?.[regulation]?.[department]?.["Honours"]?.[semester] || [];

let subjects = [];

if (courseType === "Regular") {
    subjects = regularSubjects;
} else {
    // Honours students see both Regular + Honours subjects
    subjects = [...regularSubjects, ...honoursSubjects];
}

    if (courseType === "Regular") {

    createHeading("Regular Subjects");

    regularSubjects.forEach(subject => {
        createSubjectRow(subject);
    });

} else {

    createHeading("Regular Subjects");

    regularSubjects.forEach(subject => {
        createSubjectRow(subject);
    });

    if (honoursSubjects.length > 0) {

        createHeading("Honours Subjects");

        honoursSubjects.forEach(subject => {
            createSubjectRow(subject);
        });

    }

}
}

// Calculate GPA

calculateBtn.addEventListener("click", function () {

    let rows = document.querySelectorAll(".subject-row");

    let totalCredits = 0;
    let totalCreditPoints = 0;

    rows.forEach(function(row){

        let credit = parseFloat(row.querySelector(".credit").value);

        let grade = row.querySelector(".grade").value;

        if(!isNaN(credit) && grade!=""){

            totalCredits += credit;

            totalCreditPoints += credit * gradePoints[grade];

        }

    });

    if(totalCredits==0){

        alert("Please enter Credit and Grade");

        return;

    }

    let gpa = totalCreditPoints / totalCredits;

    document.getElementById("gpaResult").innerHTML = gpa.toFixed(2);

});

// Reset

resetBtn.addEventListener("click", function () {

    // Reset dropdowns
    document.getElementById("regulation").selectedIndex = 0;
    document.getElementById("department").selectedIndex = 0;
    document.getElementById("semester").selectedIndex = 0;
    document.getElementById("courseType").selectedIndex = 0;

    // Hide Course Type section
    document.getElementById("courseTypeSection").style.display = "none";

    // Clear subjects
    subjectContainer.innerHTML = "";

    // Reset GPA
    document.getElementById("gpaResult").innerHTML = "0.00";

});

const syllabus = {
    "2021": {
        "CSBS": {
            "Regular": {
            "Semester 1": [
                { code: "HS3152", credit: 3 },
                { code: "MA3151", credit: 4 },
                { code: "PH3151", credit: 3 },
                { code: "CY3151", credit: 3 },
                { code: "GE3151", credit: 3 },
                { code: "GE3152", credit: 1 },
                { code: "GE3171", credit: 2 },
                { code: "BS3171", credit: 2 },
                { code: "GE3171", credit: 1 }
            ],

            "Semester 2": [
                { code: "HS3252", credit: 2 },
                { code: "MA3251", credit: 4 },
                { code: "PH3256", credit: 3 },
                { code: "BE3251", credit: 3 },
                { code: "GE3251", credit: 4 },
                { code: "AD3251", credit: 3 },
                { code: "GE3252", credit: 1 },
                { code: "GE3271", credit: 2 },
                { code: "AD3271", credit: 2 },
                { code: "GE3272", credit: 2 },
                                
            ],
            "Semester 3": [
                { code: "MA3354", credit: 4 },
                { code: "CS3351", credit: 4 },
                { code: "CW3301", credit: 3 },
                { code: "CS3391", credit: 3 },
                { code: "AD3351", credit: 4 },
                { code: "AD3491", credit: 3 },
                { code: "CW3311", credit: 1.5 },
                { code: "CS3381", credit: 1.5 },
                { code: "GE3361", credit: 1 }
                 
            ],
            "Semester 4": [
                { code: "MA3391", credit: 4 },
                { code: "CS3492", credit: 3 },
                { code: "AL3452", credit: 4 },
                { code: "CW3401", credit: 3 },
                { code: "AL3451", credit: 3 },
                { code: "GE3451", credit: 2 },
                { code: "CS3481", credit: 1.5 },
                { code: "AD3461", credit: 2 },
                { code: "CW3411", credit: 1.5 }
                 
            ],
            "Semester 5": [
                { code: "CS3691", credit: 4 },
                { code: "CW3501", credit: 3 },
                { code: "CW3551", credit: 3 },
                { code: "CCS335", credit: 3 },
                { code: "CCW332", credit: 3 },
                { code: "MX3084", credit: 0 }
                
                 
            ],
            "Semester 6": [
                { code: "CW3601", credit: 3 },
                { code: "CCS356", credit: 4 },
                { code: "CW3551", credit: 3 },
                { code: "CCS339", credit: 3 },
                { code: "CCS361", credit: 3 },
                { code: "CW3006", credit: 3 },
                { code: "OCE351", credit: 3 },
                { code: "CCS367", credit: 3 },
                { code: "MX3089", credit: 0 }
                 
            ],

            "Semester 7": [
                { code: "GE3791", credit: 2 },
                { code: "GE3754", credit: 3 },
                { code: "OMG351", credit: 3 },
                { code: "OMR351", credit: 3 },
                { code: "CBM370", credit: 3 }
                
                 
            ],
             "Semester 8": [
                { code: "CW3811", credit: 10 }
            ]
        },
        "Honours": {

                "Semester 5": [
                    { code: "CCS369", credit: 3},
                    { code: "CCS334", credit: 3}
                ],
                "Semester 6": [
                    { code: "CCD334", credit: 3},
                    { code: "CW3007", credit: 3}
                ],
                "Semester 7": [
                    { code: "CW3003", credit: 3},
                    { code: "CCS372", credit: 3}
                ]
}

        }
       
    }

    
};



document.getElementById("regulation")
.addEventListener("change", loadSubjects);


document.getElementById("department")
.addEventListener("change", loadSubjects);


document.getElementById("semester")
.addEventListener("change", function () {

    toggleCourseType();

    const semester = document.getElementById("semester").value;


    // Semester 1 to 4
    if (
        semester === "Semester 1" ||
        semester === "Semester 2" ||
        semester === "Semester 3" ||
        semester === "Semester 4"
    ) {

        loadSubjects();

    }

    // Semester 5 to 8
    else {

        subjectContainer.innerHTML = "";

    }

});


document.getElementById("courseType")
.addEventListener("change", loadSubjects);


toggleCourseType();

function toggleCourseType() {

    const semester = document.getElementById("semester").value;

    const section = document.getElementById("courseTypeSection");

    const courseType = document.getElementById("courseType");


    if (
        semester === "Semester 5" ||
        semester === "Semester 6" ||
        semester === "Semester 7" ||
        semester === "Semester 8"
    ) {

        // Show Course Type
        section.style.display = "block";


        // Reset Course Type selection
        courseType.selectedIndex = 0;


        // Remove previous subjects
        subjectContainer.innerHTML = "";

    }

    else {

        // Hide Course Type for Semester 1-4
        section.style.display = "none";


        // Automatically set Regular
        courseType.value = "Regular";


    }

}