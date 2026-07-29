let allStudents = [];

let students = [];

/* Load Excel File */

fetch("3rd_final.xlsx")

.then(res => res.arrayBuffer())

.then(data => {

    const wb = XLSX.read(data,{type:"array"});

    const sheet = wb.Sheets[wb.SheetNames[0]];

    allStudents = XLSX.utils.sheet_to_json(sheet,{defval:""});

    students = allStudents;

    displayStudents(students);

});

/* Display Students */

function displayStudents(list){

    const tbody = document.getElementById("tbody");

    tbody.innerHTML="";

    list.forEach((s,i)=>{

        tbody.innerHTML +=`

        <tr>

        <td class="reg" onclick="viewStudent(${i})">

        ${s["Register Number"]}

        </td>

        <td>${s["Name"]}</td>

        </tr>

        `;

    });

}


/* View Student */

function viewStudent(i){

    const s = students[i];

    document.getElementById("details").innerHTML=`

<p><b>Register Number :</b> ${s["Register Number"]}</p>

<p><b>Name :</b> ${s["Name"]}</p>

<p><b>College Email :</b> ${s["College Email"]}</p>

<p><b>10th % :</b> ${(s["10th %"]*100).toFixed(2)}%</p>

<p><b>12th % :</b> ${(s["12th %"]*100).toFixed(2)}%</p>

<p><b>CGPA :</b> ${s["CGPA"]}</p>

<p><b>Department :</b> ${s["Department"]}</p>

<p><b>Passed Out Year :</b> ${s["Passed Out Year"]}</p>

<p><b>WhatsApp Number :</b> ${s["WhatsApp Number"]}</p>

<p><b>History of Arrears :</b> ${s["History of Arrears"]}</p>

<p><b>Number of Arrears :</b> ${s["Number of Arrears"]}</p>

`;

document.getElementById("modal").style.display="block";

}

/* Close Modal */

function closeModal(){

document.getElementById("modal").style.display="none";

}

/* Download */

function downloadFiltered(){

const data = students.map(s=>({

"Register Number":s["Register Number"],

"Name":s["Name"],

"10th %":(s["10th %"]*100).toFixed(2),

"12th %":(s["12th %"]*100).toFixed(2),

"CGPA":s["CGPA"]

}));

const ws = XLSX.utils.json_to_sheet(data);

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb,ws,"Filtered Students");

XLSX.writeFile(wb,"Filtered_Students.xlsx");

}

function loadExcel(fileName){

    fetch(fileName)

    .then(res => res.arrayBuffer())

    .then(data=>{

        const workbook = XLSX.read(data,{type:"array"});

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        students = XLSX.utils.sheet_to_json(sheet,{defval:""});

        displayStudents(students);

    })

    .catch(()=>{

        alert(fileName + " not found.");

    });

}
