// ============================================================
// GPA.JS — Anna University Credit-Based Semester GPA & CGPA Calculator
// Regulation 2021 — Computer Science and Business Systems (CSBS)
// Features:
//   1. Detailed Subject Grade Entry per semester
//   2. Quick Semester-wise GPA / Direct SGPA Entry mode
//   3. Semester-wise Cumulative CGPA calculated for each semester (Progressive CGPA)
//   4. Semester-wise Breakdown Table & Analytics
//   5. Profile sync with student placement profile
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS = 8;
const HONOURS_SEMS = [5, 6, 7];

const gpaData = {};          // { semIndex: [ { name, credits, grade } ] }
const courseType = {};       // { semIndex: 'Regular' | 'Honours' }
const directSemGpas = {};    // { semIndex: number | null } for direct GPA entry
let activeSem = 1;
let calcMode = 'detailed';   // 'detailed' | 'quick_sem'

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

function getSemDefaultTotalCredits(sem) {
  const subs = getDefaultSubjectsForSem(sem);
  return subs.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
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
    if (directSemGpas[i] === undefined) {
      directSemGpas[i] = null;
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
      
      <!-- Left Column: Main Calculator & Semester-wise CGPA Engine -->
      <div>
        <div class="gpa-calculator-card">
          
          <!-- Header Bar -->
          <div class="gpa-calc-header">
            <div class="gpa-header-icon-box">
              <i class="fa-solid fa-calculator"></i>
            </div>
            <div class="gpa-header-text">
              <h3>Semester GPA &amp; CGPA Calculator</h3>
              <p>Anna University Credit-Based System &bull; Semester-wise Cumulative CGPA</p>
            </div>
            <div class="gpa-mode-toggle-group">
              <button type="button" class="gpa-mode-btn ${calcMode === 'detailed' ? 'active' : ''}" onclick="setCalcMode('detailed')">
                <i class="fa-solid fa-list-check"></i> Subject Grades
              </button>
              <button type="button" class="gpa-mode-btn ${calcMode === 'quick_sem' ? 'active' : ''}" onclick="setCalcMode('quick_sem')">
                <i class="fa-solid fa-bolt"></i> Quick Sem GPAs
              </button>
            </div>
          </div>

          <!-- Semester Tabs Row -->
          <div class="gpa-sem-tabs-bar" id="gpaSemTabs"></div>

          <!-- Course Type Toggle (for Sem 5-7) -->
          <div id="gpaCourseTypeArea"></div>

          <!-- Results Score Cards (Current Sem GPA, Progressive CGPA up to this Sem, Overall CGPA) -->
          <div class="gpa-results-grid gpa-three-grid">
            <div class="gpa-score-card purple-card">
              <div class="gpa-score-label" id="gpaSemTitleLabel">SEMESTER ${activeSem} GPA</div>
              <div class="gpa-score-value" id="currentSemGpa">—</div>
              <div class="gpa-score-out" id="currentSemCreditsOut">Semester SGPA</div>
            </div>
            <div class="gpa-score-card blue-card">
              <div class="gpa-score-label" id="progressiveCgpaLabel">CGPA UP TO SEM ${activeSem}</div>
              <div class="gpa-score-value" id="progressiveCgpaVal">—</div>
              <div class="gpa-score-out" id="progressiveCreditsOut">Progressive Cumulative CGPA</div>
            </div>
            <div class="gpa-score-card green-card">
              <div class="gpa-score-label">OVERALL CGPA</div>
              <div class="gpa-score-value" id="overallCgpa">—</div>
              <div class="gpa-score-out" id="overallTotalCreditsOut">Across All Semesters</div>
            </div>
          </div>

          <!-- Main Input Area (Detailed Subjects Table OR Quick Semester Entry) -->
          <div class="gpa-table-wrap">
            <div id="gpaMainInputArea"></div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="gpa-actions-bar">
            ${calcMode === 'detailed' ? `
              <button type="button" class="gpa-btn-action" onclick="addGpaSubject()">
                <i class="fa-solid fa-plus"></i> Add Subject
              </button>
              <button type="button" class="gpa-btn-action" onclick="resetGpaSem()">
                <i class="fa-solid fa-rotate-left"></i> Reset Sem ${activeSem}
              </button>
            ` : ''}
            <button type="button" class="gpa-btn-action" onclick="resetGpaAll()">
              <i class="fa-solid fa-trash-can"></i> Reset All Semesters
            </button>
            ${allowProfileSync ? `
            <button type="button" class="gpa-btn-action gpa-btn-primary" onclick="syncGpaToStudentProfile()" style="margin-left:auto;">
              <i class="fa-solid fa-floppy-disk"></i> Sync All Sem GPAs to Profile
            </button>` : ''}
          </div>

          <!-- Semester-Wise Cumulative CGPA Breakdown Table -->
          <div class="gpa-sem-breakdown-section">
            <div class="gpa-section-header">
              <div class="gpa-section-title">
                <i class="fa-solid fa-chart-line"></i> Semester-wise GPA &amp; Cumulative CGPA Breakdown
              </div>
              <span class="gpa-section-subtitle">Calculated sequentially for each semester</span>
            </div>
            <div id="gpaSemBreakdownTableArea"></div>
          </div>

          <!-- Bottom Summary Info -->
          <div class="gpa-bottom-summary" id="gpaBottomSummary">
            <span>Enter grades to see semester-wise CGPA calculations</span>
          </div>

        </div>
      </div>

      <!-- Right Column: Sidebar Reference Cards -->
      <div class="gpa-sidebar-stack">

        <!-- 1. Grade Reference Card -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-table-cells"></i> Grade Point Reference
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
                  <td><strong>O (Outstanding)</strong></td>
                  <td style="text-align:center;"><span class="gp-val-green">10</span></td>
                  <td style="text-align:right;">91-100</td>
                </tr>
                <tr>
                  <td><strong>A+ (Excellent)</strong></td>
                  <td style="text-align:center;"><span class="gp-val-blue">9</span></td>
                  <td style="text-align:right;">81-90</td>
                </tr>
                <tr>
                  <td><strong>A (Very Good)</strong></td>
                  <td style="text-align:center;"><span class="gp-val-blue">8</span></td>
                  <td style="text-align:right;">71-80</td>
                </tr>
                <tr>
                  <td><strong>B+ (Good)</strong></td>
                  <td style="text-align:center;"><span class="gp-val-purple">7</span></td>
                  <td style="text-align:right;">61-70</td>
                </tr>
                <tr>
                  <td><strong>B (Average)</strong></td>
                  <td style="text-align:center;"><span class="gp-val-slate">6</span></td>
                  <td style="text-align:right;">50-60</td>
                </tr>
                <tr>
                  <td><strong>RA (Re-Appear)</strong></td>
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
            <i class="fa-solid fa-star"></i> Anna University CGPA Bands
          </div>
          <div class="gpa-sidebar-body">
            <div class="gpa-bands-list">
              <div class="gpa-band-item">
                <span class="gpa-band-range">9.0 – 10.0</span>
                <span class="gpa-band-badge badge-band-outstanding">🚀 Outstanding</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">8.0 – 8.99</span>
                <span class="gpa-band-badge badge-band-excellent">⭐ First Class with Distinction</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">7.0 – 7.99</span>
                <span class="gpa-band-badge badge-band-verygood">🔥 First Class</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">6.0 – 6.99</span>
                <span class="gpa-band-badge badge-band-good">👍 Second Class</span>
              </div>
              <div class="gpa-band-item">
                <span class="gpa-band-range">BELOW 6.0</span>
                <span class="gpa-band-badge badge-band-needs">⚠️ Needs Improvement</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. How Semester-wise CGPA Works Card -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-circle-info"></i> How Semester CGPA is Calculated
          </div>
          <div class="gpa-sidebar-body" style="font-size:12.5px;color:#4A3C59;line-height:1.6;">
            <p><strong>1. Semester GPA (SGPA):</strong></p>
            <div class="gpa-formula-box">
              SGPA = Σ(Credits × Grade Point) / Σ Credits
            </div>
            <p style="margin-top:10px;"><strong>2. Cumulative CGPA up to Semester N:</strong></p>
            <div class="gpa-formula-box">
              CGPA_N = Σ_{i=1}^N (Total Points_i) / Σ_{i=1}^N (Total Credits_i)
            </div>
            <p style="margin-top:8px;font-size:11.5px;color:#6E5D80;">
              Calculates the weighted average cumulative performance up to each semester.
            </p>
          </div>
        </div>

      </div>

    </div>
  `;

  renderGpaTabs();
  renderGpaCourseType();
  renderMainInputArea();
  renderSemBreakdownTable();
  updateGpaResults();
}

// ============================================================
// MODE SWITCHER (Detailed vs Quick Sem GPA)
// ============================================================
function setCalcMode(mode) {
  calcMode = mode;
  renderSemesterGpaApp(document.getElementById('gpaPage') ? 'gpaPage' : 'gpaDashboardContainer', true);
}

// ============================================================
// SEMESTER TABS
// ============================================================
function renderGpaTabs() {
  const tabsContainer = document.getElementById('gpaSemTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const semGpa = calcSemGpa(i);
    const hasGpa = semGpa !== null;
    const progCgpa = calcProgressiveCgpaUpTo(i);
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gpa-sem-pill-btn ${i === activeSem ? 'active' : ''}`;
    btn.title = `Semester ${i}${hasGpa ? ' — GPA: ' + semGpa.toFixed(2) + (progCgpa ? ' | CGPA: ' + progCgpa.toFixed(2) : '') : ''}`;
    
    let label = `Sem ${i}`;
    if (hasGpa) {
      label += ` <span class="pill-gpa-badge">${semGpa.toFixed(2)}</span>`;
    }
    btn.innerHTML = label;
    btn.onclick = () => switchGpaSem(i);
    tabsContainer.appendChild(btn);
  }
}

