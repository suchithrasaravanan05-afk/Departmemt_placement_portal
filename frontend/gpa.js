// ============================================================
// GPA.JS — Anna University Credit-Based Semester GPA & CGPA Calculator
// Regulation 2021 — Computer Science and Business Systems (CSBS)
// Supports Regular / Honours course types for higher semesters.
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS = 8;
const HONOURS_SEMS = [5, 6, 7];

const gpaData = {};      // { semIndex: [ { name, credits, grade } ] }
const courseType = {};   // { semIndex: 'Regular' | 'Honours' }
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
// HONOURS SUBJECTS (Sem 5-7)
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
// INITIALIZATION
// ============================================================
function initGpaState() {
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    if (!courseType[i]) courseType[i] = 'Regular';
    if (!gpaData[i] || gpaData[i].length === 0) {
      gpaData[i] = getDefaultSubjectsForSem(i);
    }
  }
}

// Auto-boot if on standalone gpa.html
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('gpaPage');
    if (root) {
      initGpaState();
      renderSemesterGpaApp('gpaPage');
    }
  });
}

// ============================================================
// MAIN HTML RENDERER
// ============================================================
function renderSemesterGpaApp(targetElementId, allowProfileSync = false) {
  const root = document.getElementById(targetElementId);
  if (!root) return;

  initGpaState();

  root.innerHTML = `
    <div class="gpa-container-grid">
      
      <!-- Left Column: Main Calculator -->
      <div>
        <div class="gpa-calculator-card">
          
          <!-- Header Bar -->
          <div class="gpa-calc-header">
            <div class="gpa-header-icon-box">
              <i class="fa-solid fa-calculator"></i>
            </div>
            <div class="gpa-header-text">
              <h3>Semester GPA Calculator</h3>
              <p>Anna University Credit-Based Grading System</p>
            </div>
          </div>

          <!-- Semester Tabs Row -->
          <div class="gpa-sem-tabs-bar" id="gpaSemTabs"></div>

          <!-- Optional Course Type Toggle (for higher semesters) -->
          <div id="gpaCourseTypeArea"></div>

          <!-- Results Score Cards (Blue & Green) -->
          <div class="gpa-results-grid">
            <div class="gpa-score-card blue-card">
              <div class="gpa-score-label" id="gpaSemTitleLabel">SEMESTER ${activeSem} GPA</div>
              <div class="gpa-score-value" id="currentSemGpa">—</div>
              <div class="gpa-score-out">out of 10.0</div>
            </div>
            <div class="gpa-score-card green-card">
              <div class="gpa-score-label">OVERALL CGPA</div>
              <div class="gpa-score-value" id="overallCgpa">—</div>
              <div class="gpa-score-out">out of 10.0</div>
            </div>
          </div>

          <!-- Subjects Table -->
          <div class="gpa-table-wrap">
            <div id="gpaSubjectsArea"></div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="gpa-actions-bar">
            <button type="button" class="gpa-btn-action" onclick="addGpaSubject()">
              <i class="fa-solid fa-plus"></i> Add Subject
            </button>
            <button type="button" class="gpa-btn-action" onclick="resetGpaSem()">
              <i class="fa-solid fa-rotate-left"></i> Reset Semester
            </button>
            <button type="button" class="gpa-btn-action" onclick="resetGpaAll()">
              <i class="fa-solid fa-trash-can"></i> Reset All
            </button>
            ${allowProfileSync ? `
            <button type="button" class="gpa-btn-action gpa-btn-primary" onclick="syncGpaToStudentProfile()" style="margin-left:auto;">
              <i class="fa-solid fa-floppy-disk"></i> Sync to Profile
            </button>` : ''}
          </div>

          <!-- Bottom CGPA Summary Info -->
          <div class="gpa-bottom-summary" id="gpaBottomSummary">
            <span>Enter grades to see CGPA summary</span>
          </div>

        </div>
      </div>

      <!-- Right Column: Sidebar Reference Cards -->
      <div class="gpa-sidebar-stack">

        <!-- 1. Grade Reference Card -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-table-cells"></i> Grade Reference
          </div>
          <div class="gpa-sidebar-body" style="padding:10px 18px 14px;">
            <table class="gpa-ref-table">
              <thead>
                <tr>
                  <th>GRADE</th>
                  <th style="text-align:center;">GP</th>
                  <th style="text-align:right;">MARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>O</strong></td>
                  <td style="text-align:center;"><span class="gp-val-green">10</span></td>
                  <td style="text-align:right;">91-100</td>
                </tr>
                <tr>
                  <td><strong>A+</strong></td>
                  <td style="text-align:center;"><span class="gp-val-blue">9</span></td>
                  <td style="text-align:right;">81-90</td>
                </tr>
                <tr>
                  <td><strong>A</strong></td>
                  <td style="text-align:center;"><span class="gp-val-blue">8</span></td>
                  <td style="text-align:right;">71-80</td>
                </tr>
                <tr>
                  <td><strong>B+</strong></td>
                  <td style="text-align:center;"><span class="gp-val-slate">7</span></td>
                  <td style="text-align:right;">61-70</td>
                </tr>
                <tr>
                  <td><strong>B</strong></td>
                  <td style="text-align:center;"><span class="gp-val-slate">6</span></td>
                  <td style="text-align:right;">50-60</td>
                </tr>
                <tr>
                  <td><strong>RA</strong></td>
                  <td style="text-align:center;"><span class="gp-val-red">0</span></td>
                  <td style="text-align:right;">&lt;50</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. CGPA Bands Card -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-star"></i> CGPA Bands
          </div>
          <div class="gpa-sidebar-body">
            <div class="gpa-bands-list">
              <div class="gpa-band-item">
                <span class="gpa-band-range">9.0 – 10.0</span>
                <span class="gpa-band-badge badge-band-outstanding">🚀 Outstanding</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">8.0 – 8.99</span>
                <span class="gpa-band-badge badge-band-excellent">⭐ Excellent</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">7.0 – 7.99</span>
                <span class="gpa-band-badge badge-band-verygood">🔥 Very Good</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">6.0 – 6.99</span>
                <span class="gpa-band-badge badge-band-good">👍 Good</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">BELOW 6.0</span>
                <span class="gpa-band-badge badge-band-needs">⚠️ Needs Improvement</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. How It Works Card -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-circle-info"></i> How It Works
          </div>
          <div class="gpa-sidebar-body" style="font-size:12.5px;color:#475569;line-height:1.6;">
            <p><strong>GPA Formula:</strong></p>
            <div class="gpa-formula-box">
              GPA = Σ(Credits × Grade Point) / Σ Credits
            </div>
            <p style="margin-top:8px;"><strong>CGPA</strong> is the weighted average GPA across all semesters.</p>
          </div>
        </div>

      </div>

    </div>
  `;

  renderGpaTabs();
  renderGpaCourseType();
  renderGpaSubjectsTable();
  updateGpaResults();
}

