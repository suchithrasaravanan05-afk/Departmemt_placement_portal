
const registerNumbers = {
    1: ["953623241001", "953623241002", "953623241003"],
    2: ["953624242004", "953624242005", "953624242006"],
    3: ["953623243001", "953623243002", "953623243003", "953623244004", "953623244005", "953623244006", "953623244007", "953623244008", "953623244009", "953623244010", "953623244011", "953623244012", "953623244013", "953623244014", "953623244015", "953623244016", "953623244017", "953623244018", "953623244019", "953623244020", "953623244021", "953623244022", "953623244023", "953623244024", "953623244025", "953623244026", "953623244027", "953623244028", "953623244029", "953623244030", "953523244031", "953623244032", "953623244033", "953623244034", "953623244035", "953623244036", "953623244037", "953623244038", "953623244039", "953623244040", "953623244041", "953623244042", "953623244043", "953623244044", "953623244045", "953623244046", "953623244047", "953623244048", "953623244049", "953623244050", "953623244051", "953623244052", "953623244053", "953623244054", "953623244055", "953623244056", "953623244057", "953623244058", "953623244059", "953623244060", "953623244061", "953623244062"],
    4: ["953622244001", "953622244002", "953622244003", "953622244004", "953622244005", "953622244006", "953622244007", "953622244008", "953622244009", "953622244010", "953622244011", "953622244012", "953622244013", "953622244014", "953622244015", "953622244016", "953622244017", "953622244018", "953622244019", "953622244020", "953622244021", "953622244022", "953622244023", "953622244024", "953622244025", "953622244026", "953622244027", "953622244028", "953622244029", "953622244030", "953622244031", "953622244032", "953622244033", "953622244034", "953622244035", "953622244036", "953622244037", "953622244038", "953622244039", "953622244040", "953622244041", "953622244042", "953622244043", "953622244044", "953622244045", "953622244046", "953622244047", "953622244048", "953622244049", "953622244050", "953622244051", "953622244052", "953622244053", "953622244054", "953622244055", "953622244056", "953622244057", "953622244058", "953622244059", "953622244060", "953622244061", "953622244062"]
};

const yearSelect = document.getElementById("yearSelect");
const regSelect = document.getElementById("regSelect");

yearSelect.addEventListener("change", function () {
    const selectedYear = this.value;

    regSelect.innerHTML = '<option value="">Select Register Number</option>';

    if (registerNumbers[selectedYear]) {
        registerNumbers[selectedYear].forEach(function (regNo) {
            const option = document.createElement("option");
            option.value = regNo;
            option.textContent = regNo;
            regSelect.appendChild(option);
        });
    }
});

const studentName = {
    1: ["953623241001", "953623241002", "953623241003"],
    2: ["953624242004", "953624242005", "953624242006"],
    3: ["ABINESH KUMAR A", "AMRITHA MANIKANDAN", "ASHIN SREE P", "BALA VIGNESH S", "BAVANEESWARI R", "DHARSHINI A", "DIVYA K", "ESAKKIAMMAL M", "GAYATHRI DHEVI M.K", "GOWTHAM P", "HARI HARA SUDHAN R", "HARINI M", "HARI NISHAANTHAN N", "HARSETHA V", "JASON EZRA", "JASWANT P", "JAYADEEP R", "JAYAJOTHI S", "JESHAN DEV D", "KAAVYADHARSHINI G", "KATHIRVEL G", "KAVIYA N", "MANOJKUMAR M", "MARGRET PUNITHA A", "MOHAMMED SUHAIL N", "MUFRIN ASHIKA O J", "MUGESH PRABHU B", "MURUGALAKSHMI K", "MUTHU MARI G", "NAGARAJAN R", "NITHIKASREE K", "NITHISH KANNAN G", "PERUMAL DHARSHAN R", "POOJHA M", "PRDAEEP K", "RAJAKALEESWARAN S", "RAJA PANDIAN P", "RAMKUMAR R", "RAMYA S K", "RITHANYA S", "SANTHANAHARINI S", "SANTHOSH G", "SIVA PRIYA K R", "SIVA RANJANI P", "SRI BALAJI S", "SUBASH SELVAM K", "SUBRAJA U", "SUCHITHRA S", "SUGHAPRIYAN A R", "SURIYAKUMAR P", "SURIYAPRAKASH M", "SURYA LAKSHMI V", "THANALAKSHMI G", "THANUSHA K", "VAISHNAVI V", "VARSHINI C", "VENKATESH M", "VIGNESHWARAN V", "VINOTH KUMAR V", "VISHAL GANESH S", "YASHWIN V"],
    4: ["953622244001", "953622244002", "953622244003", "953622244004", "953622244005", "953622244006", "953622244007", "953622244008", "953622244009", "953622244010", "953622244011", "953622244012", "953622244013", "953622244014", "953622244015", "953622244016", "953622244017", "953622244018", "953622244019", "953622244020", "953622244021", "953622244022", "953622244023", "953622244024", "953622244025", "953622244026", "953622244027", "953622244028", "953622244029", "953622244030", "953622244031", "953622244032", "953622244033", "953622244034", "953622244035", "953622244036", "953622244037", "953622244038", "953622244039", "953622244040", "953622244041", "953622244042", "953622244043", "953622244044", "953622244045", "953622244046", "953622244047", "953622244048", "953622244049", "953622244050", "953622244051", "953622244052", "953622244053", "953622244054", "953622244055", "953622244056", "953622244057", "953622244058", "953622244059", "953622244060", "953622244061", "953622244062"]
};

