// ============================================================
// GPA.JS — Standalone GPA & CGPA Calculator
// Anna University Grade System
// (Semester subjects loaded from Regulation 2021 - CSBS syllabus)
// Semesters 5-8 support Regular / Honours course type.
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS = 8;
const HONOURS_SEMS = [5, 6, 7]; // semesters that actually have honours subjects

const gpaData = {};      // { semIndex: [ { name, credits, grade } ] }
const courseType = {};   // { semIndex: 'Regular' | 'Honours' } — only meaningful for sem 5-8
let activeSem = 1;

// ------------------------------------------------------------
// REGULAR SUBJECTS (Regulation 2021 - CSBS)
// ------------------------------------------------------------
const REGULAR_SUBJECTS = {
  1: [
    { name: 'HS3152/Professional English I', credits: 3, grade: '' },
    { name: 'MA3151/Matrices and Calculus', credits: 4, grade: '' },
    { name: 'PH3151/Engineering Physics', credits: 3, grade: '' },
    { name: 'CY3151/Engineering Chemistry', credits: 3, grade: '' },
    { name: 'GE3151/Problem Solving and Python Programming', credits: 3, grade: '' },
    { name: 'GE3152/Heritage of Tamils', credits: 1, grade: '' },
    { name: 'GE3171/Problem Solving and Python Programming Laboratory', credits: 2, grade: '' },
    { name: 'BS3171/Physics and Chemistry Laboratory', credits: 2, grade: '' },
    { name: 'GE3172/English Laboratory', credits: 1, grade: '' }
  ],
  2: [
    { name: 'HS3252/Professional English II', credits: 2, grade: '' },
    { name: 'MA3251/Statistics and Numerical Methods', credits: 4, grade: '' },
    { name: 'PH3256/Physics for Information Science', credits: 3, grade: '' },
    { name: 'BE3251/Basic Electrical and Electronics Engineering', credits: 3, grade: '' },
    { name: 'GE3251/Engineering Graphics', credits: 4, grade: '' },
    { name: 'AD3251/Data Structures Design', credits: 3, grade: '' },
    { name: 'GE3252/Tamils and Technology', credits: 1, grade: '' },
    { name: 'GE3271/Engineering Practices Laboratory', credits: 2, grade: '' },
    { name: 'AD3271/Data Structures Design Laboratory', credits: 2, grade: '' },
    { name: 'GE3272/Communication laboratory', credits: 2, grade: '' }
  ],
  3: [
    { name: 'MA3354/Discrete Mathematics', credits: 4, grade: '' },
    { name: 'CS3351/Digital Principles and Computer Organization', credits: 4, grade: '' },
    { name: 'CW3301/Fundamentals of Economics', credits: 3, grade: '' },
    { name: 'CS3391/Object Oriented Programming', credits: 3, grade: '' },
    { name: 'AD3351/Design and Analysis of Algorithms', credits: 4, grade: '' },
    { name: 'AD3491/Fundamentals of Data Science and Analytics', credits: 3, grade: '' },
    { name: 'CW3311/Business Communication Laboratory I', credits: 1.5, grade: '' },
    { name: 'CS3381/Object Oriented Programming Laboratory', credits: 1.5, grade: '' },
    { name: 'GE3361/Professional Development', credits: 1, grade: '' }
  ],
  4: [
    { name: 'MA3391/Probability and Statistics', credits: 4, grade: '' },
    { name: 'CS3492/Database Management Systems', credits: 3, grade: '' },
    { name: 'AL3452/Operating Systems', credits: 4, grade: '' },
    { name: 'CW3401/Introduction to Business Systems', credits: 3, grade: '' },
    { name: 'AL3451/Machine Learning', credits: 3, grade: '' },
    { name: 'GE3451/Environmental Sciences and Sustainability', credits: 2, grade: '' },
    { name: 'CS3481/Database Management systems Laboratory', credits: 1.5, grade: '' },
    { name: 'AD3461/Machine Learning Laboratory', credits: 2, grade: '' },
    { name: 'CW3411/Business Communication Laboratory II', credits: 1.5, grade: '' }
  ],
  5: [
    { name: 'CS3691/Embedded Systems and IoT', credits: 4, grade: '' },
    { name: 'CW3501/Fundamentals of Management', credits: 3, grade: '' },
    { name: 'CW3551/Data and Information Security', credits: 3, grade: '' },
    { name: 'CCS335/Cloud Computing', credits: 3, grade: '' },
    { name: 'CCW332/Digital Marketing', credits: 3, grade: '' },
    { name: 'MX3084/Disaster Risk Reduction and Management', credits: 0, grade: '' },
    { name: 'CW3511/Summer Internship', credits: 2, grade: '' }
  ],
  6: [
    { name: 'CW3601/Business Analytics', credits: 3, grade: '' },
    { name: 'CCS356/Object Oriented Software Engineering', credits: 4, grade: '' },
    { name: 'CCS339/Cryptocurrency and Blockchain Technologies', credits: 3, grade: '' },
    { name: 'CCS361/Robotic Process Automation', credits: 3, grade: '' },
    { name: 'CW3006/Introduction to Innovation, IP Management and Entrepreneurship', credits: 3, grade: '' },
    { name: 'OCE351/Environmental and Social Impact Assessment', credits: 3, grade: '' },
    { name: 'CCS367/Storage Technologies', credits: 3, grade: '' },
    { name: 'CW3611/Business Analytics Laboratory', credits: 2, grade: '' },
    { name: 'MX3089/Industrial Safety', credits: 0, grade: '' }
  ],
  7: [
    { name: 'GE3791/Human Values and Ethics', credits: 2, grade: '' },
    { name: 'GE3754/Human Resource Management', credits: 3, grade: '' },
    { name: 'OMG351/Fintech Regulation', credits: 3, grade: '' },
    { name: 'OMR351/Mechatronics', credits: 3, grade: '' },
    { name: 'CBM370/Wearable Devices', credits: 3, grade: '' }
  ],
  8: [
    { name: 'CW3811/Project Work & Internship', credits: 10, grade: '' }
  ]
};

