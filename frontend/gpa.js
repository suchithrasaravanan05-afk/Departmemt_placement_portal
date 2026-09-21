// ============================================================
// GPA.JS — Anna University CSBS Regulation 2021
// Dual Calculator:
//   1. TOP: Semester GPA Calculator (Subject Grade Selection per Semester)
//   2. BELOW: Semester-wise Cumulative CGPA Calculator (8 Small Semester GPA Boxes)
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS = 8;
const HONOURS_SEMS = [5, 6, 7];
const DEFAULT_SEM_CREDITS = { 1: 22, 2: 26, 3: 25, 4: 24, 5: 18, 6: 24, 7: 14, 8: 10 };

// Official CSBS Regulation 2021 Regular Curriculum
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

// Honours Subjects (Sem 5-7)
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

// Application State
const gpaData = {};           // Subject grades for each semester: { 1: [...], 2: [...] }
const courseType = {};        // Regular / Honours for Sem 5-7
const semGpaValues = {};      // Direct GPA values for 8 small boxes: { 1: 8.5, 2: 8.25, ... }
let activeSem = 1;

function semHasHonours(sem) {
  return HONOURS_SEMS.includes(sem);
}

function getDefaultSubjectsForSem(sem) {
  const regular = (REGULAR_SUBJECTS[sem] || []).map(s => ({ ...s }));
  if (!semHasHonours(sem)) return regular.length > 0 ? regular : [{ name: '', credits: 3, grade: '' }];
  if (courseType[sem] === 'Honours') {
    const honours = (HONOURS_SUBJECTS[sem] || []).map(s => ({ ...s }));
    return [...regular, ...honours];
  }
  return regular;
}

function getSemActiveCredits(sem) {
  const subs = gpaData[sem] || getDefaultSubjectsForSem(sem);
  const sum = subs.reduce((acc, s) => acc + (parseFloat(s.credits) || 0), 0);
  return sum > 0 ? sum : (DEFAULT_SEM_CREDITS[sem] || 20);
}

function initGpaState() {
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    if (!courseType[i]) courseType[i] = 'Regular';
    if (!gpaData[i] || gpaData[i].length === 0) {
      gpaData[i] = getDefaultSubjectsForSem(i);
    }
    if (semGpaValues[i] === undefined) semGpaValues[i] = null;
  }
}

// Auto-boot if loaded on standalone gpa.html
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('gpaPage');
    if (root) {
      initGpaState();
      renderSemesterGpaApp('gpaPage', false);
    }
  });
}