function switchGpaSem(sem) {
  activeSem = sem;
  const label = document.getElementById('gpaSemTitleLabel');
  if (label) label.innerText = `SEMESTER ${activeSem} GPA`;

  const progLabel = document.getElementById('progressiveCgpaLabel');
  if (progLabel) progLabel.innerText = `CGPA UP TO SEM ${activeSem}`;

  renderGpaTabs();
  renderGpaCourseType();
  renderMainInputArea();
  renderSemBreakdownTable();
  updateGpaResults();
}

// ============================================================
// COURSE TYPE TOGGLE (Sem 5-7)
// ============================================================
function renderGpaCourseType() {
  const area = document.getElementById('gpaCourseTypeArea');
  if (!area) return;

  if (calcMode === 'quick_sem' || !semHasHonours(activeSem)) {
    area.innerHTML = '';
    return;
  }

  const type = courseType[activeSem] || 'Regular';

  area.innerHTML = `
    <div class="gpa-course-type-bar">
      <span style="font-weight:700;color:#2D2438;"><i class="fa-solid fa-graduation-cap"></i> Course Type:</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
        <input type="radio" name="gpaCourseTypeRadio" value="Regular" ${type === 'Regular' ? 'checked' : ''}
          onchange="setGpaCourseType('Regular')">
        Regular (Preset CSBS Curriculum)
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
        <input type="radio" name="gpaCourseTypeRadio" value="Honours" ${type === 'Honours' ? 'checked' : ''}
          onchange="setGpaCourseType('Honours')">
        Honours (+ Honours Electives)
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
  renderMainInputArea();
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
}

// ============================================================
// MAIN INPUT AREA (DETAILED SUBJECTS VS QUICK SEMESTER GPAs)
// ============================================================
function renderMainInputArea() {
  const area = document.getElementById('gpaMainInputArea');
  if (!area) return;

  if (calcMode === 'quick_sem') {
    renderQuickSemInputGrid(area);
  } else {
    renderDetailedSubjectsTable(area);
  }
}

// Mode 1: Detailed Subjects Table
function renderDetailedSubjectsTable(area) {
  const subjects = gpaData[activeSem] || [];

  const totalCredits = subjects.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
  const totalCpg = subjects.reduce((sum, s) => {
    const gp = GRADE_POINTS[s.grade];
    return gp !== undefined ? sum + (parseFloat(s.credits) || 0) * gp : sum;
  }, 0);

  area.innerHTML = `
    <div class="gpa-table-subheader">
      <div>
        <strong>Semester ${activeSem} Subjects</strong> &bull; Select the grade obtained in each subject
      </div>
      <div class="gpa-table-count-badge">
        ${subjects.length} Subjects &bull; ${totalCredits} Credits
      </div>
    </div>
    <table class="gpa-custom-table">
      <thead>
        <tr>
          <th style="width:38px;text-align:center;">#</th>
          <th>SUBJECT CODE &amp; NAME</th>
          <th style="width:85px;text-align:center;">CREDITS</th>
          <th style="width:110px;text-align:center;">GRADE</th>
          <th style="width:60px;text-align:center;">GP</th>
          <th style="width:110px;text-align:center;">CREDITS × GP</th>
          <th style="width:40px;text-align:center;"></th>
        </tr>
      </thead>
      <tbody>
        ${subjects.map((s, idx) => buildGpaRow(s, idx)).join('')}
      </tbody>
      <tfoot>
        <tr class="gpa-table-footer">
          <td colspan="2" class="gpa-total-label">SEMESTER ${activeSem} TOTAL</td>
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
    `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g} (${GRADE_POINTS[g]} GP)</option>`
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
        <option value="">Select</option>
        ${gradeOptions}
      </select>
    </td>
    <td class="gpa-gp-cell ${gp === 10 ? 'gp-green' : gp >= 8 ? 'gp-blue' : gp === 0 ? 'gp-red' : ''}">${gp}</td>
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

// Mode 2: Quick Semester-wise GPA Entry Grid
function renderQuickSemInputGrid(area) {
  let rowsHtml = '';

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const defaultCredits = getSemDefaultTotalCredits(i);
    const calculated = calcSemGpaFromSubjects(i);
    const directVal = directSemGpas[i] !== null ? directSemGpas[i] : (calculated !== null ? calculated.toFixed(2) : '');
    const progCgpa = calcProgressiveCgpaUpTo(i);

    rowsHtml += `
      <div class="gpa-quick-sem-card ${i === activeSem ? 'active-quick-sem' : ''}">
        <div class="quick-sem-top">
          <div class="quick-sem-title">
            <span class="quick-sem-num">Sem ${i}</span>
            <span class="quick-sem-cr">${defaultCredits} Credits</span>
          </div>
          <button type="button" class="btn-goto-sem" onclick="switchGpaSem(${i})" title="View subjects for Sem ${i}">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
        </div>
        <div class="quick-sem-input-group">
          <label for="directSemGpa_${i}">Semester GPA (SGPA):</label>
          <input
            type="number"
            id="directSemGpa_${i}"
            class="gpa-direct-input"
            min="0"
            max="10"
            step="0.01"
            placeholder="e.g. 8.50"
            value="${directVal}"
            oninput="handleDirectSemGpaInput(${i}, this.value)">
        </div>
        <div class="quick-sem-prog-cgpa">
          <span>CGPA up to Sem ${i}:</span>
          <strong>${progCgpa !== null ? progCgpa.toFixed(2) : '—'}</strong>
        </div>
      </div>
    `;
  }

  area.innerHTML = `
    <div class="gpa-quick-intro">
      <div>
        <strong>Quick Semester GPA Mode:</strong> Directly enter the calculated GPA for each semester to instantly view progressive CGPA and overall degree CGPA.
      </div>
    </div>
    <div class="gpa-quick-grid">
      ${rowsHtml}
    </div>
  `;
}

