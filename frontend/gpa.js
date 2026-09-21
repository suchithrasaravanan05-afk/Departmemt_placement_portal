// ============================================================
// GPA.JS — Automatic Semester GPA to CGPA Calculator
// Regulation 2021 — Computer Science and Business Systems (CSBS)
// Clean & Fast: Small input box for each semester with instant auto-calculated CGPA
// ============================================================

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };
const TOTAL_SEMS = 8;

// Official CSBS Regulation 2021 Credits per semester
const DEFAULT_SEM_CREDITS = {
  1: 22,
  2: 26,
  3: 25,
  4: 24,
  5: 18,
  6: 24,
  7: 14,
  8: 10
};

// Semester GPA values entered by student
const semGpaValues = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null
};

// Custom semester credits (if user edits credit weight)
const semCreditValues = { ...DEFAULT_SEM_CREDITS };

// Auto-boot if on standalone gpa.html
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('gpaPage');
    if (root) {
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

  root.innerHTML = `
    <div class="gpa-container-grid">
      
      <!-- Left Column: Small Box Semester GPA & Automatic CGPA Engine -->
      <div>
        <div class="gpa-calculator-card">
          
          <!-- Header Bar -->
          <div class="gpa-calc-header">
            <div class="gpa-header-icon-box">
              <i class="fa-solid fa-calculator"></i>
            </div>
            <div class="gpa-header-text">
              <h3>Semester GPA to CGPA Calculator</h3>
              <p>Enter your GPA in the small box for each semester &bull; CGPA calculates automatically in real-time</p>
            </div>
          </div>

          <!-- Top Real-time Results Score Cards -->
          <div class="gpa-results-grid gpa-two-grid">
            <div class="gpa-score-card purple-card">
              <div class="gpa-score-label">OVERALL DEGREE CGPA</div>
              <div class="gpa-score-value" id="overallCgpaVal">—</div>
              <div class="gpa-score-out" id="overallTotalCreditsOut">0 of 163 Total Credits Completed</div>
            </div>
            <div class="gpa-score-card blue-card">
              <div class="gpa-score-label">DEGREE CLASSIFICATION</div>
              <div class="gpa-score-value" id="degreeClassVal" style="font-size:24px;margin:12px 0;">Pending Entry</div>
              <div class="gpa-score-out" id="completedSemsLabel">Enter semester GPAs below</div>
            </div>
          </div>

          <!-- 8 SMALL SEMESTER BOXES GRID -->
          <div class="gpa-sem-boxes-section">
            <div class="gpa-section-header">
              <div class="gpa-section-title">
                <i class="fa-solid fa-table-cells-large"></i> Enter Semester GPA (SGPA) for Each Semester
              </div>
              <span class="gpa-section-subtitle">Auto-calculates cumulative CGPA after each semester</span>
            </div>

            <div class="gpa-sem-cards-grid" id="semCardsGridArea">
              ${renderSemesterBoxesHtml()}
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="gpa-actions-bar">
            <button type="button" class="gpa-btn-action" onclick="fillSampleGpas()">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Try Sample GPAs
            </button>
            <button type="button" class="gpa-btn-action" onclick="clearAllSemGpas()">
              <i class="fa-solid fa-trash-can"></i> Clear All
            </button>
            ${allowProfileSync ? `
            <button type="button" class="gpa-btn-action gpa-btn-primary" onclick="syncGpaToStudentProfile()" style="margin-left:auto;">
              <i class="fa-solid fa-floppy-disk"></i> Sync All GPAs to Profile
            </button>` : ''}
          </div>

          <!-- Summary Bar -->
          <div class="gpa-bottom-summary" id="gpaBottomSummary">
            <span>Type any semester's GPA in the box above to immediately see the calculated CGPA</span>
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

        <!-- 3. How CGPA is Calculated -->
        <div class="gpa-sidebar-card">
          <div class="gpa-sidebar-header">
            <i class="fa-solid fa-circle-info"></i> How CGPA is Calculated
          </div>
          <div class="gpa-sidebar-body" style="font-size:12.5px;color:#4A3C59;line-height:1.6;">
            <p><strong>Cumulative CGPA Formula:</strong></p>
            <div class="gpa-formula-box">
              CGPA = Σ(Semester GPA × Credits) / Σ(Credits)
            </div>
            <p style="margin-top:8px;font-size:11.5px;color:#6E5D80;">
              Multiplies each semester's GPA by its credit weight (Sem 1: 22, Sem 2: 26, Sem 3: 25, Sem 4: 24, Sem 5: 18, Sem 6: 24, Sem 7: 14, Sem 8: 10).
            </p>
          </div>
        </div>

      </div>

    </div>
  `;

  updateAllCalculations();
}