// ============================================================
// MAIN APPLICATION RENDERER
// ============================================================
function renderSemesterGpaApp(targetElementId, allowProfileSync = false) {
  const root = document.getElementById(targetElementId);
  if (!root) return;

  initGpaState();

  root.innerHTML = `
    <div class="gpa-container-grid">
      
      <!-- Left Column: TOP (GPA Calculator) & BELOW (CGPA Small Boxes) -->
      <div>
        
        <!-- =======================================================
             TOP SECTION: SEMESTER GPA CALCULATOR
             ======================================================= -->
        <div class="gpa-calculator-card">
          
          <!-- Header Bar -->
          <div class="gpa-calc-header">
            <div class="gpa-header-icon-box">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div class="gpa-header-text">
              <h3>1. Semester GPA Calculator (SGPA)</h3>
              <p>Select subject grades &bull; Calculates Semester GPA and transfers to CGPA boxes below</p>
            </div>
          </div>

          <!-- Semester Selection Tabs -->
          <div class="gpa-sem-tabs-bar" id="gpaSemTabs"></div>

          <!-- Course Type Toggle (for Sem 5-7) -->
          <div id="gpaCourseTypeArea"></div>

          <!-- Semester GPA Score Banner (Top Live Result) -->
          <div class="gpa-top-result-banner">
            <div class="top-result-score-box">
              <span class="top-result-lbl" id="topSemTitle">SEMESTER ${activeSem} GPA</span>
              <div class="top-result-val" id="topSemGpaVal">—</div>
              <span class="top-result-sub" id="topSemCreditsSub">Select subject grades below</span>
            </div>
          </div>

          <!-- Subjects Table for Selected Semester -->
          <div class="gpa-table-wrap">
            <div id="gpaSubjectsTableArea"></div>
          </div>

          <!-- Top Section Action Buttons -->
          <div class="gpa-actions-bar" style="border-top:1px solid #E1BEE7;">
            <button type="button" class="gpa-btn-action" onclick="addGpaSubject()">
              <i class="fa-solid fa-plus"></i> Add Subject
            </button>
            <button type="button" class="gpa-btn-action" onclick="resetCurrentSem()">
              <i class="fa-solid fa-rotate-left"></i> Reset Semester ${activeSem}
            </button>
          </div>

        </div>

        <!-- =======================================================
             BELOW SECTION: CUMULATIVE CGPA CALCULATOR (FOR EACH SEMESTER)
             ======================================================= -->
        <div class="gpa-calculator-card" style="margin-top:28px;">
          
          <!-- Header Bar -->
          <div class="gpa-calc-header gpa-calc-header-cgpa">
            <div class="gpa-header-icon-box" style="background: rgba(255, 255, 255, 0.25);">
              <i class="fa-solid fa-calculator"></i>
            </div>
            <div class="gpa-header-text">
              <h3>2. Cumulative CGPA Calculator (For Each Semester)</h3>
              <p>Small box for each semester &bull; Automatically calculates progressive CGPA &amp; Overall Degree CGPA</p>
            </div>
          </div>

          <!-- CGPA Results Dashboard Cards -->
          <div class="gpa-results-grid gpa-two-grid">
            <div class="gpa-score-card purple-card">
              <div class="gpa-score-label">OVERALL DEGREE CGPA</div>
              <div class="gpa-score-value" id="overallCgpaVal">—</div>
              <div class="gpa-score-out" id="overallCreditsOut">0 of 163 Total Credits Completed</div>
            </div>
            <div class="gpa-score-card blue-card">
              <div class="gpa-score-label">DEGREE CLASSIFICATION</div>
              <div class="gpa-score-value" id="degreeClassVal" style="font-size:22px;margin:8px 0;">Pending Entry</div>
              <div class="gpa-score-out" id="completedSemsOut">Enter or calculate semester GPAs</div>
            </div>
          </div>

          <!-- 8 SMALL SEMESTER GPA BOXES -->
          <div class="gpa-sem-boxes-section">
            <div class="gpa-section-header">
              <div class="gpa-section-title">
                <i class="fa-solid fa-table-cells-large"></i> Semester-wise GPA Input Boxes
              </div>
              <span class="gpa-section-subtitle">Auto-synced from top subject calculator or type directly</span>
            </div>

            <div class="gpa-sem-cards-grid" id="semBoxesGridArea">
              ${renderSemesterBoxesHtml()}
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="gpa-actions-bar">
            <button type="button" class="gpa-btn-action" onclick="fillSampleGpas()">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Try Sample GPAs
            </button>
            <button type="button" class="gpa-btn-action" onclick="clearAllSemGpas()">
              <i class="fa-solid fa-trash-can"></i> Clear All CGPA Boxes
            </button>
            ${allowProfileSync ? `
            <button type="button" class="gpa-btn-action gpa-btn-primary" onclick="syncGpaToStudentProfile()" style="margin-left:auto;">
              <i class="fa-solid fa-floppy-disk"></i> Sync All GPAs &amp; CGPA to Profile
            </button>` : ''}
          </div>

          <!-- Bottom Summary Bar -->
          <div class="gpa-bottom-summary" id="gpaBottomSummary">
            <span>Calculate GPA at top or type directly in any semester box to compute cumulative CGPA</span>
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
                <span class="gpa-band-badge badge-band-excellent">⭐ First Class Dist.</span>
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

        <!-- 3. How GPA & CGPA are Calculated -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-circle-info"></i> How GPA &amp; CGPA Work
          </div>
          <div class="gpa-sidebar-body" style="font-size:12.5px;color:#4A3C59;line-height:1.6;">
            <p><strong>Top: Semester GPA (SGPA)</strong></p>
            <div class="gpa-formula-box">
              GPA = Σ(Credits × GP) / Σ(Credits)
            </div>
            <p style="margin-top:10px;"><strong>Below: Cumulative CGPA for Each Sem</strong></p>
            <div class="gpa-formula-box">
              CGPA_N = Σ(GPA_i × Credits_i) / Σ(Credits_i)
            </div>
            <p style="margin-top:8px;font-size:11.5px;color:#6E5D80;">
              Calculates progressive cumulative CGPA after each completed semester based on Anna University credit weightings.
            </p>
          </div>
        </div>

      </div>

    </div>
  `;

  renderGpaTabs();
  renderGpaCourseType();
  renderSubjectsTable();
  updateTopGpaScore();
  updateAllCalculations();
}