const YearSelect = document.getElementById("YearSelect");
const stdSelect = document.getElementById("stdSelect");

yearSelect.addEventListener("change", function () {
    const selectedYear = this.value;

    stdSelect.innerHTML = '<option value="">Select Student Name</option>';

    if (studentName[selectedYear]) {
        studentName[selectedYear].forEach(function (stdName) {
            const option = document.createElement("option");
            option.value = stdName;
            option.textContent = stdName;
            stdSelect.appendChild(option);
        });
    }
});



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

const gpaInputs = document.querySelectorAll(".gpa");

yearSelect.addEventListener("change", function () {
    const year = parseInt(this.value);


    gpaInputs.forEach(input => {
        input.disabled = true;
        input.value = "";
    });

    let enabledSemesters = 0;

    if (year === 1) enabledSemesters = 2;
    else if (year === 2) enabledSemesters = 4;
    else if (year === 3) enabledSemesters = 6;
    else if (year === 4) enabledSemesters = 8;


    for (let i = 0; i < enabledSemesters; i++) {
        gpaInputs[i].disabled = false;
    }
});

document.addEventListener("DOMContentLoaded", function () {

    const gpaInputs = document.querySelectorAll(".gpa");
    const cgpaField = document.getElementById("cgpa");

    function calculateCGPA() {
        let total = 0;
        let count = 0;

        gpaInputs.forEach(input => {
            if (!input.disabled && input.value !== "") {
                const gpa = parseFloat(input.value);
                if (!isNaN(gpa)) {
                    total += gpa;
                    count++;
                }
            }
        });

        if (count > 0) {
            cgpaField.value = (total / count).toFixed(2);
        } else {
            cgpaField.value = "";
        }
    }

   
    gpaInputs.forEach(input => {
        input.addEventListener("input", calculateCGPA);
    });

});



yearSelect.addEventListener("change", function () {
    const year = parseInt(this.value);

    gpaInputs.forEach(input => {
        input.disabled = true;
        input.value = "";
    });

    let enabledSemesters = 0;

    if (year === 1) enabledSemesters = 2;
    else if (year === 2) enabledSemesters = 4;
    else if (year === 3) enabledSemesters = 6;
    else if (year === 4) enabledSemesters = 8;

    for (let i = 0; i < enabledSemesters; i++) {
        gpaInputs[i].disabled = false;
    }

    calculateCGPA();  
});

document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener("change", () => {
        if (input.files[0] && input.files[0].size > 10 * 1024 * 1024) {
            alert("File size must be under 10 MB");
            input.value = "";
        }
    });
});

const form = document.querySelector("form");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const studentData = {
        name: document.getElementById("stdSelect").value,
        reg: document.getElementById("regSelect").value,
        year: document.getElementById("yearSelect").value,
        cgpa: document.getElementById("cgpa").value
    };

    let students = JSON.parse(localStorage.getItem("students")) || [];

    students.push(studentData);

    localStorage.setItem("students", JSON.stringify(students));

    alert("Student registered successfully!");

    form.reset();
});



form.addEventListener("reset", function () {

    const inputs = form.querySelectorAll("input, select, textarea, button");

    inputs.forEach(el => {
        el.disabled = false;
    });

});

function validateRegister() {
    console.log("Register clicked");

    fetch("http://localhost:5500/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            year: document.getElementById("year").value.trim(),
            register_number: document.getElementById("regregisternumber").value.trim(),
            std_name: document.getElementById("stdName").value.trim(),
            dob: document.getElementById("dob").value.trim(),
            personal_email: document.getElementById("regEmail").value.trim(),
            college_email:document.getElementById("regEmail").value.trim(),
            domain_interesed: document.getElementById("regDomain").value.trim(),
            tenth_percentage: document.getElementById("regten").value.trim(),
            twelth_pecentage: document.getElementById("regtwel").value.trim(),
            diploma_percentage: document.getElementById("regDiploma").value.trim(),
            degree: document.getElementById("regDegree").value.trim(),
            department: document.getElementById("regDept").value.trim(),
            sem1_gpa: document.getElementById("1gpa").value.trim(),
            sem2_gpa: document.getElementById("2gpa").value.trim(),
            sem3_gpa: document.getElementById("3gpa").value.trim(),
            sem4_gpa: document.getElementById("4gpa").value.trim(),
            sem5_gpa: document.getElementById("5gpa").value.trim(),
            sem6_gpa: document.getElementById("6gpa").value.trim(),
            sem7_gpa: document.getElementById("7gpa").value.trim(),
            sem8_gpa: document.getElementById("8gpa").value.trim(),
            cgpa: document.getElementById("cgpa").value.trim(),
            phone_number: document.getElementById("regNo").value.trim(),
            whatsapp_number: document.getElementById("regNo").value.trim(),
            history_of_arrears: document.getElementById("Arrears").value.trim(),
            history_arrears_count: document.getElementById("NoArrears").value.trim(),
            standing_of_arrears: document.getElementById("Arrears").value.trim(),
            standing_arrears_count: document.getElementById("NoArrears").value.trim(),
            linkedin_link: document.getElementById("reglink").value.trim(),
            github_link: document.getElementById("regGit").value.trim(),
            profile_photo: document.getElementById("photo").value.trim(),
            resume_file: document.getElementById("resume").value.trim(),
            created_at: document.getElementById("created").value.trim()
        })
    })
        .then(res => res.json())
    .then(data => {
        alert(data.message);
        toggleForm(); 
    })
    .catch(err => {
        console.error(err);
        alert("Server not reachable");
    });
}


