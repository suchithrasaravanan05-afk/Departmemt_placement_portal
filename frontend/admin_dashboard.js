
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

let students = JSON.parse(localStorage.getItem("students")) || [];
let editIndex = -1;

const form = document.getElementById("studentForm");
const year = document.getElementById("yearSelect");
const reg = document.getElementById("regSelect");
const name = document.getElementById("stdSelect");
const domain = document.getElementById("stdSelect");
const table = document.getElementById("studentTable");

function renderTable(filterYear = "") {
    table.innerHTML = "";

    students.forEach((s, i) => {

        
        if (filterYear !== "" && s.year !== filterYear) return;

        table.innerHTML += `
        <tr>
            <td>${s.year}</td>
            <td>${s.reg}</td>
            <td>${s.name}</td>
            <td>${s.domain}</td>
            <td>
                <button class="edit-btn" onclick="editStudent(${i})">Edit</button>
                <button class="edit-btn" onclick="deleteStudent(${i})" style="background:red;">Delete</button>
            </td>
        </tr>`;
    });
}


form.addEventListener("submit", function(e) {
    e.preventDefault();

    const data = {
        year: year.value,
        reg: reg.value,
        name: name.value,
        domain: domain.value
    };

    if (editIndex === -1) {
        students.push(data);
    } else {
        students[editIndex] = data;
        editIndex = -1;
    }

    localStorage.setItem("students", JSON.stringify(students));
    form.reset();

    renderTable(year.value); 
});


function editStudent(i) {
    editIndex = i;

    const s = students[i];
    year.value = s.year;
    reg.value = s.reg;
    name.value = s.name;
    domain.value = s.domain;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteStudent(i) {
    if (confirm("Delete this student?")) {
        students.splice(i, 1);
        localStorage.setItem("students", JSON.stringify(students));
        renderTable(year.value);
    }
}


window.editStudent = editStudent;
window.deleteStudent = deleteStudent;

renderTable();

year.addEventListener("change", function () {
    renderTable(year.value);
});



function downloadExcel() {

    const selectedYear = year.value;

    if (selectedYear === "") {
        alert("Please select a year first!");
        return;
    }

    // Filter by selected year
    const filtered = students
        .filter(s => s.year === selectedYear)
        .map(s => ({
            year: s.year,
            reg: s.reg,
            name: s.name,
            domain: s.domain
        }));

    if (filtered.length === 0) {
        alert("No student data found for selected year!");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    XLSX.writeFile(workbook, `Year_${selectedYear}_Students.xlsx`);
}


const worksheet = XLSX.utils.json_to_sheet(students);
const filtered = students.filter(s => s.year === year.value);
const Worksheet = XLSX.utils.json_to_sheet(filtered);