// ------------------------------------------------------------
// HONOURS SUBJECTS (added on top of Regular, sem 5-7 only)
// ------------------------------------------------------------
const HONOURS_SUBJECTS = {
  5: [
    { name: 'CCS369/Text and Speech Analysis', credits: 3, grade: '' },
    { name: 'CCS334/Big Data Analytics', credits: 3, grade: '' }
  ],
  6: [
    { name: 'CCD334/Supply Chain Management', credits: 3, grade: '' },
    { name: 'CW3007/IT Project Management', credits: 3, grade: '' }
  ],
  7: [
    { name: 'CW3003/Customer Relation Management', credits: 3, grade: '' },
    { name: 'CCS372/Virtualization', credits: 3, grade: '' }
  ]
};

function semHasHonours(sem) {
  return HONOURS_SEMS.includes(sem);
}

// Build the subject list for a semester based on its course type.
// Sem 1-4: always Regular. Sem 5-8: Regular, or Regular+Honours.
function getDefaultSubjectsForSem(sem) {
  const regular = (REGULAR_SUBJECTS[sem] || []).map(s => ({ ...s }));

  if (!semHasHonours(sem)) {
    return regular.length > 0 ? regular : [{ name: '', credits: 3, grade: '' }];
  }

  const type = courseType[sem] || 'Regular';
  if (type === 'Honours') {
    const honours = (HONOURS_SUBJECTS[sem] || []).map(s => ({ ...s }));
    return [...regular, ...honours];
  }
  return regular;
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    courseType[i] = 'Regular';
    gpaData[i] = getDefaultSubjectsForSem(i);
  }
  renderPage();
});

