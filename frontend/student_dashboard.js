// ============================================================
// STUDENT DASHBOARD JS — RIT CSBS Placement Portal
// ============================================================

const API_BASE = `${window.location.origin}/api`;

let currentUser    = null;
let currentToken   = null;
let currentProfile = null;
let isNewUser      = false;

// GPA Calculator state
const GPA_SEMS = 8;
const gpaData = {};   // { semIndex: [{name, credits, grade}] }
let activeSem = 1;

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  currentToken = localStorage.getItem('token');
  currentUser  = safeParseUser();

  if (!currentToken || !currentUser || currentUser.role !== 'student') {
    window.location.href = 'Form.html';
    return;
  }

  // Populate nav header
  const name = currentUser.full_name || 'Student';
  const reg  = currentUser.register_number || 'N/A';
  const initial = name.charAt(0).toUpperCase();

  document.getElementById('displayUserName').innerText = name;
  document.getElementById('displayUserReg').innerText  = `Reg: ${reg}`;
  document.getElementById('navAvatarInitial').innerText = initial;

  // Pre-fill hidden fields
  el('regNumberInput').value = reg;
  el('stdNameInput').value   = name;
  el('collegeEmailInput').value = currentUser.email || '';

  // Set year from user if available
  if (currentUser.year) {
    const yr = el('yearSelect');
    if (yr) yr.value = String(currentUser.year);
  }

  // GPA field dependencies
  handleYearChange();

  // Init GPA calc sems
  initGpaCalcSems();

  // Load data & start live sync
  loadStudentProfile().finally(() => {
    loadPlacementDrives(false);
    startDrivesAutoSync();
  });
});

// ============================================================
// HELPERS
// ============================================================
function el(id) { return document.getElementById(id); }

function safeParseUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'Form.html';
}

function fmtDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function safe(val, fallback = '--') {
  return (val !== null && val !== undefined && val !== '') ? val : fallback;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// ALERT
// ============================================================
function showStudentAlert(message, isSuccess = false) {
  const box = el('studentAlert');
  if (!box) return;
  const icon = isSuccess ? 'fa-circle-check' : 'fa-circle-xmark';
  box.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  box.style.cssText = isSuccess
    ? 'background:#ecfdf5;color:#065f46;border:1.5px solid #6ee7b7;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;'
    : 'background:#fef2f2;color:#991b1b;border:1.5px solid #fca5a5;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;';
  box.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => box.classList.add('hidden'), 7000);
}

// ============================================================
// TAB NAVIGATION
// ============================================================
const TABS = ['profile', 'drives', 'applications', 'gpa', 'resources'];