function handleDirectSemGpaInput(sem, val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 0 || num > 10) {
    directSemGpas[sem] = null;
  } else {
    directSemGpas[sem] = num;
  }
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
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
  // Clear direct override when editing subjects directly
  directSemGpas[activeSem] = null;
  renderMainInputArea();
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
}

function addGpaSubject() {
  if (!gpaData[activeSem]) gpaData[activeSem] = [];
  gpaData[activeSem].push({ name: '', credits: 3, grade: '' });
  directSemGpas[activeSem] = null;
  renderMainInputArea();
  renderSemBreakdownTable();
}

function removeGpaSubject(idx) {
  if (!gpaData[activeSem] || gpaData[activeSem].length <= 1) {
    alert('At least one subject row is required in the semester.');
    return;
  }
  gpaData[activeSem].splice(idx, 1);
  directSemGpas[activeSem] = null;
  renderMainInputArea();
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
}

function resetGpaSem() {
  if (!confirm(`Reset Semester ${activeSem} subjects and grades?`)) return;
  courseType[activeSem] = 'Regular';
  gpaData[activeSem] = getDefaultSubjectsForSem(activeSem);
  directSemGpas[activeSem] = null;
  renderGpaCourseType();
  renderMainInputArea();
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
}

function resetGpaAll() {
  if (!confirm('Reset all 8 semesters data to defaults?')) return;
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    courseType[i] = 'Regular';
    gpaData[i] = getDefaultSubjectsForSem(i);
    directSemGpas[i] = null;
  }
  renderGpaCourseType();
  renderMainInputArea();
  renderGpaTabs();
  renderSemBreakdownTable();
  updateGpaResults();
}