// ============================================================
// PAGE RENDER
// ============================================================
function renderPage() {
  const root = document.getElementById('gpaPage');
  if (!root) return;

  root.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start;">
      
      <!-- Main Calculator -->
      <div>
        <div class="gpa-calculator-card">
          <div class="gpa-calc-header">
            <i class="fa-solid fa-calculator"></i>
            <div>
              <h3>Semester GPA Calculator</h3>
              <p>Anna University Credit-Based Grading System</p>
            </div>
          </div>

          <!-- Sem Tabs -->
          <div class="sem-tabs" id="semTabs"></div>

          <!-- Course Type (only shown for Sem 5-8) -->
          <div id="courseTypeArea" style="padding:14px 24px 0;"></div>

          <!-- Results -->
          <div style="padding:20px 24px 0;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
              <div class="gpa-result-box">
                <div class="gpa-result-label">Semester ${activeSem} GPA</div>
                <div class="gpa-result-value" id="currentSemGpa">—</div>
                <div class="gpa-result-out">out of 10.0</div>
              </div>
              <div class="gpa-result-box" style="background:linear-gradient(135deg,#059669,#34d399);">
                <div class="gpa-result-label">Overall CGPA</div>
                <div class="gpa-result-value" id="overallCgpa">—</div>
                <div class="gpa-result-out">out of 10.0</div>
              </div>
            </div>
          </div>

          <!-- Subjects Table -->
          <div style="padding:0 24px 20px;">
            <div id="subjectsArea"></div>
            <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="addSubject()">
                <i class="fa-solid fa-plus"></i> Add Subject
              </button>
              <button class="btn btn-outline btn-sm" onclick="resetSem()">
                <i class="fa-solid fa-rotate-left"></i> Reset Semester
              </button>
              <button class="btn btn-outline btn-sm" onclick="resetAll()">
                <i class="fa-solid fa-trash-can"></i> Reset All
              </button>
            </div>
          </div>

          <!-- CGPA Summary -->
          <div class="cgpa-summary" id="cgpaSummary"></div>
        </div>
      </div>

      <!-- Sidebar -->
      <div style="display:flex;flex-direction:column;gap:16px;">

        <!-- Grade Table -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-table"></i> Grade Reference</div>
          </div>
          <div class="panel-body" style="padding:12px;">
            <table class="data-table">
              <thead><tr><th>Grade</th><th>GP</th><th>Marks</th></tr></thead>
              <tbody>
                <tr><td><strong>O</strong></td><td><span class="badge badge-green">10</span></td><td>91–100</td></tr>
                <tr><td><strong>A+</strong></td><td><span class="badge badge-blue">9</span></td><td>81–90</td></tr>
                <tr><td><strong>A</strong></td><td><span class="badge badge-blue">8</span></td><td>71–80</td></tr>
                <tr><td><strong>B+</strong></td><td><span class="badge badge-gray">7</span></td><td>61–70</td></tr>
                <tr><td><strong>B</strong></td><td><span class="badge badge-gray">6</span></td><td>50–60</td></tr>
                <tr><td><strong>RA</strong></td><td><span class="badge badge-red">0</span></td><td>&lt;50</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CGPA Interpretor -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-star"></i> CGPA Bands</div>
          </div>
          <div class="panel-body" style="padding:12px;font-size:13px;">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div class="detail-item"><span class="detail-label">9.0 – 10.0</span><span class="detail-value"><span class="badge badge-green">🏆 Outstanding</span></span></div>
              <div class="detail-item"><span class="detail-label">8.0 – 8.99</span><span class="detail-value"><span class="badge badge-blue">⭐ Excellent</span></span></div>
              <div class="detail-item"><span class="detail-label">7.0 – 7.99</span><span class="detail-value"><span class="badge badge-blue">👍 Very Good</span></span></div>
              <div class="detail-item"><span class="detail-label">6.0 – 6.99</span><span class="detail-value"><span class="badge badge-yellow">📚 Good</span></span></div>
              <div class="detail-item"><span class="detail-label">Below 6.0</span><span class="detail-value"><span class="badge badge-red">⚠️ Needs Improvement</span></span></div>
            </div>
          </div>
        </div>

        <!-- How to Calculate -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title"><i class="fa-solid fa-circle-info"></i> How It Works</div>
          </div>
          <div class="panel-body" style="font-size:13px;color:#475569;line-height:1.7;">
            <p><strong>GPA Formula:</strong></p>
            <code style="display:block;background:#f1f5f9;padding:8px;border-radius:6px;margin:6px 0;font-size:12px;">
              GPA = Σ(Credits × Grade Point) / Σ Credits
            </code>
            <p style="margin-top:8px;"><strong>CGPA</strong> is the weighted average GPA across all semesters.</p>
          </div>
        </div>

      </div>
    </div>`;

  renderSemTabs();
  renderCourseTypeToggle();
  renderSubjectsTable();
  updateResults();
}

// ============================================================
// SEM TABS
// ============================================================
function renderSemTabs() {
  const tabs = document.getElementById('semTabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const semGpa = calcSemGpa(i);
    const hasDone = semGpa !== null;
    tabs.innerHTML += `
      <button
        class="sem-tab-btn ${i === activeSem ? 'active' : ''}"
        onclick="switchSem(${i})"
        title="Semester ${i}${hasDone ? ' — GPA: ' + semGpa.toFixed(2) : ''}">
        Sem ${i}${hasDone ? ` <small style="opacity:.8;">${semGpa.toFixed(1)}</small>` : ''}
      </button>`;
  }
}

function switchSem(sem) {
  activeSem = sem;
  renderSemTabs();
  renderCourseTypeToggle();
  renderSubjectsTable();
  updateResults();
}

// ============================================================
// COURSE TYPE (Regular / Honours) — Sem 5-8 only
// ============================================================
function renderCourseTypeToggle() {
  const area = document.getElementById('courseTypeArea');
  if (!area) return;

  if (!semHasHonours(activeSem)) {
    // Sem 1-4 and Sem 8 (no honours subjects defined) — hide toggle
    area.innerHTML = '';
    return;
  }

  const type = courseType[activeSem] || 'Regular';

  area.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <span style="font-size:13px;font-weight:700;color:#334155;">Course Type:</span>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
        <input type="radio" name="courseType" value="Regular" ${type === 'Regular' ? 'checked' : ''}
          onchange="setCourseType('Regular')">
        Regular
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
        <input type="radio" name="courseType" value="Honours" ${type === 'Honours' ? 'checked' : ''}
          onchange="setCourseType('Honours')">
        Honours (Regular + Honours subjects)
      </label>
    </div>`;
}