function switchTab(tabName) {
  TABS.forEach(t => {
    const tabEl = el(`tab${capitalize(t)}`);
    const btnEl = el(`tabBtn${capitalize(t)}`);
    if (tabEl) tabEl.classList.toggle('hidden', t !== tabName);
    if (btnEl) btnEl.classList.toggle('active', t === tabName);
  });

  if (tabName === 'drives')       loadPlacementDrives();
  if (tabName === 'applications') loadAppliedDrivesTable();
  if (tabName === 'gpa' && typeof renderSemesterGpaApp === 'function') {
    renderSemesterGpaApp('gpaDashboardContainer', true);
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================
// PROFILE VIEW / EDIT MODES
// ============================================================
function enterEditMode() {
  el('profileViewMode').classList.add('hidden');
  el('profileEditMode').classList.remove('hidden');

  const cancelBtn  = el('cancelEditBtn');
  const cancelBtn2 = el('cancelEditBtn2');
  [cancelBtn, cancelBtn2].forEach(btn => {
    if (btn) btn.classList.toggle('hidden', isNewUser);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitEditMode() {
  if (isNewUser) return;
  el('profileEditMode').classList.add('hidden');
  el('profileViewMode').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// YEAR → GPA FIELDS ENABLE/DISABLE
// ============================================================
function handleYearChange() {
  const yearEl = el('yearSelect');
  const rawYear = yearEl?.value || '3';
  const year   = parseInt(rawYear);
  const enabled = (year === 5 || rawYear === '5') ? 8 : (year * 2);

  for (let i = 1; i <= 8; i++) {
    const field = el(`sem${i}Gpa`);
    if (!field) continue;
    if (i <= enabled) {
      field.disabled = false;
      field.parentElement.style.opacity = '1';
    } else {
      field.disabled = true;
      field.value    = '';
      field.parentElement.style.opacity = '0.45';
    }
  }
  calculateCGPA();
}

// ============================================================
// CGPA AUTO CALCULATION
// ============================================================
function calculateCGPA() {
  let total = 0, count = 0;
  for (let i = 1; i <= 8; i++) {
    const f = el(`sem${i}Gpa`);
    if (f && !f.disabled && f.value !== '') {
      const v = parseFloat(f.value);
      if (!isNaN(v) && v >= 0 && v <= 10) { total += v; count++; }
    }
  }
  const cgpaEl = el('calculatedCgpa');
  if (cgpaEl) cgpaEl.value = count > 0 ? (total / count).toFixed(2) : '';
}

// ============================================================
// ARREAR TOGGLES
// ============================================================
function toggleArrearCounts() {
  const hv = el('historyArrearsSelect')?.value;
  const sv = el('standingArrearsSelect')?.value;
  el('grpHistoryCount')?.classList.toggle('hidden', hv !== 'yes');
  el('grpStandingCount')?.classList.toggle('hidden', sv !== 'yes');
}

// ============================================================
// LOAD STUDENT PROFILE FROM API
// ============================================================
async function loadStudentProfile() {
  const loadingEl     = el('profileLoading');
  const viewContentEl = el('profileViewContent');
  const noProfileEl   = el('noProfileState');

  loadingEl?.classList.remove('hidden');
  viewContentEl?.classList.add('hidden');
  noProfileEl?.classList.add('hidden');

  try {
    const res  = await fetch(`${API_BASE}/student/profile/${currentUser.id}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();

    loadingEl?.classList.add('hidden');

    if (data.success && data.profile) {
      currentProfile = data.profile;
      isNewUser      = false;
      populateViewMode(data.profile);
      populateEditForm(data.profile);
      viewContentEl?.classList.remove('hidden');
      el('profileEditMode')?.classList.add('hidden');
      el('profileViewMode')?.classList.remove('hidden');

      if (cachedStudentDrives && cachedStudentDrives.length > 0) {
        renderDriveNotifications(cachedStudentDrives);
        renderDrivesWithFilter();
      }
    } else {
      isNewUser = true;
      noProfileEl?.classList.remove('hidden');
      setTimeout(enterEditMode, 400);
    }
  } catch (err) {
    console.error('Load profile error:', err);
    loadingEl?.classList.add('hidden');
    isNewUser = true;
    noProfileEl?.classList.remove('hidden');
  }
}

// ============================================================
// POPULATE VIEW MODE
// ============================================================
function populateViewMode(p) {
  const set = (id, val, fallback = '--') => {
    const e = el(id);
    if (e) e.innerText = (val !== null && val !== undefined && val !== '') ? val : fallback;
  };

  set('viewName', p.full_name || currentUser.full_name);
  set('viewReg',  `Register No: ${p.register_number || currentUser.register_number || 'N/A'}`);

  // CGPA
  const cgpa = parseFloat(p.cgpa || 0);
  el('viewCgpaNum').innerText = cgpa > 0 ? cgpa.toFixed(2) : '--';

  // Profile photo
  const avatarEl = el('viewAvatar');
  const navAvEl  = el('navAvatar');

  if (p.profile_photo) {
    avatarEl.innerHTML = `<img src="${p.profile_photo}" alt="Profile Photo">`;
    navAvEl.innerHTML  = `<img src="${p.profile_photo}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.innerHTML = `<i class="fa-solid fa-user"></i>`;
  }

  // Social links
  const linksEl = el('viewLinks');
  if (linksEl) {
    linksEl.innerHTML = '';
    if (p.linkedin_link) {
      linksEl.innerHTML += `<a href="${p.linkedin_link}" target="_blank" class="profile-link linkedin"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`;
    }
    if (p.github_link) {
      linksEl.innerHTML += `<a href="${p.github_link}" target="_blank" class="profile-link github"><i class="fa-brands fa-github"></i> GitHub</a>`;
    }
  }

  // Personal
  set('viewDob',          fmtDate(p.dob));
  set('viewYear',         (p.year == 5 || String(p.year).toLowerCase().includes('passed')) ? 'Passed Out' : (p.year ? `${p.year}${['','st','nd','rd','th'][p.year]} Year` : '--'));
  set('viewPersonalEmail', p.personal_email);
  set('viewCollegeEmail',  p.college_email || p.email);
  set('viewPhone',         p.phone_number || p.phone);
  set('viewWhatsapp',      p.whatsapp_number);
  set('viewDomain',        p.domain_interest);

  // Academic
  set('viewTenth',  p.tenth_percentage  ? `${parseFloat(p.tenth_percentage).toFixed(1)}%` : '--');
  set('viewTwelth', p.twelth_percentage ? `${parseFloat(p.twelth_percentage).toFixed(1)}%` : '--');
  set('viewDiploma', p.diploma_percentage ? `${parseFloat(p.diploma_percentage).toFixed(1)}%` : '--');
  set('viewDegree',  p.degree || 'B.Tech');

  // GPA Grid
  const gpaGrid = el('viewGpaGrid');
  if (gpaGrid) {
    gpaGrid.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
      const val = p[`sem${i}_gpa`];
      if (val && parseFloat(val) > 0) {
        gpaGrid.innerHTML += `
          <div class="gpa-chip">
            <div class="gpa-chip-label">Sem ${i}</div>
            <div class="gpa-chip-val">${parseFloat(val).toFixed(2)}</div>
          </div>`;
      }
    }
    if (!gpaGrid.innerHTML) gpaGrid.innerHTML = '<p style="color:#94a3b8;font-size:13px;">No GPA data entered.</p>';
  }

  // Arrears
  set('viewHistoryArrears', p.history_of_arrears === 'yes' ? '⚠️ Yes' : '✅ No');
  set('viewHistoryCount',   p.history_of_arrears === 'yes' ? (p.history_arrears_count || 0) : 'N/A');
  set('viewStandingArrears', p.standing_of_arrears === 'yes' ? '⚠️ Yes' : '✅ No');
  set('viewStandingCount',   p.standing_of_arrears === 'yes' ? (p.standing_arrears_count || 0) : 'N/A');

function getFullFileUrl(pathStr) {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${window.location.origin}${cleanPath}`;
}

  // Docs
  const docLinksEl = el('viewDocLinks');
  if (docLinksEl) {
    docLinksEl.innerHTML = '';
    if (p.resume_file) {
      const url = getFullFileUrl(p.resume_file);
      docLinksEl.innerHTML += `<a href="${url}" target="_blank" download class="profile-link"><i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i> View / Download Resume</a>`;
    } else {
      docLinksEl.innerHTML = '<span style="font-size:13px;color:#94a3b8;">No resume uploaded yet.</span>';
    }
  }
}

// ============================================================
// POPULATE EDIT FORM
// ============================================================
function populateEditForm(p) {
  const v = (id, val) => { const e = el(id); if (e && val !== null && val !== undefined) e.value = val; };

  v('dobInput',           p.dob || '');
  v('yearSelect',         p.year || currentUser.year || '3');
  v('domainSelect',       p.domain_interest || '');
  v('personalEmailInput', p.personal_email || '');
  v('collegeEmailInput',  p.college_email || currentUser.email || '');
  v('phoneInput',         p.phone_number || currentUser.phone || '');
  v('whatsappInput',      p.whatsapp_number || '');
  v('tenthInput',         p.tenth_percentage || '');
  v('twelthInput',        p.twelth_percentage || '');
  v('diplomaInput',       p.diploma_percentage || '');
  v('degreeInput',        p.degree || 'B.Tech');
  v('deptInput',          p.department || 'Computer Science and Business Systems');

  for (let i = 1; i <= 8; i++) v(`sem${i}Gpa`, p[`sem${i}_gpa`] || '');
  calculateCGPA();

  v('historyArrearsSelect', p.history_of_arrears || 'no');
  v('standingArrearsSelect', p.standing_of_arrears || 'no');
  v('historyCountInput',    p.history_arrears_count || '');
  v('standingCountInput',   p.standing_arrears_count || '');
  toggleArrearCounts();

  v('linkedinInput', p.linkedin_link || '');
  v('githubInput',   p.github_link   || '');

  // Existing photo/resume
  if (p.profile_photo) {
    el('existingPhotoUrl').value  = p.profile_photo;
    el('existingPhotoInfo').innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Photo uploaded — upload new to replace`;
  }
  if (p.resume_file) {
    el('existingResumeUrl').value = p.resume_file;
    const url = getFullFileUrl(p.resume_file);
    el('existingResumeInfo').innerHTML = `<a href="${url}" target="_blank" download style="color:#2563eb;font-weight:600;"><i class="fa-solid fa-file-pdf"></i> View current resume</a> — upload new to replace`;
  }

  handleYearChange();
}

// ============================================================
// SAVE STUDENT PROFILE
// ============================================================
async function saveStudentProfile(e) {
  e.preventDefault();

  const saveBtn = el('saveProfileBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

  const formData = new FormData();
  formData.append('user_id',           currentUser.id);
  formData.append('dob',               el('dobInput')?.value || '');
  formData.append('personal_email',    el('personalEmailInput')?.value || '');
  formData.append('college_email',     el('collegeEmailInput')?.value || '');
  formData.append('domain_interest',   el('domainSelect')?.value || '');
  formData.append('tenth_percentage',  el('tenthInput')?.value || '');
  formData.append('twelth_percentage', el('twelthInput')?.value || '');
  formData.append('diploma_percentage',el('diplomaInput')?.value || '');
  formData.append('degree',            el('degreeInput')?.value || 'B.Tech');
  formData.append('department',        el('deptInput')?.value || 'CSBS');
  formData.append('phone_number',      el('phoneInput')?.value || '');
  formData.append('whatsapp_number',   el('whatsappInput')?.value || '');
  formData.append('history_of_arrears',  el('historyArrearsSelect')?.value || 'no');
  formData.append('history_arrears_count', el('historyCountInput')?.value || 0);
  formData.append('standing_of_arrears',  el('standingArrearsSelect')?.value || 'no');
  formData.append('standing_arrears_count', el('standingCountInput')?.value || 0);
  formData.append('linkedin_link',     el('linkedinInput')?.value || '');
  formData.append('github_link',       el('githubInput')?.value || '');
  formData.append('existing_profile_photo', el('existingPhotoUrl')?.value || '');
  formData.append('existing_resume_file',   el('existingResumeUrl')?.value || '');

  for (let i = 1; i <= 8; i++) {
    formData.append(`sem${i}_gpa`, el(`sem${i}Gpa`)?.value || '');
  }

  const photoFile  = el('profilePhotoInput')?.files[0];
  const resumeFile = el('resumeFileInput')?.files[0];
  if (photoFile)  formData.append('profile_photo', photoFile);
  if (resumeFile) formData.append('resume_file',   resumeFile);

  try {
    const res  = await fetch(`${API_BASE}/student/profile/save`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${currentToken}` },
      body:    formData
    });
    const data = await res.json();

    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile'; }

    if (data.success) {
      showStudentAlert('✅ Profile saved successfully!', true);
      isNewUser = false;
      await loadStudentProfile();
      exitEditMode();
    } else {
      showStudentAlert(data.message || 'Failed to save profile.');
    }
  } catch (err) {
    console.error('Save profile error:', err);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile'; }
    showStudentAlert('Server error while saving profile. Please try again.');
  }
}

// ============================================================
// PLACEMENT DRIVES STATE & ELIGIBILITY
// ============================================================
let currentDriveFilter = 'eligible'; // Default view: Eligible Drives
let cachedStudentDrives = [];
let previousDriveIds = new Set();
let autoSyncTimer = null;
let isInitialDrivesLoad = true;

/**
 * Evaluates whether a student meets the criteria for a given placement drive.
 */
function evaluateDriveEligibility(d, profile) {
  const studentCgpa = parseFloat(profile?.cgpa || 0);
  const minCgpa = parseFloat(d.min_cgpa || 0);
  const standingArr = parseInt(profile?.standing_arrears_count || 0);
  const maxArrears = parseInt(d.max_standing_arrears || 0);
  const isExpired = !!(d.deadline && new Date(d.deadline) < new Date());

  const reasons = [];
  let isEligible = true;

  // If student profile is missing or has no CGPA yet
  if (!profile || isNaN(studentCgpa) || studentCgpa <= 0) {
    return {
      isEligible: false,
      reasons: ['Complete your student profile with CGPA to check eligibility'],
      isExpired,
      studentCgpa,
      standingArr
    };
  }

  // Check CGPA
  if (studentCgpa < minCgpa) {
    isEligible = false;
    reasons.push(`Min CGPA required: ${minCgpa.toFixed(1)} (Your CGPA: ${studentCgpa.toFixed(2)})`);
  }

  // Check Standing Arrears
  if (standingArr > maxArrears) {
    isEligible = false;
    reasons.push(`Max Standing Arrears allowed: ${maxArrears} (Your Arrears: ${standingArr})`);
  }

  // Check Academic Year if restricted by company
  if (d.eligible_years && profile?.year) {
    const rawYears = String(d.eligible_years).split(',').map(y => y.trim().toLowerCase());
    const studentYearStr = String(profile.year).toLowerCase();
    const matchesYear = rawYears.some(yr => {
      return yr === studentYearStr ||
             yr.includes(`${studentYearStr}st`) ||
             yr.includes(`${studentYearStr}nd`) ||
             yr.includes(`${studentYearStr}rd`) ||
             yr.includes(`${studentYearStr}th`);
    });

    if (!matchesYear && rawYears.length > 0) {
      isEligible = false;
      reasons.push(`Open only for Year(s): ${d.eligible_years} (You are in Year ${profile.year})`);
    }
  }

  return {
    isEligible,
    reasons,
    isExpired,
    studentCgpa,
    standingArr
  };
}

// ============================================================
// LOAD PLACEMENT DRIVES (WITH LIVE SILENT SYNC)
// ============================================================
async function loadPlacementDrives(silent = false) {
  const container = el('drivesContainer');
  if (!container) return;

  if (!silent) {
    container.innerHTML = `
      <div class="spinner-box">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#94a3b8;"></i>
        <p>Loading placement drives...</p>
      </div>`;
  }

  try {
    const res = await fetch(`${API_BASE}/student/drives/${currentUser.id}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.drives) {
      if (!silent) {
        renderDriveNotifications([]);
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-briefcase" style="color:#94a3b8;"></i>
            <p>No placement drives available right now.</p>
            <p style="font-size:12px;margin-top:4px;">Check back later or contact the placement cell.</p>
          </div>`;
      }
      return;
    }

    const newDrives = data.drives || [];

    // Detect newly uploaded drives during live browsing (after initial load)
    if (!isInitialDrivesLoad && previousDriveIds.size > 0) {
      newDrives.forEach(drive => {
        if (!previousDriveIds.has(drive.id)) {
          showDriveLiveToast(drive);
        }
      });
    }

    // Update tracked drive IDs
    previousDriveIds = new Set(newDrives.map(d => d.id));
    cachedStudentDrives = newDrives;
    isInitialDrivesLoad = false;

    // Render Notifications & Drives List with Filter
    renderDriveNotifications(cachedStudentDrives);
    renderDrivesWithFilter();

    // Update Live Indicator status text
    const liveInd = el('drivesLiveIndicator');
    if (liveInd) {
      liveInd.title = `Last synced: ${new Date().toLocaleTimeString('en-IN')}`;
    }
  } catch (err) {
    console.error('Load drives error:', err);
    if (!silent) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>
          <p>Failed to load drives. Check network and try again.</p>
        </div>`;
    }
  }
}

// ============================================================
// RENDER DRIVES WITH DROPDOWN FILTER (ELIGIBLE FIRST)
// ============================================================
function renderDrivesWithFilter() {
  const container = el('drivesContainer');
  const selectEl = el('driveFilterSelect');
  if (!container) return;

  const drives = cachedStudentDrives || [];
  if (drives.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-briefcase" style="color:#94a3b8;"></i>
        <p>No active placement drives found.</p>
        <p style="font-size:12px;margin-top:4px;">Check back later or contact the CSBS placement cell.</p>
      </div>`;
    if (selectEl) {
      selectEl.innerHTML = `
        <option value="eligible" selected>🎯 Eligible Drives (0)</option>
        <option value="not_eligible">⚠️ Not Eligible Drives (0)</option>
        <option value="all">📋 All Placement Drives (0)</option>
        <option value="applied">✅ Applied Drives (0)</option>
      `;
    }
    return;
  }

  // Pre-evaluate eligibility for all drives
  const evaluatedDrives = drives.map(d => ({
    drive: d,
    evalRes: evaluateDriveEligibility(d, currentProfile)
  }));

  const eligibleList     = evaluatedDrives.filter(item => item.evalRes.isEligible);
  const notEligibleList  = evaluatedDrives.filter(item => !item.evalRes.isEligible);
  const appliedList      = evaluatedDrives.filter(item => !!item.drive.app_status);
  const allList          = evaluatedDrives;

  // Update Dropdown Filter Select Options with Live Counters
  if (selectEl) {
    selectEl.innerHTML = `
      <option value="eligible" ${currentDriveFilter === 'eligible' ? 'selected' : ''}>🎯 Eligible Drives (${eligibleList.length})</option>
      <option value="not_eligible" ${currentDriveFilter === 'not_eligible' ? 'selected' : ''}>⚠️ Not Eligible Drives (${notEligibleList.length})</option>
      <option value="all" ${currentDriveFilter === 'all' ? 'selected' : ''}>📋 All Placement Drives (${allList.length})</option>
      <option value="applied" ${currentDriveFilter === 'applied' ? 'selected' : ''}>✅ Applied Drives (${appliedList.length})</option>
    `;
    selectEl.value = currentDriveFilter;
  }

  // Determine current active list based on dropdown selection
  let displayList = [];
  let filterTitle = '';
  let emptyMessage = '';
  let emptySubtext = '';
  let emptyActionBtn = '';

  if (currentDriveFilter === 'eligible') {
    displayList = eligibleList;
    filterTitle = `Eligible Placement Drives (${eligibleList.length})`;
    emptyMessage = 'No eligible placement drives matching your profile at the moment.';
    const stdCgpa = parseFloat(currentProfile?.cgpa || 0).toFixed(2);
    const stdArr  = currentProfile?.standing_arrears_count || 0;
    emptySubtext = `Your Current Profile — CGPA: <strong>${stdCgpa}</strong>, Standing Arrears: <strong>${stdArr}</strong>.`;
    emptyActionBtn = notEligibleList.length > 0
      ? `<button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="handleDriveFilterChange('not_eligible')">
          <i class="fa-solid fa-eye"></i> View Other Drives (${notEligibleList.length})
         </button>`
      : '';
  } else if (currentDriveFilter === 'not_eligible') {
    displayList = notEligibleList;
    filterTitle = `Not Eligible Placement Drives (${notEligibleList.length})`;
    emptyMessage = 'Great news! You have zero ineligible drives.';
    emptySubtext = 'You meet the eligibility criteria for all active drives posted.';
    emptyActionBtn = `<button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="handleDriveFilterChange('eligible')">
        <i class="fa-solid fa-check"></i> View Eligible Drives (${eligibleList.length})
      </button>`;
  } else if (currentDriveFilter === 'applied') {
    displayList = appliedList;
    filterTitle = `Applied Placement Drives (${appliedList.length})`;
    emptyMessage = 'You haven’t applied for any placement drives yet.';
    emptySubtext = 'Check out the eligible drives and submit your application.';
    emptyActionBtn = `<button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="handleDriveFilterChange('eligible')">
        <i class="fa-solid fa-briefcase"></i> View Eligible Drives (${eligibleList.length})
      </button>`;
  } else {
    displayList = allList;
    filterTitle = `All Placement Drives (${allList.length})`;
    emptyMessage = 'No placement drives found.';
    emptySubtext = 'Check back later for new drive announcements.';
  }

  // Render Empty State if no drives match the chosen filter
  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:48px 24px;">
        <i class="fa-solid fa-filter-circle-xmark" style="font-size:36px;color:#94a3b8;margin-bottom:12px;"></i>
        <p style="font-size:15px;font-weight:700;color:#334155;">${emptyMessage}</p>
        <p style="font-size:13px;color:#64748b;margin-top:6px;">${emptySubtext}</p>
        ${emptyActionBtn}
      </div>`;
    return;
  }

  // Render Grid of Drive Cards
  container.innerHTML = `
    <div class="drives-grid">
      ${displayList.map(item => buildDriveCard(item.drive, item.evalRes)).join('')}
    </div>`;
}

/**
 * Handles dropdown filter change from the UI.
 */
function handleDriveFilterChange(newFilter) {
  currentDriveFilter = newFilter || 'eligible';
  renderDrivesWithFilter();
}

/**
 * Builds the HTML markup for a single placement drive card.
 */
function buildDriveCard(d, evalRes) {
  const minCgpa       = parseFloat(d.min_cgpa || 0);
  const maxArrears    = parseInt(d.max_standing_arrears || 0);
  const isEligible    = evalRes.isEligible;
  const isExpired     = evalRes.isExpired;
  const alreadyApplied = !!d.app_status;

  let statusClass = '';
  let eligibilityBadge = '';

  if (alreadyApplied) {
    statusClass = 'applied';
    eligibilityBadge = `<span class="status-pill status-${(d.app_status || 'applied').toLowerCase().replace(/\s+/g, '-')}">
      <i class="fa-solid fa-circle-check"></i> ${escapeHtml(d.app_status)}
    </span>`;
  } else if (!isEligible) {
    statusClass = 'not-eligible';
    eligibilityBadge = `<span class="badge badge-red"><i class="fa-solid fa-xmark"></i> Not Eligible</span>`;
  } else {
    eligibilityBadge = `<span class="badge badge-green"><i class="fa-solid fa-check"></i> Eligible</span>`;
  }

  const deadlineStr = d.deadline ? fmtDate(d.deadline) : 'Open';

  // Ineligible reason message banner
  let ineligibleBanner = '';
  if (!isEligible && !alreadyApplied && evalRes.reasons.length > 0) {
    ineligibleBanner = `
      <div class="drive-ineligible-banner">
        <i class="fa-solid fa-triangle-exclamation" style="margin-top:2px;flex-shrink:0;"></i>
        <div>
          <strong>Reason:</strong> ${evalRes.reasons.map(r => escapeHtml(r)).join('; ')}
        </div>
      </div>`;
  }

  return `
  <div class="drive-card ${statusClass}" data-drive-id="${d.id}">
    <div>
      <div class="drive-company">${escapeHtml(d.company_name)}</div>
      <div class="drive-role" style="margin-top:3px;">${escapeHtml(d.job_role)}</div>
    </div>

    <div class="drive-meta">
      <span class="badge badge-blue"><i class="fa-solid fa-indian-rupee-sign"></i> ${escapeHtml(d.package_ctc)}</span>
      <span class="badge badge-gray"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(d.job_location || 'Flexible')}</span>
      <span class="badge ${isExpired ? 'badge-red' : 'badge-yellow'}">
        <i class="fa-solid fa-calendar-days"></i> ${isExpired ? 'Closed' : 'Deadline: ' + deadlineStr}
      </span>
    </div>

    <div style="font-size:12px;color:#64748b;line-height:1.5;margin-top:4px;">
      <span><strong>Min CGPA:</strong> ${minCgpa.toFixed(1)} &nbsp;|&nbsp;</span>
      <span><strong>Max Arrears:</strong> ${maxArrears}</span>
      ${d.eligible_years ? `&nbsp;|&nbsp;<span><strong>Years:</strong> ${escapeHtml(d.eligible_years)}</span>` : ''}
    </div>

    ${ineligibleBanner}

    ${d.description ? `<p style="font-size:12px;color:#64748b;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:10px;margin-top:8px;">${escapeHtml(d.description.slice(0, 130))}${d.description.length > 130 ? '…' : ''}</p>` : ''}

    <div class="drive-actions" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #f8fafc;">
      ${eligibilityBadge}
      ${alreadyApplied
        ? `<span class="badge badge-gray" style="font-size:11px;"><i class="fa-solid fa-circle-check"></i> Applied ${fmtDate(d.applied_at)}</span>`
        : isExpired
          ? `<span class="badge badge-red"><i class="fa-solid fa-lock"></i> Drive Closed</span>`
          : isEligible
            ? `<button class="btn btn-primary btn-sm" onclick="applyForDrive(${d.id}, '${escapeHtml(d.company_name).replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-paper-plane"></i> Apply Now
               </button>`
            : `<button class="btn btn-outline btn-sm" disabled style="opacity:.55;cursor:not-allowed;" title="You do not meet company eligibility criteria">
                <i class="fa-solid fa-ban"></i> Not Eligible
               </button>`
      }
    </div>
  </div>`;
}

// ============================================================
// APPLY FOR DRIVE
// ============================================================
async function applyForDrive(driveId, companyName) {
  if (!confirm(`Apply for the placement drive at ${companyName}?`)) return;

  if (!currentProfile || !currentProfile.cgpa) {
    showStudentAlert('Please complete your profile before applying for drives.');
    switchTab('profile');
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/student/drives/apply`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentToken}`
      },
      body: JSON.stringify({ drive_id: driveId, user_id: currentUser.id })
    });
    const data = await res.json();

    if (data.success) {
      showStudentAlert(`✅ Application submitted for ${companyName}!`, true);
      loadPlacementDrives();
    } else {
      showStudentAlert(data.message || 'Failed to apply. Please try again.');
    }
  } catch (err) {
    console.error('Apply error:', err);
    showStudentAlert('Server error. Please try again.');
  }
}

// ============================================================
// LOAD APPLIED DRIVES
// ============================================================
async function loadAppliedDrivesTable() {
  const tbody = el('applicationsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res  = await fetch(`${API_BASE}/student/drives/${currentUser.id}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();

    const applied = (data.drives || []).filter(d => d.app_status);

    if (applied.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="text-center" style="padding:40px;">
          <i class="fa-solid fa-folder-open" style="font-size:28px;color:#94a3b8;display:block;margin-bottom:8px;"></i>
          <span style="color:#64748b;font-weight:600;">No applications yet. Go to Placement Drives to apply.</span>
        </td></tr>`;
      return;
    }

    const statusMap = {
      'Applied':     'status-applied',
      'Shortlisted': 'status-shortlisted',
      'Selected':    'status-selected',
      'Rejected':    'status-rejected'
    };

    tbody.innerHTML = applied.map(d => `
      <tr>
        <td><strong>${d.company_name}</strong></td>
        <td>${d.job_role}</td>
        <td><span class="badge badge-blue">${d.package_ctc}</span></td>
        <td>${fmtDate(d.applied_at)}</td>
        <td><span class="status-pill ${statusMap[d.app_status] || 'status-applied'}">${d.app_status}</span></td>
      </tr>`).join('');
  } catch (err) {
    console.error('Load applications error:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:30px;color:#ef4444;">Error loading applications.</td></tr>`;
  }
}

// ============================================================
// GPA CALCULATOR
// ============================================================
const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, RA: 0 };

function initGpaCalcSems() {
  const tabsEl = el('semTabs');
  if (!tabsEl) return;

  tabsEl.innerHTML = '';
  for (let i = 1; i <= GPA_SEMS; i++) {
    tabsEl.innerHTML += `
      <button class="sem-tab-btn ${i === 1 ? 'active' : ''}" id="semTabBtn${i}" onclick="switchGpaSem(${i})">
        Sem ${i}
      </button>`;
    gpaData[i] = defaultSubjects(i);
  }

  renderSubjectsTable();
  renderCgpaSummary();
}

function defaultSubjects(sem) {
  // 6 subjects by default
  return [
    { name: '', credits: 4, grade: '' },
    { name: '', credits: 4, grade: '' },
    { name: '', credits: 3, grade: '' },
    { name: '', credits: 3, grade: '' },
    { name: '', credits: 2, grade: '' },
    { name: '', credits: 2, grade: '' }
  ];
}

function switchGpaSem(sem) {
  activeSem = sem;
  document.querySelectorAll('.sem-tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i + 1) === sem);
  });
  renderSubjectsTable();
}

function renderSubjectsTable() {
  const wrap = el('subjectsTableWrap');
  if (!wrap) return;

  const subjects = gpaData[activeSem] || [];
  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="subjects-table" id="subjectTbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Subject Name</th>
            <th>Credits</th>
            <th>Grade</th>
            <th>Grade Point</th>
            <th>Credit × GP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((s, idx) => buildSubjectRow(s, idx)).join('')}
        </tbody>
      </table>
    </div>`;

  updateGpaCalcResult();
}

function buildSubjectRow(s, idx) {
  const gradeOptions = Object.keys(GRADE_POINTS).map(g =>
    `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  const gp = GRADE_POINTS[s.grade] ?? '';
  const cpg = (s.grade && GRADE_POINTS[s.grade] !== undefined) ? (s.credits * GRADE_POINTS[s.grade]).toFixed(1) : '';

  return `
    <tr id="subRow${idx}">
      <td style="color:#94a3b8;">${idx + 1}</td>
      <td>
        <input type="text" class="grade-select" style="padding:7px 10px;"
          value="${s.name}"
          placeholder="e.g. Engineering Maths"
          onchange="updateSubjectField(${idx}, 'name', this.value)">
      </td>
      <td>
        <input type="number" class="grade-select" style="padding:7px 10px;width:70px;" min="1" max="6"
          value="${s.credits}"
          onchange="updateSubjectField(${idx}, 'credits', parseInt(this.value)||1)">
      </td>
      <td>
        <select class="grade-select" onchange="updateSubjectField(${idx}, 'grade', this.value)">
          <option value="">—</option>
          ${gradeOptions}
        </select>
      </td>
      <td style="font-weight:700;color:#2563eb;">${gp !== '' ? gp : '—'}</td>
      <td style="font-weight:700;">${cpg !== '' ? cpg : '—'}</td>
      <td>
        <button onclick="removeSubjectRow(${idx})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;" title="Remove">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>`;
}

function updateSubjectField(idx, field, value) {
  if (gpaData[activeSem] && gpaData[activeSem][idx]) {
    gpaData[activeSem][idx][field] = value;
  }
  updateGpaCalcResult();
  renderSubjectsTable();
}

function addSubjectRow() {
  gpaData[activeSem].push({ name: '', credits: 3, grade: '' });
  renderSubjectsTable();
}

function removeSubjectRow(idx) {
  gpaData[activeSem].splice(idx, 1);
  renderSubjectsTable();
}

function updateGpaCalcResult() {
  // Current sem GPA
  const subjects = gpaData[activeSem] || [];
  let totalCredits = 0, totalPoints = 0;
  subjects.forEach(s => {
    if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
      totalCredits += parseInt(s.credits) || 0;
      totalPoints  += (parseInt(s.credits) || 0) * GRADE_POINTS[s.grade];
    }
  });

  const semGpa = totalCredits > 0 ? (totalPoints / totalCredits) : null;
  el('calcCurrentGpa').innerText = semGpa !== null ? semGpa.toFixed(2) : '--';

  // Overall CGPA — average of all sems that have data
  let allGpa = [], allCredits = 0, allPoints = 0;
  for (let s = 1; s <= GPA_SEMS; s++) {
    const subs = gpaData[s] || [];
    let tc = 0, tp = 0;
    subs.forEach(sub => {
      if (sub.grade && GRADE_POINTS[sub.grade] !== undefined) {
        tc += parseInt(sub.credits) || 0;
        tp += (parseInt(sub.credits) || 0) * GRADE_POINTS[sub.grade];
      }
    });
    if (tc > 0) {
      allGpa.push({ sem: s, gpa: tp / tc, credits: tc });
      allCredits += tc;
      allPoints  += tp;
    }
  }

  const cgpa = allCredits > 0 ? (allPoints / allCredits) : null;
  el('calcOverallCgpa').innerText = cgpa !== null ? cgpa.toFixed(2) : '--';

  renderCgpaSummary(allGpa);
}

function renderCgpaSummary(allGpa = []) {
  const bar = el('cgpaSummaryBar');
  if (!bar) return;

  if (allGpa.length === 0) {
    bar.innerHTML = '<span style="color:#94a3b8;font-size:13px;padding:8px;">Enter grades above to see CGPA summary</span>';
    return;
  }

  bar.innerHTML = allGpa.map(({ sem, gpa }) => `
    <div class="cgpa-summary-item">
      <div class="val">${gpa.toFixed(2)}</div>
      <div class="lbl">Sem ${sem}</div>
    </div>`).join('');
}

function resetGpaCalc() {
  for (let i = 1; i <= GPA_SEMS; i++) gpaData[i] = defaultSubjects(i);
  renderSubjectsTable();
  renderCgpaSummary();
}

function syncGpaToProfile() {
  // Sync calculated GPA into the profile form
  for (let i = 1; i <= GPA_SEMS; i++) {
    const subs = gpaData[i] || [];
    let tc = 0, tp = 0;
    subs.forEach(s => {
      if (s.grade && GRADE_POINTS[s.grade] !== undefined) {
        tc += parseInt(s.credits) || 0;
        tp += (parseInt(s.credits) || 0) * GRADE_POINTS[s.grade];
      }
    });
    const gpa = tc > 0 ? (tp / tc).toFixed(2) : '';
    const field = el(`sem${i}Gpa`);
    if (field && gpa) field.value = gpa;
  }
  calculateCGPA();
  showStudentAlert('✅ GPA values synced to your profile form. Go to My Profile to save.', true);
  switchTab('profile');
  setTimeout(enterEditMode, 300);
}

// ============================================================
// Utility: format date for display
// ============================================================
function fmtDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