// ============================================================
// RENDER 8 SEMESTER BOXES
// ============================================================
function renderSemesterBoxesHtml() {
  let html = '';

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const defaultCr = DEFAULT_SEM_CREDITS[i] || 20;
    const cr = semCreditValues[i] !== undefined ? semCreditValues[i] : defaultCr;
    const gpaVal = semGpaValues[i] !== null ? semGpaValues[i].toFixed(2) : '';

    html += `
      <div class="gpa-single-sem-box-card" id="semCard_${i}">
        
        <div class="sem-box-card-top">
          <div class="sem-box-title-tag">
            <span class="sem-box-name">Semester ${i}</span>
            <span class="sem-box-cr-badge">${cr} Credits</span>
          </div>
          <button type="button" class="btn-clear-single-sem" id="clearBtn_${i}" onclick="clearSingleSemGpa(${i})" title="Clear Sem ${i}" style="${semGpaValues[i] !== null ? '' : 'display:none;'}">
            &times;
          </button>
        </div>

        <div class="sem-box-input-wrap">
          <label for="semGpaInput_${i}">Semester ${i} GPA (SGPA):</label>
          <div class="sem-input-inner">
            <i class="fa-solid fa-graduation-cap sem-box-ico"></i>
            <input
              type="number"
              id="semGpaInput_${i}"
              class="sem-direct-gpa-input"
              min="0"
              max="10"
              step="0.01"
              placeholder="e.g. 8.50"
              value="${gpaVal}"
              oninput="handleDirectSemGpaChange(${i}, this.value)"
            >
          </div>
        </div>

        <div class="sem-box-auto-result" id="semAutoResult_${i}">
          <div class="sem-auto-cgpa-row">
            <span class="sem-auto-lbl">Cumulative CGPA up to Sem ${i}:</span>
            <strong class="sem-auto-cgpa-val" id="semProgCgpa_${i}">—</strong>
          </div>
          <div class="sem-auto-badge-wrap" id="semProgBadge_${i}">
            <span class="sem-status-badge pending">Pending GPA</span>
          </div>
        </div>

      </div>
    `;
  }

  return html;
}

// ============================================================
// INSTANT REAL-TIME INPUT HANDLER (AUTOMATIC CGPA CALCULATION)
// ============================================================
function handleDirectSemGpaChange(sem, val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 0 || num > 10) {
    semGpaValues[sem] = null;
  } else {
    semGpaValues[sem] = num;
  }

  // Toggle clear button
  const clearBtn = document.getElementById(`clearBtn_${sem}`);
  if (clearBtn) {
    clearBtn.style.display = semGpaValues[sem] !== null ? 'inline-block' : 'none';
  }

  updateAllCalculations();
}

function clearSingleSemGpa(sem) {
  semGpaValues[sem] = null;
  const input = document.getElementById(`semGpaInput_${sem}`);
  if (input) input.value = '';

  const clearBtn = document.getElementById(`clearBtn_${sem}`);
  if (clearBtn) clearBtn.style.display = 'none';

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
  updateAllCalculations();
}

// ============================================================
// RECALCULATE PROGRESSIVE & OVERALL CGPA
// ============================================================
function updateAllCalculations() {
  let cumulativeCredits = 0;
  let cumulativePoints = 0;
  let completedCount = 0;

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const gpa = semGpaValues[i];
    const cr = semCreditValues[i] || DEFAULT_SEM_CREDITS[i];
    const hasGpa = gpa !== null;

    if (hasGpa) {
      cumulativeCredits += cr;
      cumulativePoints += cr * gpa;
      completedCount++;
    }

    const progCgpa = (hasGpa && cumulativeCredits > 0) ? (cumulativePoints / cumulativeCredits) : null;

    // Update Card UI
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
        badgeWrap.innerHTML = '<span class="sem-status-badge pending">Pending GPA</span>';
      }
    }
  }

  // Update Top Score Cards
  const overallCgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : null;
  const overallCgpaEl = document.getElementById('overallCgpaVal');
  if (overallCgpaEl) {
    overallCgpaEl.innerText = overallCgpa !== null ? overallCgpa.toFixed(2) : '—';
  }

  const overallCreditsEl = document.getElementById('overallTotalCreditsOut');
  if (overallCreditsEl) {
    overallCreditsEl.innerText = `${cumulativeCredits} of 163 Credits Completed (${completedCount}/${TOTAL_SEMS} Semesters)`;
  }

  const degreeClassEl = document.getElementById('degreeClassVal');
  const completedLabelEl = document.getElementById('completedSemsLabel');

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
      completedLabelEl.innerText = 'Enter semester GPAs below';
    }
  }

  // Update Bottom Summary
  const summaryEl = document.getElementById('gpaBottomSummary');
  if (summaryEl) {
    if (completedCount > 0) {
      summaryEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>✅ Calculated for <strong>${completedCount} of ${TOTAL_SEMS} Semester(s)</strong> (${cumulativeCredits} total credits)</span>
        </div>
        <div style="font-weight:800;color:#9C27B0;font-size:14px;">
          Overall Degree CGPA: ${overallCgpa !== null ? overallCgpa.toFixed(2) : '—'} / 10.0
        </div>
      `;
    } else {
      summaryEl.innerHTML = '<span>Type any semester\'s GPA in the box above to immediately see the calculated CGPA</span>';
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

  let totalCredits = 0;
  let totalPoints = 0;
  const semGpas = {};

  for (let i = 1; i <= TOTAL_SEMS; i++) {
    const g = semGpaValues[i];
    semGpas[`sem${i}_gpa`] = g !== null ? g.toFixed(2) : '';
    if (g !== null) {
      const cr = semCreditValues[i] || DEFAULT_SEM_CREDITS[i];
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