// ============================================================
// SEMESTER-WISE CGPA CALCULATION ENGINE
// ============================================================
function calcSemGpaFromSubjects(sem) {
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

function calcSemGpa(sem) {
  // If direct sem GPA was entered in quick mode, use it
  if (directSemGpas[sem] !== null && directSemGpas[sem] !== undefined) {
    return directSemGpas[sem];
  }
  return calcSemGpaFromSubjects(sem);
}

function getSemActiveCredits(sem) {
  if (directSemGpas[sem] !== null && directSemGpas[sem] !== undefined) {
    return getSemDefaultTotalCredits(sem);
  }
  const subs = gpaData[sem] || [];
  let tc = 0;
  subs.forEach(s => {
    if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
      tc += parseFloat(s.credits) || 0;
    }
  });
  return tc > 0 ? tc : getSemDefaultTotalCredits(sem);
}

// Progressive CGPA up to a given semester (e.g. up to Sem 3 = (P1+P2+P3)/(C1+C2+C3))
function calcProgressiveCgpaUpTo(semLimit) {
  let totalCredits = 0;
  let totalPoints = 0;
  let hasAny = false;

  for (let i = 1; i <= semLimit; i++) {
    const gpa = calcSemGpa(i);
    if (gpa !== null) {
      const cr = getSemActiveCredits(i);
      totalCredits += cr;
      totalPoints += cr * gpa;
      hasAny = true;
    }
  }

  return (hasAny && totalCredits > 0) ? (totalPoints / totalCredits) : null;
}

