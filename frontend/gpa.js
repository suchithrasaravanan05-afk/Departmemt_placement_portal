// ============================================================
// GPA.JS — Standalone GPA & CGPA Calculator
// Anna University Grade System
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS   = 8;

const gpaData = {}; // { semIndex: [ { name, credits, grade } ] }
let activeSem = 1;

const DEFAULT_SUBJECTS = [
  { name: 'Engineering Mathematics', credits: 4, grade: '' },
  { name: 'Programming Fundamentals', credits: 4, grade: '' },
  { name: 'Digital Electronics', credits: 3, grade: '' },
  { name: 'Business Communication', credits: 3, grade: '' },
  { name: 'Physics / Chemistry Lab', credits: 2, grade: '' },
  { name: 'Programming Lab', credits: 2, grade: '' }
];

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    gpaData[i] = DEFAULT_SUBJECTS.map(s => ({ ...s }));
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
  renderSubjectsTable();
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
            <td style="padding:10px 12px;color:#0f172a;">${subjects.reduce((a, s) => a + (parseInt(s.credits) || 0), 0)}</td>
            <td colspan="2"></td>
            <td style="padding:10px 12px;color:#2563eb;font-weight:800;">${
              subjects.reduce((a, s) => {
                const gp = GRADE_POINTS[s.grade];
                return gp !== undefined ? a + (parseInt(s.credits) || 0) * gp : a;
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

  const gp  = GRADE_POINTS[s.grade] !== undefined ? GRADE_POINTS[s.grade] : '—';
  const cpg = GRADE_POINTS[s.grade] !== undefined
    ? ((parseInt(s.credits) || 0) * GRADE_POINTS[s.grade]).toFixed(1)
    : '—';

  return `
  <tr>
    <td style="color:#94a3b8;font-size:12px;">${idx + 1}</td>
    <td>
      <input
        type="text"
        class="grade-select"
        style="padding:7px 10px;min-width:160px;"
        value="${s.name}"
        placeholder="Subject name (optional)"
        onchange="updateField(${idx}, 'name', this.value)">
    </td>
    <td>
      <input
        type="number"
        class="grade-select"
        style="padding:7px 10px;width:65px;"
        min="1" max="6"
        value="${s.credits}"
        onchange="updateField(${idx}, 'credits', parseInt(this.value) || 1)">
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
  gpaData[activeSem] = DEFAULT_SUBJECTS.map(s => ({ ...s }));
  renderSubjectsTable();
  renderSemTabs();
  updateResults();
}

function resetAll() {
  if (!confirm('Reset all semester data? This cannot be undone.')) return;
  for (let i = 1; i <= TOTAL_SEMS; i++) {
    gpaData[i] = DEFAULT_SUBJECTS.map(s => ({ ...s }));
  }
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
      tc += parseInt(s.credits) || 0;
      tp += (parseInt(s.credits) || 0) * GRADE_POINTS[s.grade];
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
        tc += parseInt(s.credits) || 0;
        tp += (parseInt(s.credits) || 0) * GRADE_POINTS[s.grade];
      }
    });
    if (tc > 0) {
      allCredits += tc;
      allPoints  += tp;
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