// ============================================================
// TOP SECTION: SEMESTER TABS & SUBJECTS TABLE
// ============================================================
function renderGpaTabs() {
  const tabsContainer = document.getElementById('gpaSemTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const semGpa = calcSemGpaFromSubjects(i);
    const hasGpa = semGpa !== null || semGpaValues[i] !== null;
    const dispGpa = semGpa !== null ? semGpa : semGpaValues[i];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `gpa-sem-pill-btn ${i === activeSem ? 'active' : ''}`;
    
    let label = `Sem ${i}`;
    if (hasGpa && dispGpa !== null) {
      label += ` <span class="pill-gpa-badge">${dispGpa.toFixed(2)}</span>`;
    }
    btn.innerHTML = label;
    btn.onclick = () => switchGpaSem(i);
    tabsContainer.appendChild(btn);
  }
}

function switchGpaSem(sem) {
  activeSem = sem;
  const titleEl = document.getElementById('topSemTitle');
  if (titleEl) titleEl.innerText = `SEMESTER ${activeSem} GPA`;

  renderGpaTabs();
  renderGpaCourseType();
  renderSubjectsTable();
  updateTopGpaScore();
}

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
      <span style="font-weight:700;color:#2D2438;"><i class="fa-solid fa-graduation-cap"></i> Course Type:</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
        <input type="radio" name="gpaCourseTypeRadio" value="Regular" ${type === 'Regular' ? 'checked' : ''}
          onchange="setGpaCourseType('Regular')">
        Regular (CSBS Curriculum)
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

  gpaData[activeSem] = getDefaultSubjectsForSem(activeSem).map(s => ({
    ...s,
    grade: prevGrades[s.name] || ''
  }));

  renderGpaCourseType();
  renderSubjectsTable();
  updateTopGpaScore();
  autoSyncSubjectGpaToBelow(activeSem);
}

function renderSubjectsTable() {
  const area = document.getElementById('gpaSubjectsTableArea');
  if (!area) return;

  const subjects = gpaData[activeSem] || [];
  const totalCredits = subjects.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
  const totalCpg = subjects.reduce((sum, s) => {
    const gp = GRADE_POINTS[s.grade];
    return gp !== undefined ? sum + (parseFloat(s.credits) || 0) * gp : sum;
  }, 0);

  area.innerHTML = `
    <div class="gpa-table-subheader">
      <div>
        <strong style="color:#7B1FA2;font-size:14px;"><i class="fa-solid fa-book-open"></i> Semester ${activeSem} Subjects:</strong>
        <span style="color:#6E5D80;margin-left:6px;">Select your grade for each subject below</span>
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
          <th style="width:120px;text-align:center;">GRADE</th>
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
          <td colspan="2" class="gpa-total-label">SEMESTER ${activeSem} SUBJECTS TOTAL</td>
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
        placeholder="Subject Name"
        oninput="updateSubjectField(${idx}, 'name', this.value)">
    </td>
    <td style="text-align:center;">
      <input
        type="number"
        class="gpa-credits-input"
        min="0" max="15" step="0.5"
        value="${s.credits}"
        oninput="updateSubjectField(${idx}, 'credits', parseFloat(this.value) || 0)">
    </td>
    <td style="text-align:center;">
      <select class="gpa-grade-select-custom" onchange="updateSubjectField(${idx}, 'grade', this.value)">
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
        onclick="removeSubject(${idx})"
        title="Remove subject">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  </tr>`;
}