// ============================================================
// SEMESTER-WISE CGPA BREAKDOWN TABLE RENDERER
// ============================================================
function renderSemBreakdownTable() {
  const area = document.getElementById('gpaSemBreakdownTableArea');
  if (!area) return;

  let rowsHtml = '';
  let cumulativeCredits = 0;
  let cumulativePoints = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const semGpa = calcSemGpa(i);
    const cr = getSemActiveCredits(i);
    const isCompleted = semGpa !== null;

    if (isCompleted) {
      cumulativeCredits += cr;
      cumulativePoints += cr * semGpa;
    }

    const progCgpa = (isCompleted && cumulativeCredits > 0) ? (cumulativePoints / cumulativeCredits) : null;

    let badge = '<span class="sem-status-badge pending">Pending</span>';
    if (isCompleted) {
      if (progCgpa >= 9.0) badge = '<span class="gpa-band-badge badge-band-outstanding">🚀 Outstanding</span>';
      else if (progCgpa >= 8.0) badge = '<span class="gpa-band-badge badge-band-excellent">⭐ First Class Dist.</span>';
      else if (progCgpa >= 7.0) badge = '<span class="gpa-band-badge badge-band-verygood">🔥 First Class</span>';
      else if (progCgpa >= 6.0) badge = '<span class="gpa-band-badge badge-band-good">👍 Second Class</span>';
      else badge = '<span class="gpa-band-badge badge-band-needs">⚠️ Needs Improvement</span>';
    }

    const isCurrentActive = i === activeSem;

    rowsHtml += `
      <tr class="${isCurrentActive ? 'current-active-row' : ''} ${isCompleted ? 'completed-row' : ''}">
        <td style="text-align:center;">
          <button type="button" class="btn-sem-tag ${isCurrentActive ? 'active' : ''}" onclick="switchGpaSem(${i})" title="Switch to Semester ${i}">
            Sem ${i}
          </button>
        </td>
        <td>
          <span class="sem-type-tag ${courseType[i] === 'Honours' ? 'honours' : 'regular'}">
            ${courseType[i] || 'Regular'}
          </span>
        </td>
        <td style="text-align:center;font-weight:700;">${cr}</td>
        <td style="text-align:center;">
          <strong class="sem-gpa-display ${isCompleted ? 'has-gpa' : ''}">
            ${isCompleted ? semGpa.toFixed(2) : '—'}
          </strong>
        </td>
        <td style="text-align:center;">
          <strong class="sem-cgpa-display ${progCgpa !== null ? 'has-cgpa' : ''}">
            ${progCgpa !== null ? progCgpa.toFixed(2) : '—'}
          </strong>
        </td>
        <td>${badge}</td>
        <td style="text-align:center;">
          <button type="button" class="btn-row-action" onclick="switchGpaSem(${i})">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
        </td>
      </tr>
    `;
  }

  area.innerHTML = `
    <div class="gpa-breakdown-table-wrap">
      <table class="gpa-breakdown-table">
        <thead>
          <tr>
            <th style="width:75px;text-align:center;">SEMESTER</th>
            <th>TRACK</th>
            <th style="width:85px;text-align:center;">CREDITS</th>
            <th style="width:120px;text-align:center;">SEMESTER GPA (SGPA)</th>
            <th style="width:140px;text-align:center;">CUMULATIVE CGPA</th>
            <th>PERFORMANCE BAND</th>
            <th style="width:75px;text-align:center;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// CALCULATIONS & RESULTS UPDATE
// ============================================================
function updateGpaResults() {
  // 1. Current Semester GPA
  const semGpa = calcSemGpa(activeSem);
  const semGpaEl = document.getElementById('currentSemGpa');
  if (semGpaEl) {
    semGpaEl.innerText = semGpa !== null ? semGpa.toFixed(2) : '—';
  }

  const semCr = getSemActiveCredits(activeSem);
  const semCrEl = document.getElementById('currentSemCreditsOut');
  if (semCrEl) {
    semCrEl.innerText = `${semCr} Semester Credits`;
  }

  // 2. Progressive CGPA up to Active Semester
  const progCgpa = calcProgressiveCgpaUpTo(activeSem);
  const progCgpaEl = document.getElementById('progressiveCgpaVal');
  if (progCgpaEl) {
    progCgpaEl.innerText = progCgpa !== null ? progCgpa.toFixed(2) : '—';
  }

  // 3. Overall CGPA across all 8 semesters
  let allCredits = 0;
  let allPoints = 0;
  let completedSemsCount = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const g = calcSemGpa(i);
    if (g !== null) {
      const cr = getSemActiveCredits(i);
      allCredits += cr;
      allPoints += cr * g;
      completedSemsCount++;
    }
  }

  const overallCgpa = allCredits > 0 ? (allPoints / allCredits) : null;
  const overallCgpaEl = document.getElementById('overallCgpa');
  if (overallCgpaEl) {
    overallCgpaEl.innerText = overallCgpa !== null ? overallCgpa.toFixed(2) : '—';
  }

  const overallCrEl = document.getElementById('overallTotalCreditsOut');
  if (overallCrEl) {
    overallCrEl.innerText = `${allCredits} Total Credits Earned (${completedSemsCount}/${TOTAL_SEMS} Sems)`;
  }

  // 4. Bottom Summary Info
  const summaryEl = document.getElementById('gpaBottomSummary');
  if (summaryEl) {
    if (completedSemsCount === 0) {
      summaryEl.innerHTML = '<span>Enter subject grades or semester GPAs to compute semester-wise and overall CGPA</span>';
    } else {
      let classification = '';
      if (overallCgpa >= 9.0) classification = '<strong style="color:#059669;">🚀 Outstanding</strong>';
      else if (overallCgpa >= 8.0) classification = '<strong style="color:#2563eb;">⭐ First Class with Distinction</strong>';
      else if (overallCgpa >= 7.0) classification = '<strong style="color:#1d4ed8;">🔥 First Class</strong>';
      else if (overallCgpa >= 6.0) classification = '<strong style="color:#334155;">👍 Second Class</strong>';
      else classification = '<strong style="color:#dc2626;">⚠️ Needs Improvement</strong>';

      summaryEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <span>Calculated for <strong>${completedSemsCount} of ${TOTAL_SEMS} Semester(s)</strong> (${allCredits} credits)</span>
          <span>&bull;</span>
          <span>Degree Standing: ${classification}</span>
        </div>
        <div style="font-weight:800;color:#9C27B0;font-size:13.5px;">
          Overall CGPA: ${overallCgpa ? overallCgpa.toFixed(2) : '—'} / 10.0
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
    alert('Please log in as a student to sync semester GPAs to your profile.');
    return;
  }

  const semGpas = {};
  let totalCredits = 0;
  let totalPoints = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const g = calcSemGpa(i);
    semGpas[`sem${i}_gpa`] = g !== null ? g.toFixed(2) : '';
    if (g !== null) {
      const cr = getSemActiveCredits(i);
      totalCredits += cr;
      totalPoints += cr * g;
    }
  }

  const calculatedCgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  if (!confirm(`Sync calculated CGPA (${calculatedCgpa}) and all Semester GPAs to your placement profile?`)) return;

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
        showStudentAlert(`✅ All Semester GPAs & CGPA (${calculatedCgpa}) synced to your profile!`, true);
      } else {
        alert(`✅ All Semester GPAs & CGPA (${calculatedCgpa}) synced to your profile!`);
      }
      if (typeof loadStudentProfile === 'function') {
        await loadStudentProfile();
      }
    } else {
      alert(data.message || 'Failed to sync GPA to profile.');
    }
  } catch (err) {
    console.error('Sync GPA error:', err);
    alert('Network error while syncing GPA to profile.');
  }
}