// ============================================================
// SEMESTER TABS LOGIC
// ============================================================
function renderGpaTabs() {
  const tabsContainer = document.getElementById('gpaSemTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const semGpa = calcSemGpa(i);
    const hasGpa = semGpa !== null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gpa-sem-pill-btn ${i === activeSem ? 'active' : ''}`;
    btn.title = `Semester ${i}${hasGpa ? ' — GPA: ' + semGpa.toFixed(2) : ''}`;
    btn.innerHTML = `Sem ${i}${hasGpa ? ` <span style="font-size:10px;opacity:.85;margin-left:2px;">(${semGpa.toFixed(1)})</span>` : ''}`;
    btn.onclick = () => switchGpaSem(i);
    tabsContainer.appendChild(btn);
  }
}

function switchGpaSem(sem) {
  activeSem = sem;
  const label = document.getElementById('gpaSemTitleLabel');
  if (label) label.innerText = `SEMESTER ${activeSem} GPA`;

  renderGpaTabs();
  renderGpaCourseType();
  renderGpaSubjectsTable();
  updateGpaResults();
}

// ============================================================
// COURSE TYPE TOGGLE (Sem 5-7)
// ============================================================
function renderGpaCourseType() {
  const area = document.getElementById('gpaCourseTypeArea');
  if (!area) return;

  if (!semHasHonours(activeSem)) {
    area.innerHTML = '';
    return;
  }

  const type = courseType[activeSem] || 'Regular';

  area.innerHTML = `
    <div class="gpa-course-type-bar">
      <span style="font-weight:700;color:#0f172a;"><i class="fa-solid fa-graduation-cap"></i> Course Type:</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
        <input type="radio" name="gpaCourseTypeRadio" value="Regular" ${type === 'Regular' ? 'checked' : ''}
          onchange="setGpaCourseType('Regular')">
        Regular
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
        <input type="radio" name="gpaCourseTypeRadio" value="Honours" ${type === 'Honours' ? 'checked' : ''}
          onchange="setGpaCourseType('Honours')">
        Honours (Regular + Honours Electives)
      </label>
    </div>`;
}

function setGpaCourseType(type) {
  courseType[activeSem] = type;
  const previous = gpaData[activeSem] || [];
  const prevGrades = {};
  previous.forEach(s => { prevGrades[s.name] = s.grade; });

  const rebuilt = getDefaultSubjectsForSem(activeSem).map(s => ({
    ...s,
    grade: prevGrades[s.name] || ''
  }));

  gpaData[activeSem] = rebuilt;

  renderGpaCourseType();
  renderGpaSubjectsTable();
  renderGpaTabs();
  updateGpaResults();
}

// ============================================================
// SUBJECTS TABLE RENDERING
// ============================================================
function renderGpaSubjectsTable() {
  const area = document.getElementById('gpaSubjectsArea');
  if (!area) return;

  const subjects = gpaData[activeSem] || [];

  const totalCredits = subjects.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
  const totalCpg = subjects.reduce((sum, s) => {
    const gp = GRADE_POINTS[s.grade];
    return gp !== undefined ? sum + (parseFloat(s.credits) || 0) * gp : sum;
  }, 0);

  area.innerHTML = `
    <table class="gpa-custom-table">
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>SUBJECT NAME</th>
          <th style="width:80px;text-align:center;">CREDITS</th>
          <th style="width:100px;text-align:center;">GRADE</th>
          <th style="width:55px;text-align:center;">GP</th>
          <th style="width:100px;text-align:center;">CREDITS × GP</th>
          <th style="width:36px;text-align:center;"></th>
        </tr>
      </thead>
      <tbody>
        ${subjects.map((s, idx) => buildGpaRow(s, idx)).join('')}
      </tbody>
      <tfoot>
        <tr class="gpa-table-footer">
          <td colspan="2" class="gpa-total-label">TOTAL</td>
          <td class="gpa-total-credits-val">${totalCredits}</td>
          <td colspan="2"></td>
          <td class="gpa-total-cpg-val">${totalCpg.toFixed(1)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
}

function buildGpaRow(s, idx) {
  const gradeOptions = Object.keys(GRADE_POINTS).map(g =>
    `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  const gp = GRADE_POINTS[s.grade] !== undefined ? GRADE_POINTS[s.grade] : '—';
  const cpg = GRADE_POINTS[s.grade] !== undefined
    ? ((parseFloat(s.credits) || 0) * GRADE_POINTS[s.grade]).toFixed(1)
    : '—';

  return `
  <tr>
    <td class="gpa-row-idx">${idx + 1}</td>
    <td>
      <input
        type="text"
        class="gpa-subject-input"
        value="${escapeHtmlAttr(s.name)}"
        placeholder="e.g. Subject Name"
        oninput="updateGpaSubjectField(${idx}, 'name', this.value)">
    </td>
    <td style="text-align:center;">
      <input
        type="number"
        class="gpa-credits-input"
        min="0" max="15" step="0.5"
        value="${s.credits}"
        oninput="updateGpaSubjectField(${idx}, 'credits', parseFloat(this.value) || 0)">
    </td>
    <td style="text-align:center;">
      <select class="gpa-grade-select-custom" onchange="updateGpaSubjectField(${idx}, 'grade', this.value)">
        <option value="">—</option>
        ${gradeOptions}
      </select>
    </td>
    <td class="gpa-gp-cell">${gp}</td>
    <td class="gpa-cpg-cell">${cpg}</td>
    <td style="text-align:center;">
      <button
        type="button"
        class="gpa-delete-btn"
        onclick="removeGpaSubject(${idx})"
        title="Remove this subject">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  </tr>`;
}

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================
// DATA OPERATIONS
// ============================================================
function updateGpaSubjectField(idx, field, value) {
  if (gpaData[activeSem]?.[idx] !== undefined) {
    gpaData[activeSem][idx][field] = value;
  }
  renderGpaSubjectsTable();
  renderGpaTabs();
  updateGpaResults();
}

function addGpaSubject() {
  if (!gpaData[activeSem]) gpaData[activeSem] = [];
  gpaData[activeSem].push({ name: '', credits: 3, grade: '' });
  renderGpaSubjectsTable();
}

function removeGpaSubject(idx) {
  if (!gpaData[activeSem] || gpaData[activeSem].length <= 1) {
    alert('At least one subject row is required.');
    return;
  }
  gpaData[activeSem].splice(idx, 1);
  renderGpaSubjectsTable();
  renderGpaTabs();
  updateGpaResults();
}

function resetGpaSem() {
  if (!confirm(`Reset Semester ${activeSem} subjects and grades?`)) return;
  courseType[activeSem] = 'Regular';
  gpaData[activeSem] = getDefaultSubjectsForSem(activeSem);
  renderGpaCourseType();
  renderGpaSubjectsTable();
  renderGpaTabs();
  updateGpaResults();
}

function resetGpaAll() {
  if (!confirm('Reset all 8 semesters data to defaults?')) return;
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    courseType[i] = 'Regular';
    gpaData[i] = getDefaultSubjectsForSem(i);
  }
  renderGpaCourseType();
  renderGpaSubjectsTable();
  renderGpaTabs();
  updateGpaResults();
}

// ============================================================
// CALCULATIONS & RESULTS
// ============================================================
function calcSemGpa(sem) {
  const subs = gpaData[sem] || [];
  let tc = 0, tp = 0;
  subs.forEach(s => {
    if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
      const cr = parseFloat(s.credits) || 0;
      tc += cr;
      tp += cr * GRADE_POINTS[s.grade];
    }
  });
  return tc > 0 ? tp / tc : null;
}

function updateGpaResults() {
  // 1. Current Semester GPA
  const semGpa = calcSemGpa(activeSem);
  const semGpaEl = document.getElementById('currentSemGpa');
  if (semGpaEl) {
    semGpaEl.innerText = semGpa !== null ? semGpa.toFixed(2) : '—';
  }

  // 2. Overall CGPA
  let allCredits = 0, allPoints = 0;
  const allSemGpas = [];

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const subs = gpaData[i] || [];
    let tc = 0, tp = 0;
    subs.forEach(s => {
      if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
        const cr = parseFloat(s.credits) || 0;
        tc += cr;
        tp += cr * GRADE_POINTS[s.grade];
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
  if (cgpaEl) {
    cgpaEl.innerText = cgpa !== null ? cgpa.toFixed(2) : '—';
  }

  // 3. Bottom Summary Info
  const summaryEl = document.getElementById('gpaBottomSummary');
  if (summaryEl) {
    if (allSemGpas.length === 0) {
      summaryEl.innerHTML = '<span>Enter grades to see CGPA summary</span>';
    } else {
      let classification = '';
      if (cgpa >= 9.0) classification = '<strong style="color:#059669;">🚀 Outstanding</strong>';
      else if (cgpa >= 8.0) classification = '<strong style="color:#2563eb;">⭐ Excellent</strong>';
      else if (cgpa >= 7.0) classification = '<strong style="color:#1d4ed8;">🔥 Very Good</strong>';
      else if (cgpa >= 6.0) classification = '<strong style="color:#334155;">👍 Good</strong>';
      else classification = '<strong style="color:#dc2626;">⚠️ Needs Improvement</strong>';

      summaryEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>Calculated for <strong>${allSemGpas.length} semester(s)</strong> (${allCredits} total credits)</span>
          <span>•</span>
          <span>Performance: ${classification}</span>
        </div>
        <div style="font-weight:800;color:#2563eb;font-size:13px;">
          Overall CGPA: ${cgpa ? cgpa.toFixed(2) : '—'} / 10.0
        </div>
      `;
    }
  }
}

// ============================================================
// SYNC GPA TO STUDENT PROFILE (When logged in)
// ============================================================
async function syncGpaToStudentProfile() {
  if (typeof currentUser === 'undefined' || !currentUser || !currentToken) {
    alert('Please log in as a student to sync GPA to your profile.');
    return;
  }

  const semGpas = {};
  let totalCredits = 0;
  let totalPoints = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const g = calcSemGpa(i);
    semGpas[`sem${i}_gpa`] = g !== null ? g.toFixed(2) : '';
    if (g !== null) {
      const subs = gpaData[i] || [];
      subs.forEach(s => {
        if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
          const cr = parseFloat(s.credits) || 0;
          totalCredits += cr;
          totalPoints += cr * GRADE_POINTS[s.grade];
        }
      });
    }
  }

  const calculatedCgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  if (!confirm(`Sync calculated CGPA (${calculatedCgpa}) and Semester GPAs to your profile?`)) return;

  try {
    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('cgpa', calculatedCgpa);
    for (let i = 1; i <= TOTAL_SEMS; i++) {
      formData.append(`sem${i}_gpa`, semGpas[`sem${i}_gpa`]);
    }

    const res = await fetch(`${API_BASE}/student/profile/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` },
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      if (typeof showStudentAlert === 'function') {
        showStudentAlert(`✅ GPA & CGPA (${calculatedCgpa}) synced to your profile!`, true);
      } else {
        alert(`✅ GPA & CGPA (${calculatedCgpa}) synced to your profile!`);
      }
      if (typeof loadStudentProfile === 'function') {
        await loadStudentProfile();
      }
    } else {
      alert(data.message || 'Failed to sync GPA to profile.');
    }
  } catch (err) {
    console.error('Sync GPA error:', err);
    alert('Network error while syncing GPA.');
  }
}