function updateSubjectField(idx, field, value) {
  if (gpaData[activeSem]?.[idx] !== undefined) {
    gpaData[activeSem][idx][field] = value;
  }
  renderSubjectsTable();
  updateTopGpaScore();
  autoSyncSubjectGpaToBelow(activeSem);
}

function addGpaSubject() {
  if (!gpaData[activeSem]) gpaData[activeSem] = [];
  gpaData[activeSem].push({ name: '', credits: 3, grade: '' });
  renderSubjectsTable();
}

function removeSubject(idx) {
  if (!gpaData[activeSem] || gpaData[activeSem].length <= 1) {
    alert('At least one subject is required.');
    return;
  }
  gpaData[activeSem].splice(idx, 1);
  renderSubjectsTable();
  updateTopGpaScore();
  autoSyncSubjectGpaToBelow(activeSem);
}

function resetCurrentSem() {
  if (!confirm(`Reset Semester ${activeSem} subjects and grades?`)) return;
  courseType[activeSem] = 'Regular';
  gpaData[activeSem] = getDefaultSubjectsForSem(activeSem);
  renderGpaCourseType();
  renderSubjectsTable();
  updateTopGpaScore();
  autoSyncSubjectGpaToBelow(activeSem);
}

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

function updateTopGpaScore() {
  const semGpa = calcSemGpaFromSubjects(activeSem);
  const valEl = document.getElementById('topSemGpaVal');
  const subEl = document.getElementById('topSemCreditsSub');
  const credits = getSemActiveCredits(activeSem);

  if (valEl) {
    valEl.innerText = semGpa !== null ? semGpa.toFixed(2) : '—';
  }
  if (subEl) {
    subEl.innerText = semGpa !== null 
      ? `Calculated from ${credits} Semester Credits` 
      : `Select subject grades below (${credits} credits)`;
  }
}

// Auto-sync calculated GPA from top subject table into the below small box
function autoSyncSubjectGpaToBelow(sem) {
  const calc = calcSemGpaFromSubjects(sem);
  if (calc !== null) {
    semGpaValues[sem] = calc;
    const input = document.getElementById(`semGpaInput_${sem}`);
    if (input) input.value = calc.toFixed(2);
    const clearBtn = document.getElementById(`clearBtn_${sem}`);
    if (clearBtn) clearBtn.style.display = 'inline-block';
  }
  renderGpaTabs();
  updateAllCalculations();
}

// ============================================================
// BELOW SECTION: 8 SMALL SEMESTER BOXES & PROGRESSIVE CGPA
// ============================================================
function renderSemesterBoxesHtml() {
  let html = '';

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const cr = DEFAULT_SEM_CREDITS[i] || 20;
    const gpaVal = semGpaValues[i] !== null ? semGpaValues[i].toFixed(2) : '';

    html += `
      <div class="gpa-single-sem-box-card" id="semCard_${i}">
        
        <div class="sem-box-card-top">
          <div class="sem-box-title-tag">
            <span class="sem-box-name">Sem ${i}</span>
            <span class="sem-box-cr-badge">${cr} Credits</span>
          </div>
          <button type="button" class="btn-clear-single-sem" id="clearBtn_${i}" onclick="clearSingleSemGpa(${i})" title="Clear Sem ${i}" style="${semGpaValues[i] !== null ? '' : 'display:none;'}">
            &times;
          </button>
        </div>

        <div class="sem-box-input-wrap">
          <label for="semGpaInput_${i}">Semester ${i} GPA:</label>
          <div class="sem-input-inner">
            <i class="fa-solid fa-graduation-cap sem-box-ico"></i>
            <input
              type="number"
              id="semGpaInput_${i}"
              class="sem-direct-gpa-input"
              min="0"
              max="10"
              step="0.01"
              placeholder="0.00"
              value="${gpaVal}"
              oninput="handleDirectSemGpaChange(${i}, this.value)"
            >
          </div>
        </div>

        <div class="sem-box-auto-result" id="semAutoResult_${i}">
          <div class="sem-auto-cgpa-row">
            <span class="sem-auto-lbl">CGPA up to Sem ${i}:</span>
            <strong class="sem-auto-cgpa-val" id="semProgCgpa_${i}">—</strong>
          </div>
          <div class="sem-auto-badge-wrap" id="semProgBadge_${i}">
            <span class="sem-status-badge pending">Pending</span>
          </div>
        </div>

      </div>
    `;
  }

  return html;
}