function setCourseType(type) {
  courseType[activeSem] = type;
  // Rebuild this semester's subject list to match the new course type,
  // preserving grades already entered for subjects that still appear.
  const previous = gpaData[activeSem] || [];
  const prevGrades = {};
  previous.forEach(s => { prevGrades[s.name] = s.grade; });

  const rebuilt = getDefaultSubjectsForSem(activeSem).map(s => ({
    ...s,
    grade: prevGrades[s.name] || ''
  }));

  gpaData[activeSem] = rebuilt;

  renderCourseTypeToggle();
  renderSubjectsTable();
  renderSemTabs();
  updateResults();
}

// ============================================================
// SUBJECTS TABLE
// ============================================================
function renderSubjectsTable() {
  const area = document.getElementById('subjectsArea');
  if (!area) return;

  const subjects = gpaData[activeSem] || [];

  area.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="subjects-table" style="width:100%;">
        <thead>
          <tr>
            <th>#</th>
            <th>Subject Name</th>
            <th>Credits</th>
            <th>Grade</th>
            <th>GP</th>
            <th>Credits × GP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((s, idx) => buildRow(s, idx)).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;font-weight:700;">
            <td colspan="2" style="padding:10px 12px;font-size:12px;color:#64748b;">TOTAL</td>
            <td style="padding:10px 12px;color:#0f172a;">${subjects.reduce((a, s) => a + (parseFloat(s.credits) || 0), 0)}</td>
            <td colspan="2"></td>
            <td style="padding:10px 12px;color:#2563eb;font-weight:800;">${subjects.reduce((a, s) => {
    const gp = GRADE_POINTS[s.grade];
    return gp !== undefined ? a + (parseFloat(s.credits) || 0) * gp : a;
  }, 0).toFixed(1)
    }</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

function buildRow(s, idx) {
  const gradeOptions = Object.keys(GRADE_POINTS).map(g =>
    `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  const gp = GRADE_POINTS[s.grade] !== undefined ? GRADE_POINTS[s.grade] : '—';
  const cpg = GRADE_POINTS[s.grade] !== undefined
    ? ((parseFloat(s.credits) || 0) * GRADE_POINTS[s.grade]).toFixed(1)
    : '—';

  return `
  <tr>
    <td style="color:#94a3b8;font-size:12px;">${idx + 1}</td>
    <td>
      <input
        type="text"
        class="grade-select"
        style="padding:7px 10px;min-width:220px;"
        value="${s.name}"
        placeholder="Subject name (optional)"
        onchange="updateField(${idx}, 'name', this.value)">
    </td>
    <td>
      <input
        type="number"
        class="grade-select"
        style="padding:7px 10px;width:65px;"
        min="0" max="10" step="0.5"
        value="${s.credits}"
        onchange="updateField(${idx}, 'credits', parseFloat(this.value) || 0)">
    </td>
    <td>
      <select class="grade-select" onchange="updateField(${idx}, 'grade', this.value)">
        <option value="">—</option>
        ${gradeOptions}
      </select>
    </td>
    <td style="font-weight:700;color:#2563eb;">${gp}</td>
    <td style="font-weight:700;">${cpg}</td>
    <td>
      <button
        onclick="removeSubject(${idx})"
        style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;"
        title="Remove subject">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  </tr>`;
}

// ============================================================
// DATA OPERATIONS
// ============================================================
function updateField(idx, field, value) {
  if (gpaData[activeSem]?.[idx] !== undefined) {
    gpaData[activeSem][idx][field] = value;
  }
  renderSubjectsTable();
  renderSemTabs();
  updateResults();
}

function addSubject() {
  gpaData[activeSem].push({ name: '', credits: 3, grade: '' });
  renderSubjectsTable();
}

function removeSubject(idx) {
  if (gpaData[activeSem].length <= 1) {
    alert('At least one subject is required.');
    return;
  }
  gpaData[activeSem].splice(idx, 1);
  renderSubjectsTable();
  updateResults();
}

function resetSem() {
  if (!confirm(`Reset Semester ${activeSem} data?`)) return;
  courseType[activeSem] = 'Regular';
  gpaData[activeSem] = getDefaultSubjectsForSem(activeSem);
  renderCourseTypeToggle();
  renderSubjectsTable();
  renderSemTabs();
  updateResults();
}

function resetAll() {
  if (!confirm('Reset all semester data? This cannot be undone.')) return;
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    courseType[i] = 'Regular';
    gpaData[i] = getDefaultSubjectsForSem(i);
  }
  renderCourseTypeToggle();
  renderSubjectsTable();
  renderSemTabs();
  updateResults();
}

// ============================================================
// CALCULATIONS
// ============================================================
function calcSemGpa(sem) {
  const subs = gpaData[sem] || [];
  let tc = 0, tp = 0;
  subs.forEach(s => {
    if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
      tc += parseFloat(s.credits) || 0;
      tp += (parseFloat(s.credits) || 0) * GRADE_POINTS[s.grade];
    }
  });
  return tc > 0 ? tp / tc : null;
}

function updateResults() {
  // Current sem GPA
  const semGpa = calcSemGpa(activeSem);
  const semGpaEl = document.getElementById('currentSemGpa');
  if (semGpaEl) semGpaEl.innerText = semGpa !== null ? semGpa.toFixed(2) : '—';

  // Overall CGPA (credit-weighted)
  let allCredits = 0, allPoints = 0;
  const allSemGpas = [];

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const subs = gpaData[i] || [];
    let tc = 0, tp = 0;
    subs.forEach(s => {
      if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
        tc += parseFloat(s.credits) || 0;
        tp += (parseFloat(s.credits) || 0) * GRADE_POINTS[s.grade];
      }
    });
    if (tc > 0) {
      allCredits += tc;
      allPoints += tp;
      allSemGpas.push({ sem: i, gpa: tp / tc });
    }
  }

  const cgpa = allCredits > 0 ? allPoints / allCredits : null;
  const cgpaEl = document.getElementById('overallCgpa');
  if (cgpaEl) cgpaEl.innerText = cgpa !== null ? cgpa.toFixed(2) : '—';

  // CGPA Summary bar
  const summaryEl = document.getElementById('cgpaSummary');
  if (summaryEl) {
    if (allSemGpas.length === 0) {
      summaryEl.innerHTML = '<span style="color:#94a3b8;font-size:13px;padding:8px 0;">Enter grades to see CGPA summary</span>';
    } else {
      summaryEl.innerHTML = allSemGpas.map(({ sem, gpa }) => `
        <div class="cgpa-summary-item">
          <div class="val">${gpa.toFixed(2)}</div>
          <div class="lbl">Sem ${sem}</div>
        </div>`).join('');

      if (cgpa) {
        summaryEl.innerHTML += `
          <div class="cgpa-summary-item" style="background:rgba(37,99,235,.08);border-radius:8px;padding:8px;">
            <div class="val" style="font-size:26px;">${cgpa.toFixed(2)}</div>
            <div class="lbl" style="color:#2563eb;">CGPA</div>
          </div>`;
      }
    }
  }
}