function handleDirectSemGpaChange(sem, val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 0 || num > 10) {
    semGpaValues[sem] = null;
  } else {
    semGpaValues[sem] = num;
  }

  const clearBtn = document.getElementById(`clearBtn_${sem}`);
  if (clearBtn) {
    clearBtn.style.display = semGpaValues[sem] !== null ? 'inline-block' : 'none';
  }

  renderGpaTabs();
  updateAllCalculations();
}

function clearSingleSemGpa(sem) {
  semGpaValues[sem] = null;
  const input = document.getElementById(`semGpaInput_${sem}`);
  if (input) input.value = '';

  const clearBtn = document.getElementById(`clearBtn_${sem}`);
  if (clearBtn) clearBtn.style.display = 'none';

  renderGpaTabs();
  updateAllCalculations();
}

function clearAllSemGpas() {
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    semGpaValues[i] = null;
    const input = document.getElementById(`semGpaInput_${i}`);
    if (input) input.value = '';
    const clearBtn = document.getElementById(`clearBtn_${i}`);
    if (clearBtn) clearBtn.style.display = 'none';
  }
  renderGpaTabs();
  updateAllCalculations();
}

function fillSampleGpas() {
  const sample = [8.50, 8.25, 8.80, 8.40, 8.90, 8.70, 9.10, 9.50];
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    semGpaValues[i] = sample[i - 1];
    const input = document.getElementById(`semGpaInput_${i}`);
    if (input) input.value = sample[i - 1].toFixed(2);
    const clearBtn = document.getElementById(`clearBtn_${i}`);
    if (clearBtn) clearBtn.style.display = 'inline-block';
  }
  renderGpaTabs();
  updateAllCalculations();
}

// ============================================================
// AUTOMATIC CGPA CALCULATION (Real-Time)
// ============================================================
function updateAllCalculations() {
  let cumulativeCredits = 0;
  let cumulativePoints = 0;
  let completedCount = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const gpa = semGpaValues[i];
    const cr = DEFAULT_SEM_CREDITS[i];
    const hasGpa = gpa !== null;

    if (hasGpa) {
      cumulativeCredits += cr;
      cumulativePoints += cr * gpa;
      completedCount++;
    }

    const progCgpa = (hasGpa && cumulativeCredits > 0) ? (cumulativePoints / cumulativeCredits) : null;

    const cardEl = document.getElementById(`semCard_${i}`);
    if (cardEl) {
      if (hasGpa) cardEl.classList.add('has-entered-gpa');
      else cardEl.classList.remove('has-entered-gpa');
    }

    const progCgpaEl = document.getElementById(`semProgCgpa_${i}`);
    if (progCgpaEl) {
      progCgpaEl.innerText = progCgpa !== null ? progCgpa.toFixed(2) : '—';
      if (progCgpa !== null) progCgpaEl.classList.add('active-val');
      else progCgpaEl.classList.remove('active-val');
    }

    const badgeWrap = document.getElementById(`semProgBadge_${i}`);
    if (badgeWrap) {
      if (progCgpa !== null) {
        let badge = '';
        if (progCgpa >= 9.0) badge = '<span class="gpa-band-badge badge-band-outstanding">🚀 Outstanding</span>';
        else if (progCgpa >= 8.0) badge = '<span class="gpa-band-badge badge-band-excellent">⭐ First Class Dist.</span>';
        else if (progCgpa >= 7.0) badge = '<span class="gpa-band-badge badge-band-verygood">🔥 First Class</span>';
        else if (progCgpa >= 6.0) badge = '<span class="gpa-band-badge badge-band-good">👍 Second Class</span>';
        else badge = '<span class="gpa-band-badge badge-band-needs">⚠️ Needs Improvement</span>';
        badgeWrap.innerHTML = badge;
      } else {
        badgeWrap.innerHTML = '<span class="sem-status-badge pending">Pending</span>';
      }
    }
  }

  // Update Overall CGPA
  const overallCgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : null;
  const overallCgpaEl = document.getElementById('overallCgpaVal');
  if (overallCgpaEl) {
    overallCgpaEl.innerText = overallCgpa !== null ? overallCgpa.toFixed(2) : '—';
  }

  const overallCreditsEl = document.getElementById('overallCreditsOut');
  if (overallCreditsEl) {
    overallCreditsEl.innerText = `${cumulativeCredits} of 163 Credits Completed (${completedCount}/${TOTAL_SEMS} Semesters)`;
  }

  const degreeClassEl = document.getElementById('degreeClassVal');
  const completedLabelEl = document.getElementById('completedSemsOut');

  if (degreeClassEl && completedLabelEl) {
    if (overallCgpa !== null) {
      if (overallCgpa >= 9.0) {
        degreeClassEl.innerHTML = '<span style="color:#A7F3D0;">🚀 Outstanding</span>';
      } else if (overallCgpa >= 8.0) {
        degreeClassEl.innerHTML = '<span style="color:#BFDBFE;">⭐ First Class with Distinction</span>';
      } else if (overallCgpa >= 7.0) {
        degreeClassEl.innerHTML = '<span style="color:#FFFFFF;">🔥 First Class</span>';
      } else if (overallCgpa >= 6.0) {
        degreeClassEl.innerHTML = '<span style="color:#E2E8F0;">👍 Second Class</span>';
      } else {
        degreeClassEl.innerHTML = '<span style="color:#FECACA;">⚠️ Needs Improvement</span>';
      }
      completedLabelEl.innerText = `Calculated across ${completedCount} completed semester(s)`;
    } else {
      degreeClassEl.innerText = 'Pending Entry';
      completedLabelEl.innerText = 'Enter or calculate semester GPAs';
    }
  }

  // Update Summary
  const summaryEl = document.getElementById('gpaBottomSummary');
  if (summaryEl) {
    if (completedCount > 0) {
      summaryEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>✅ Calculated across <strong>${completedCount} of ${TOTAL_SEMS} Semester(s)</strong> (${cumulativeCredits} total credits)</span>
        </div>
        <div style="font-weight:800;color:#9C27B0;font-size:14px;">
          Overall Degree CGPA: ${overallCgpa !== null ? overallCgpa.toFixed(2) : '—'} / 10.0
        </div>
      `;
    } else {
      summaryEl.innerHTML = '<span>Calculate GPA at top or type directly in any semester box to compute cumulative CGPA</span>';
    }
  }
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
// SYNC ALL GPAS & CGPA TO STUDENT PROFILE
// ============================================================
async function syncGpaToStudentProfile() {
  if (typeof currentUser === 'undefined' || !currentUser || !currentToken) {
    alert('Please log in as a student to sync semester GPAs to your profile.');
    return;
  }

  let totalCredits = 0;
  let totalPoints = 0;
  const semGpas = {};

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const g = semGpaValues[i] !== null ? semGpaValues[i] : calcSemGpaFromSubjects(i);
    semGpas[`sem${i}_gpa`] = g !== null ? g.toFixed(2) : '';
    if (g !== null) {
      const cr = DEFAULT_SEM_CREDITS[i];
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