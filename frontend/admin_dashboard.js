// ============================================================
// ADMIN DASHBOARD JS — RIT CSBS Placement Portal
// ============================================================

const API_BASE = `${window.location.origin}/api`;

let currentAdminToken    = null;
let currentAdminUser     = null;
let currentFetchedStudents = [];
let currentPlacedStudents  = [];
let currentFetchedApplications = [];

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  currentAdminToken = localStorage.getItem('token');
  currentAdminUser  = safeParseUser();

  if (!currentAdminToken || !currentAdminUser || currentAdminUser.role !== 'admin') {
    window.location.href = 'Form.html';
    return;
  }

  el('adminUserName').innerText = currentAdminUser.full_name || 'Placement Admin';

  loadDashboardStats();
  fetchStudentRoster();
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
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// ALERT
// ============================================================
function showAdminAlert(message, isSuccess = false) {
  const box = el('adminAlert');
  if (!box) return;
  const icon = isSuccess ? 'fa-circle-check' : 'fa-circle-xmark';
  box.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  box.style.cssText = isSuccess
    ? 'background:#ecfdf5;color:#065f46;border:1.5px solid #6ee7b7;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;'
    : 'background:#fef2f2;color:#991b1b;border:1.5px solid #fca5a5;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;';
  box.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => box.classList.add('hidden'), 8000);
}

function hideAdminAlert() {
  const box = el('adminAlert');
  if (box) box.classList.add('hidden');
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function switchAdminTab(tabName, initialStatusFilter = null) {
  const tabs   = ['students', 'drives', 'applications', 'placed'];
  const tabMap = { students: 'tabBtnStudents', drives: 'tabBtnDrives', applications: 'tabBtnApplications', placed: 'tabBtnPlaced' };
  const panMap = { students: 'adminTabStudents', drives: 'adminTabDrives', applications: 'adminTabApplications', placed: 'adminTabPlaced' };

  tabs.forEach(t => {
    el(panMap[t])?.classList.toggle('hidden', t !== tabName);
    el(tabMap[t])?.classList.toggle('active', t === tabName);
  });

  if (tabName === 'students')     fetchStudentRoster();
  if (tabName === 'drives')       loadAdminDrives();
  if (tabName === 'applications') {
    if (initialStatusFilter !== null && el('filterAppStatus')) {
      el('filterAppStatus').value = initialStatusFilter;
    }
    loadApplicationsList();
  }
  if (tabName === 'placed')       loadPlacedStudents();
}

// ============================================================
// DASHBOARD STATS
// ============================================================
async function loadDashboardStats() {
  try {
    const res  = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success && data.stats) {
      el('statTotalStudents').innerText  = data.stats.totalStudents    || 0;
      el('statPlacedStudents').innerText = data.stats.placedStudents   || 0;
      el('statActiveDrives').innerText   = data.stats.activeDrives     || 0;
      el('statTotalApps').innerText      = data.stats.totalApplications || 0;
    }
  } catch (err) {
    console.error('Stats load error:', err);
  }
}

// ============================================================
// STUDENT ROSTER
// ============================================================
async function fetchStudentRoster() {
  const year      = el('filterYear')?.value || '';
  const minCgpa   = el('filterMinCgpa')?.value || '';
  const minTenth  = el('filterMinTenth')?.value || '';
  const minTwelth = el('filterMinTwelth')?.value || '';
  const maxArrears = el('filterMaxArrears')?.value ?? '';
  const search    = el('filterSearch')?.value.trim() || '';

  updateFilterChips();

  const query = new URLSearchParams();
  if (year)       query.append('year', year);
  if (minCgpa)    query.append('minCgpa', minCgpa);
  if (minTenth)   query.append('minTenth', minTenth);
  if (minTwelth)  query.append('minTwelth', minTwelth);
  if (maxArrears !== '') query.append('maxArrears', maxArrears);
  if (search)     query.append('search', search);

  const tbody = el('studentRosterTableBody');
  if (tbody) tbody.innerHTML = `
    <tr><td colspan="11" class="text-center" style="padding:30px;">
      <i class="fa-solid fa-spinner fa-spin" style="color:#94a3b8;"></i> Loading...
    </td></tr>`;

  try {
    const res  = await fetch(`${API_BASE}/admin/students?${query.toString()}`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.students || data.students.length === 0) {
      currentFetchedStudents = [];
      if (tbody) tbody.innerHTML = `
        <tr><td colspan="11" class="text-center" style="padding:40px;">
          <i class="fa-solid fa-magnifying-glass" style="font-size:28px;color:#94a3b8;display:block;margin-bottom:8px;"></i>
          <span style="color:#64748b;font-weight:600;">No students found matching the filters.</span>
        </td></tr>`;
      return;
    }

    currentFetchedStudents = data.students;
    renderStudentRoster(data.students, tbody);
  } catch (err) {
    console.error('Roster fetch error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding:30px;color:#ef4444;">Error loading roster. Check network connection.</td></tr>`;
  }
}

function getFullFileUrl(pathStr) {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${window.location.origin}${cleanPath}`;
}

function renderStudentRoster(students, tbody) {
  tbody.innerHTML = students.map(s => {
    const cgpa     = s.cgpa ? parseFloat(s.cgpa).toFixed(2) : '—';
    const tenth    = s.tenth_percentage ? `${parseFloat(s.tenth_percentage).toFixed(1)}%` : '—';
    const twelth   = s.twelth_percentage ? `${parseFloat(s.twelth_percentage).toFixed(1)}%` : '—';
    const arrears  = s.standing_arrears_count !== null ? parseInt(s.standing_arrears_count) : 0;

    let resumeHtml = `<span style="color:#94a3b8;font-size:12px;">Not uploaded</span>`;
    if (s.resume_file) {
      const url = getFullFileUrl(s.resume_file);
      resumeHtml = `<a href="${url}" target="_blank" download class="btn btn-success btn-sm" style="padding:4px 10px;font-size:11px;">
        <i class="fa-solid fa-download"></i> Resume
      </a>`;
    }

    const yearStr = (s.year == 5 || String(s.year).toLowerCase().includes('passed'))
      ? '<span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;">Passed Out</span>'
      : (s.year ? `<span class="badge badge-blue">${s.year}${['','st','nd','rd','th'][s.year] || ''} Yr</span>` : '—');

    const placedBadge = s.placed_company
      ? `<br/><span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;margin-top:4px;"><i class="fa-solid fa-briefcase"></i> Placed @ ${escapeHtml(s.placed_company)}</span>`
      : '';

    return `
    <tr>
      <td>${yearStr}</td>
      <td style="font-family:monospace;font-size:12px;">${s.register_number || '—'}</td>
      <td><strong>${s.full_name}</strong>${placedBadge}</td>
      <td style="font-size:12px;color:#64748b;">${s.email}</td>
      <td><strong>${tenth}</strong></td>
      <td><strong>${twelth}</strong></td>
      <td><span style="font-weight:800;color:#2563eb;">${cgpa}</span></td>
      <td><span class="badge ${arrears > 0 ? 'badge-red' : 'badge-green'}">${arrears} ${arrears === 1 ? 'Arrear' : 'Arrears'}</span></td>
      <td style="font-size:12px;">${s.domain_interest || 'General'}</td>
      <td>${resumeHtml}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-outline btn-sm"
            onclick="viewStudentModal(${JSON.stringify(s).replace(/"/g, '&quot;')})"
            title="View Details"
            style="padding:4px 8px;font-size:11px;">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button
            onclick="deleteStudent(${s.user_id}, '${s.full_name.replace(/'/g, "\\'")}')"
            class="btn btn-danger btn-sm"
            title="Delete Student"
            style="padding:4px 8px;font-size:11px;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ============================================================
// FILTER UTILITIES
// ============================================================
function applySeventyFilter() {
  const minCgpa = el('filterMinCgpa');
  const minTenth = el('filterMinTenth');
  const minTwelth = el('filterMinTwelth');
  if (minCgpa)   minCgpa.value  = '7.0';
  if (minTenth)  minTenth.value = '70';
  if (minTwelth) minTwelth.value = '70';
  fetchStudentRoster();
}

function clearAllFilters() {
  ['filterYear','filterMinCgpa','filterMinTenth','filterMinTwelth','filterMaxArrears','filterSearch'].forEach(id => {
    const e = el(id);
    if (e) e.value = '';
  });
  fetchStudentRoster();
}

function updateFilterChips() {
  const container = el('activeFilterChips');
  if (!container) return;
  container.innerHTML = '';

  const chips = [];
  const minCgpa   = el('filterMinCgpa')?.value;
  const minTenth  = el('filterMinTenth')?.value;
  const minTwelth = el('filterMinTwelth')?.value;
  const year      = el('filterYear')?.value;
  const maxArr    = el('filterMaxArrears')?.value;
  const search    = el('filterSearch')?.value;

  if (year)     chips.push(`Year: ${year == 5 ? 'Passed Out' : year}`);
  if (minCgpa)  chips.push(`Min CGPA ≥ ${minCgpa}`);
  if (minTenth) chips.push(`10th ≥ ${minTenth}%`);
  if (minTwelth) chips.push(`12th ≥ ${minTwelth}%`);
  if (maxArr !== '') chips.push(`Arrears ≤ ${maxArr}`);
  if (search)   chips.push(`Search: "${search}"`);

  container.innerHTML = chips.map(c => `<span class="filter-chip"><i class="fa-solid fa-tag"></i> ${c}</span>`).join('');
}

// ============================================================
// DELETE STUDENT
// ============================================================
async function deleteStudent(userId, studentName) {
  if (!confirm(`⚠️ Delete student "${studentName}"?\n\nThis will permanently remove their account, profile, and all applications. This cannot be undone.`)) return;

  try {
    const res  = await fetch(`${API_BASE}/admin/students/${userId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert(`Student "${studentName}" deleted successfully.`, true);
      fetchStudentRoster();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to delete student.');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showAdminAlert('Server error while deleting student.');
  }
}

// ============================================================
// STUDENT DETAIL MODAL
// ============================================================
function viewStudentModal(student) {
  el('studentModalTitle').innerText = student.full_name;

  const cgpa = student.cgpa ? parseFloat(student.cgpa).toFixed(2) : '—';
  const tenth = student.tenth_percentage ? `${parseFloat(student.tenth_percentage).toFixed(1)}%` : '—';
  const twelth = student.twelth_percentage ? `${parseFloat(student.twelth_percentage).toFixed(1)}%` : '—';
  const arrears = student.standing_arrears_count !== null ? student.standing_arrears_count : 0;
  const yearText = (student.year == 5 || String(student.year).toLowerCase().includes('passed')) ? 'Passed Out' : (student.year ? student.year + ' Year' : '—');

  el('studentModalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="detail-item"><span class="detail-label">Register No</span><span class="detail-value">${student.register_number || '—'}</span></div>
      <div class="detail-item"><span class="detail-label">Year</span><span class="detail-value">${yearText}</span></div>
      <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value" style="font-size:12px;">${student.email}</span></div>
      <div class="detail-item"><span class="detail-label">Phone</span><span class="detail-value">${student.phone || '—'}</span></div>
      <div class="detail-item"><span class="detail-label">CGPA</span><span class="detail-value" style="color:#2563eb;font-weight:800;font-size:18px;">${cgpa}</span></div>
      <div class="detail-item"><span class="detail-label">Standing Arrears</span><span class="detail-value">${arrears}</span></div>
      <div class="detail-item"><span class="detail-label">10th %</span><span class="detail-value">${tenth}</span></div>
      <div class="detail-item"><span class="detail-label">12th %</span><span class="detail-value">${twelth}</span></div>
      <div class="detail-item"><span class="detail-label">Domain</span><span class="detail-value">${student.domain_interest || 'General'}</span></div>
      <div class="detail-item">
        <span class="detail-label">Resume</span>
        <span class="detail-value">
          ${student.resume_file
            ? `<a href="${student.resume_file}" target="_blank" class="btn btn-success btn-sm"><i class="fa-solid fa-download"></i> View Resume</a>`
            : 'Not uploaded'}
        </span>
      </div>
      ${student.linkedin_link ? `<div class="detail-item" style="grid-column:span 2;">
        <span class="detail-label">LinkedIn</span>
        <span class="detail-value"><a href="${student.linkedin_link}" target="_blank">${student.linkedin_link}</a></span>
      </div>` : ''}
      ${student.github_link ? `<div class="detail-item" style="grid-column:span 2;">
        <span class="detail-label">GitHub</span>
        <span class="detail-value"><a href="${student.github_link}" target="_blank">${student.github_link}</a></span>
      </div>` : ''}
    </div>`;

  el('studentModal').classList.remove('hidden');
}

function closeStudentModal() {
  el('studentModal').classList.add('hidden');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'studentModal') closeStudentModal();
});

// ============================================================
// POST DRIVE
// ============================================================
async function handlePostDrive(e) {
  e.preventDefault();

  const btn = el('postDriveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...'; }

  const company     = el('driveCompany')?.value.trim();
  const role        = el('driveRole')?.value.trim();
  const pkg         = el('drivePackage')?.value.trim();
  const minCgpa     = el('driveMinCgpa')?.value || '6.00';
  const maxArrears  = el('driveMaxArrears')?.value || '0';
  const years       = el('driveYears')?.value || '3,4';
  const batch       = el('driveBatch')?.value || 'All Batches';
  const location    = el('driveLocation')?.value.trim() || 'Flexible';
  const deadline    = el('driveDeadline')?.value || null;
  const description = el('driveDescription')?.value.trim() || '';

  if (!company || !role || !pkg) {
    showAdminAlert('Company name, job role, and CTC package are required.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Drive'; }
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/admin/drives`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({
        company_name:        company,
        job_role:            role,
        package_ctc:         pkg,
        min_cgpa:            parseFloat(minCgpa),
        max_standing_arrears: parseInt(maxArrears),
        eligible_years:      years,
        target_batch:        batch,
        job_location:        location,
        deadline:            deadline,
        description:         description
      })
    });
    const data = await res.json();

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Drive'; }

    if (data.success) {
      showAdminAlert(`Drive for ${company} published successfully!`, true);
      el('postDriveForm').reset();
      el('driveMinCgpa').value   = '6.00';
      el('driveMaxArrears').value = '0';
      el('driveYears').value     = '3,4';
      if (el('driveBatch')) el('driveBatch').value = '2023-2027';
      loadAdminDrives();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to post drive.');
    }
  } catch (err) {
    console.error('Post drive error:', err);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Drive'; }
    showAdminAlert('Server error while posting drive.');
  }
}

// ============================================================
// COMPANY AVATAR COLOR GENERATOR
// ============================================================
function getCompanyAvatarColor(name) {
  const gradients = [
    'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // vibrant blue
    'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // deep purple
    'linear-gradient(135deg, #059669 0%, #047857 100%)', // emerald
    'linear-gradient(135deg, #d97706 0%, #b45309 100%)', // amber
    'linear-gradient(135deg, #db2777 0%, #be185d 100%)', // pink
    'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', // cyan
    'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'  // indigo
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

// ============================================================
// LOAD ADMIN DRIVES
// ============================================================
async function loadAdminDrives() {
  const container = el('adminDrivesContainer');
  if (!container) return;

  const batchSelect = el('filterDriveBatch');
  // Default to 2023-2027 if value is not set
  if (batchSelect && !batchSelect.value && batchSelect.querySelector('option[value="2023-2027"]')) {
    batchSelect.value = '2023-2027';
  }
  const batchFilter = batchSelect ? batchSelect.value : '2023-2027';

  container.innerHTML = `
    <div class="spinner-box">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#94a3b8;"></i>
      <p>Loading placement drives...</p>
    </div>`;

  try {
    const res  = await fetch(`${API_BASE}/student/drives/0`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.drives || data.drives.length === 0) {
      currentAdminDrivesList = [];
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-briefcase" style="color:#94a3b8;font-size:36px;margin-bottom:12px;"></i>
          <p style="font-weight:600;color:#64748b;">No placement drives found in the portal.</p>
          <p style="font-size:13px;color:#94a3b8;">Use the "Post New Placement Drive" form above to publish one.</p>
        </div>`;
      return;
    }

    currentAdminDrivesList = data.drives;
    let drivesToRender = data.drives;
    if (batchFilter) {
      drivesToRender = data.drives.filter(d => {
        const b = d.target_batch || '2023-2027';
        return b === 'All Batches' || b === batchFilter || (batchFilter === '2023-2027' && (!d.target_batch || d.target_batch === 'All Batches' || d.target_batch === '2023-2027'));
      });
    }

    if (drivesToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <i class="fa-solid fa-filter" style="color:#94a3b8;font-size:36px;margin-bottom:12px;"></i>
          <p style="font-weight:600;color:#475569;">No active drives for batch "${batchFilter}".</p>
          <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="if(el('filterDriveBatch')){el('filterDriveBatch').value='';loadAdminDrives();}">
            <i class="fa-solid fa-layer-group"></i> View All Batches
          </button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="pro-drives-grid">
        ${drivesToRender.map(d => buildAdminDriveCard(d)).join('')}
      </div>`;
  } catch (err) {
    console.error('Load drives error:', err);
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i><p>Error loading drives.</p></div>`;
  }
}

// ============================================================
// PROFESSIONAL DRIVE CARD BUILDER (ADMIN)
// ============================================================
function buildAdminDriveCard(d) {
  const deadlineStr   = d.deadline ? fmtDate(d.deadline) : 'Open';
  const isExpired     = d.deadline && new Date(d.deadline) < new Date();
  const rawBatch      = d.target_batch || '';
  const batchLabel    = (!rawBatch || rawBatch === 'All Batches') ? '2023-2027 (4th Year)' : (rawBatch.includes('(') ? rawBatch : `${rawBatch}`);
  const companyName   = d.company_name || 'Company';
  const initial       = companyName.charAt(0).toUpperCase();
  const avatarBg      = getCompanyAvatarColor(companyName);
  const minCgpa       = parseFloat(d.min_cgpa || 0).toFixed(2);
  const maxArrears    = d.max_standing_arrears ?? 0;
  const eligibleYears = d.eligible_years || '3, 4';
  const safeComp      = escapeHtml(companyName);
  const safeRole      = escapeHtml(d.job_role || 'Job Role');
  const safePkg       = escapeHtml(d.package_ctc || 'CTC Disclosed');
  const safeBatch     = escapeHtml(batchLabel);
  const safeLocation  = escapeHtml(d.job_location || 'Flexible / On-Campus');

  return `
  <div class="pro-drive-card ${isExpired ? 'is-expired-card' : ''}">
    <!-- Card Top Header -->
    <div class="pro-drive-header">
      <div class="pro-drive-brand">
        <div class="pro-company-avatar" style="background: ${avatarBg};">
          ${initial}
        </div>
        <div class="pro-company-meta">
          <h4 class="pro-company-name" title="${safeComp}">${safeComp}</h4>
          <span class="pro-job-role" title="${safeRole}">${safeRole}</span>
        </div>
      </div>
      <!-- Single Clean Delete Option at Top Right -->
      <button type="button" class="pro-drive-delete-btn"
              onclick="openDeleteDriveModal(${d.id}, '${safeComp.replace(/'/g, "\\'")}', '${safeRole.replace(/'/g, "\\'")}', '${safePkg.replace(/'/g, "\\'")}', '${safeBatch.replace(/'/g, "\\'")}')"
              title="Delete placement drive">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>

    <!-- Badges & Highlights Ribbon -->
    <div class="pro-drive-tags">
      <span class="pro-tag pro-tag-ctc" title="Package CTC">
        <i class="fa-solid fa-indian-rupee-sign"></i> ${safePkg}
      </span>
      <span class="pro-tag pro-tag-batch" title="Target Batch">
        <i class="fa-solid fa-graduation-cap"></i> ${safeBatch}
      </span>
      <span class="pro-tag pro-tag-location" title="Job Location">
        <i class="fa-solid fa-location-dot"></i> ${safeLocation}
      </span>
      <span class="pro-tag ${isExpired ? 'pro-tag-expired' : 'pro-tag-deadline'}" title="Application Deadline">
        <i class="fa-solid ${isExpired ? 'fa-lock' : 'fa-calendar-days'}"></i> ${isExpired ? 'Closed (' + deadlineStr + ')' : deadlineStr}
      </span>
    </div>

    <!-- Eligibility Micro Grid -->
    <div class="pro-criteria-box">
      <div class="pro-criteria-item">
        <span class="crit-label">Min CGPA</span>
        <span class="crit-val">${minCgpa}</span>
      </div>
      <div class="pro-criteria-item">
        <span class="crit-label">Max Arrears</span>
        <span class="crit-val">${maxArrears}</span>
      </div>
      <div class="pro-criteria-item">
        <span class="crit-label">Eligible Years</span>
        <span class="crit-val">Yr ${escapeHtml(eligibleYears)}</span>
      </div>
    </div>

    <!-- Job Description (Clamped Snippet) -->
    ${d.description ? `
    <div class="pro-drive-desc" title="${escapeHtml(d.description)}">
      ${escapeHtml(d.description)}
    </div>` : ''}

    <!-- Card Bottom Footer with Eligible Students & Edit Buttons -->
    <div class="pro-drive-footer">
      <span class="pro-status-live">
        <span class="pulse-green-dot"></span> Active in Portal
      </span>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-sm btn-primary"
                onclick="openDriveEligibleModal(${d.id})"
                style="padding:6px 12px;font-size:12px;font-weight:700;"
                title="View Eligible, Registered and Pending Students">
          <i class="fa-solid fa-users-viewfinder"></i> Eligible Students
        </button>
        <button type="button" class="btn btn-sm btn-outline"
                onclick="openEditDriveModal(${d.id})"
                style="padding:6px 12px;font-size:12px;font-weight:700;color:#2563eb;border-color:#bfdbfe;"
                title="Edit placement drive details">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
      </div>
    </div>
  </div>`;
}

// ============================================================
// CUSTOM DELETE DRIVE MODAL LOGIC (Both Admin & Student Portal)
// ============================================================
let pendingDeleteDriveData = null;

function openDeleteDriveModal(id, companyName, jobRole, packageCtc, targetBatch) {
  pendingDeleteDriveData = { id, companyName };
  const modal = el('deleteDriveModal');
  if (!modal) return;

  el('deleteModalCompanyName').innerText = companyName;
  el('deleteModalRole').innerText = jobRole || 'Placement Drive';
  el('deleteModalPackage').innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i> ${packageCtc || 'CTC Disclosed'}`;
  el('deleteModalBatch').innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${targetBatch || '2023-2027'}`;

  const btn = el('confirmDeleteDriveBtn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Drive`;
  }

  modal.classList.remove('hidden');
}

function closeDeleteDriveModal() {
  const modal = el('deleteDriveModal');
  if (modal) modal.classList.add('hidden');
  pendingDeleteDriveData = null;
}

async function executeDeleteDrive() {
  if (!pendingDeleteDriveData) return;
  const { id, companyName } = pendingDeleteDriveData;
  const btn = el('confirmDeleteDriveBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/drives/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (data.success) {
      closeDeleteDriveModal();
      showAdminAlert(`✅ Placement drive for "${companyName}" has been deleted from both Admin Panel and Student Dashboard.`, true);
      loadAdminDrives();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to delete placement drive.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Drive`;
      }
    }
  } catch (err) {
    console.error('Delete drive error:', err);
    showAdminAlert('Network error while deleting placement drive.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Drive`;
    }
  }
}

// ============================================================
// EDIT PLACEMENT DRIVE MODAL LOGIC
// ============================================================
let currentAdminDrivesList = [];

function openEditDriveModal(driveId) {
  const drive = (currentAdminDrivesList || []).find(d => d.id === driveId);
  if (!drive) {
    showAdminAlert('Drive details not found in cache. Refreshing...');
    loadAdminDrives();
    return;
  }

  el('editDriveId').value          = drive.id;
  el('editDriveCompany').value     = drive.company_name || '';
  el('editDriveRole').value        = drive.job_role || '';
  el('editDrivePackage').value     = drive.package_ctc || '';
  el('editDriveMinCgpa').value    = drive.min_cgpa ?? 6.0;
  el('editDriveMaxArrears').value = drive.max_standing_arrears ?? 0;
  el('editDriveYears').value      = drive.eligible_years || '3,4';
  el('editDriveBatch').value      = drive.target_batch || '2023-2027';
  el('editDriveLocation').value   = drive.job_location || '';
  el('editDriveDeadline').value   = drive.deadline ? drive.deadline.slice(0, 10) : '';
  el('editDriveDescription').value= drive.description || '';

  const modal = el('editDriveModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditDriveModal() {
  const modal = el('editDriveModal');
  if (modal) modal.classList.add('hidden');
}

async function handleEditDriveSubmit(event) {
  event.preventDefault();
  const driveId = el('editDriveId').value;
  if (!driveId) return;

  const payload = {
    company_name:         el('editDriveCompany').value.trim(),
    job_role:             el('editDriveRole').value.trim(),
    package_ctc:          el('editDrivePackage').value.trim(),
    min_cgpa:             parseFloat(el('editDriveMinCgpa').value) || 0,
    max_standing_arrears: parseInt(el('editDriveMaxArrears').value) || 0,
    eligible_years:       el('editDriveYears').value.trim() || '3,4',
    target_batch:         el('editDriveBatch').value || '2023-2027',
    job_location:         el('editDriveLocation').value.trim() || 'Flexible',
    deadline:             el('editDriveDeadline').value || null,
    description:          el('editDriveDescription').value.trim()
  };

  const saveBtn = el('saveEditDriveBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/drives/${driveId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      closeEditDriveModal();
      showAdminAlert(`✅ Placement drive for "${payload.company_name}" updated successfully!`, true);
      loadAdminDrives();
    } else {
      showAdminAlert(data.message || 'Failed to update placement drive.');
    }
  } catch (err) {
    console.error('Update drive error:', err);
    showAdminAlert('Network or server error while updating drive.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    }
  }
}

// ============================================================
// ELIGIBLE STUDENTS MODAL (REGISTERED & UNREGISTERED)
// ============================================================
let currentEligibleData = null;
let currentEligibleFilter = 'all';

async function openDriveEligibleModal(driveId) {
  const modal = el('driveEligibleModal');
  if (!modal) return;

  el('eligibleModalTitle').innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:#2563eb;"></i> Loading Eligible Students...`;
  el('eligibleModalSubtitle').innerText = 'Evaluating student criteria and registration status...';
  el('eligibleStudentsTableBody').innerHTML = `
    <tr>
      <td colspan="9" class="text-center" style="padding:40px;color:#94a3b8;">
        <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
        <p style="margin-top:8px;font-weight:600;">Evaluating department students against drive criteria...</p>
      </td>
    </tr>`;

  modal.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/admin/drives/${driveId}/eligible-students`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success) {
      el('eligibleStudentsTableBody').innerHTML = `
        <tr><td colspan="9" class="text-center" style="padding:30px;color:#ef4444;">${data.message || 'Failed to load eligible students'}</td></tr>`;
      return;
    }

    currentEligibleData = data;
    currentEligibleFilter = 'all';

    const d = data.drive;
    const s = data.summary;

    el('eligibleModalTitle').innerHTML = `
      <i class="fa-solid fa-building" style="color:#2563eb;"></i> ${escapeHtml(d.company_name)} — ${escapeHtml(d.job_role)}
    `;
    el('eligibleModalSubtitle').innerHTML = `
      <strong>Criteria:</strong> Min CGPA: ${parseFloat(d.min_cgpa||0).toFixed(2)} | Max Arrears: ${d.max_standing_arrears||0} | Batch: ${escapeHtml(d.target_batch||'2023-2027')} | Package: ${escapeHtml(d.package_ctc||'')}
    `;

    el('eligibleTotalCount').innerText     = s.total_eligible;
    el('eligibleAppliedCount').innerText   = s.applied_count;
    el('eligibleUnappliedCount').innerText = s.unapplied_count;

    el('pillCountAll').innerText       = s.total_eligible;
    el('pillCountApplied').innerText   = s.applied_count;
    el('pillCountUnapplied').innerText = s.unapplied_count;

    filterEligibleModalList('all');
  } catch (err) {
    console.error('Eligible students error:', err);
    el('eligibleStudentsTableBody').innerHTML = `
      <tr><td colspan="9" class="text-center" style="padding:30px;color:#ef4444;">Network error while fetching eligible students.</td></tr>`;
  }
}

function closeDriveEligibleModal() {
  const modal = el('driveEligibleModal');
  if (modal) modal.classList.add('hidden');
  currentEligibleData = null;
}

function filterEligibleModalList(filterType) {
  currentEligibleFilter = filterType;

  ['btnFilterAllEligible', 'btnFilterAppliedEligible', 'btnFilterUnappliedEligible'].forEach(id => {
    const btn = el(id);
    if (btn) {
      btn.className = 'btn btn-sm btn-outline';
    }
  });

  if (filterType === 'all' && el('btnFilterAllEligible')) {
    el('btnFilterAllEligible').className = 'btn btn-sm btn-primary';
  } else if (filterType === 'applied' && el('btnFilterAppliedEligible')) {
    el('btnFilterAppliedEligible').className = 'btn btn-sm btn-success';
  } else if (filterType === 'unapplied' && el('btnFilterUnappliedEligible')) {
    el('btnFilterUnappliedEligible').className = 'btn btn-sm btn-warning';
  }

  renderEligibleStudentsTable();
}

function renderEligibleStudentsTable() {
  if (!currentEligibleData || !currentEligibleData.students) return;

  const tbody = el('eligibleStudentsTableBody');
  if (!tbody) return;

  let list = currentEligibleData.students.all || [];
  if (currentEligibleFilter === 'applied')   list = currentEligibleData.students.applied || [];
  if (currentEligibleFilter === 'unapplied') list = currentEligibleData.students.unapplied || [];

  const search = (el('eligibleSearchInput')?.value || '').trim().toLowerCase();
  if (search) {
    list = list.filter(s =>
      (s.full_name && s.full_name.toLowerCase().includes(search)) ||
      (s.register_number && s.register_number.toLowerCase().includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center" style="padding:32px;color:#94a3b8;">
          <i class="fa-solid fa-users-slash" style="font-size:24px;margin-bottom:6px;"></i>
          <p>No eligible students match this view / search.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, idx) => {
    const statusPill = s.is_applied
      ? `<span class="badge badge-green" style="font-weight:700;"><i class="fa-solid fa-circle-check"></i> Applied (${escapeHtml(s.application_status)})</span>`
      : `<span class="badge badge-yellow" style="font-weight:700;"><i class="fa-solid fa-clock"></i> Not Applied / Pending</span>`;

    const resumeBtn = s.resume_file
      ? `<a href="${s.resume_file}" target="_blank" class="btn btn-outline btn-sm" style="padding:3px 8px;font-size:11px;" title="View Resume">
           <i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i> Resume
         </a>`
      : `<span style="color:#94a3b8;font-size:11px;">--</span>`;

    return `
      <tr>
        <td style="color:#94a3b8;font-size:12px;">${idx + 1}</td>
        <td><strong style="color:#0f172a;font-family:monospace;font-size:12.5px;">${escapeHtml(s.register_number)}</strong></td>
        <td>
          <div style="font-weight:700;color:#1e293b;">${escapeHtml(s.full_name)}</div>
          <div style="font-size:11px;color:#64748b;">${escapeHtml(s.email)}</div>
        </td>
        <td><span class="badge badge-blue">Yr ${s.year || 4}</span></td>
        <td><strong style="color:#2563eb;">${s.cgpa}</strong></td>
        <td>
          <span class="badge ${s.standing_arrears === 0 ? 'badge-green' : 'badge-red'}">
            ${s.standing_arrears} Arrears
          </span>
        </td>
        <td style="font-size:12px;">${s.tenth_percentage} / ${s.twelth_percentage}</td>
        <td>${statusPill}</td>
        <td>${resumeBtn}</td>
      </tr>`;
  }).join('');
}

function exportEligibleStudentsExcel() {
  if (!currentEligibleData || !currentEligibleData.students || !window.XLSX) {
    alert('Excel library or data not ready.');
    return;
  }

  let list = currentEligibleData.students.all || [];
  if (currentEligibleFilter === 'applied')   list = currentEligibleData.students.applied || [];
  if (currentEligibleFilter === 'unapplied') list = currentEligibleData.students.unapplied || [];

  const d = currentEligibleData.drive || {};
  const companySafe = (d.company_name || 'Placement_Drive').replace(/[^a-zA-Z0-9]/g, '_');

  const rows = [
    [`RAMCO INSTITUTE OF TECHNOLOGY — CSBS DEPARTMENT`],
    [`Eligible Students List for: ${d.company_name || 'Drive'} (${d.job_role || ''})`],
    [`Criteria: Min CGPA >= ${d.min_cgpa || 0} | Max Arrears <= ${d.max_standing_arrears || 0} | Filter View: ${currentEligibleFilter.toUpperCase()}`],
    [],
    ['S.No', 'Register Number', 'Student Name', 'Email', 'Phone', 'Year', 'Department', 'CGPA', 'Standing Arrears', '10th %', '12th %', 'Application Status', 'Applied At', 'Resume Link']
  ];

  list.forEach((s, i) => {
    rows.push([
      i + 1,
      s.register_number,
      s.full_name,
      s.email,
      s.phone || '--',
      s.year,
      s.department || 'CSBS',
      s.cgpa,
      s.standing_arrears,
      s.tenth_percentage,
      s.twelth_percentage,
      s.application_status,
      s.applied_at ? fmtDate(s.applied_at) : 'Not Applied',
      s.resume_file || 'Not Uploaded'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Eligible Students');
  XLSX.writeFile(wb, `${companySafe}_Eligible_Students.xlsx`);
}

// ============================================================
// LOAD APPLICATIONS
// ============================================================
async function loadApplicationsList() {
  const tbody = el('applicationsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:30px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Loading applications...</td></tr>`;

  try {
    const res  = await fetch(`${API_BASE}/admin/applications`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.applications) {
      currentFetchedApplications = [];
      renderApplicationsFiltered();
      return;
    }

    currentFetchedApplications = data.applications;
    updateAppStatusDropdownCounts();
    renderApplicationsFiltered();
  } catch (err) {
    console.error('Applications load error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:30px;color:#ef4444;">Error loading applications. Check network connection.</td></tr>`;
  }
}

function updateAppStatusDropdownCounts() {
  const apps = currentFetchedApplications || [];
  const totalCount = apps.length;
  const placedCount = apps.filter(a => a.status === 'Selected').length;
  const appliedCount = apps.filter(a => a.status === 'Applied').length;
  const shortlistedCount = apps.filter(a => a.status === 'Shortlisted').length;
  const rejectedCount = apps.filter(a => a.status === 'Rejected').length;

  const select = el('filterAppStatus');
  if (select) {
    const currentVal = select.value;
    select.innerHTML = `
      <option value="">All Applications (${totalCount})</option>
      <option value="Selected">🏆 Placed Students (${placedCount})</option>
      <option value="Applied">📄 Applied Students (${appliedCount})</option>
      <option value="Shortlisted">⭐ Shortlisted Students (${shortlistedCount})</option>
      <option value="Rejected">❌ Rejected Students (${rejectedCount})</option>
    `;
    select.value = currentVal;
  }

  const pillsContainer = el('appQuickStatusPills');
  if (pillsContainer) {
    const activeStatus = select ? select.value : '';
    pillsContainer.innerHTML = `
      <button class="btn btn-sm ${activeStatus === '' ? 'btn-primary' : 'btn-outline'}" onclick="setAppStatusFilter('')">
        All (${totalCount})
      </button>
      <button class="btn btn-sm ${activeStatus === 'Selected' ? 'btn-success' : 'btn-outline'}" onclick="setAppStatusFilter('Selected')" style="${activeStatus === 'Selected' ? 'background:#10b981;color:#fff;border-color:#10b981;' : ''}">
        <i class="fa-solid fa-trophy"></i> Placed Students (${placedCount})
      </button>
      <button class="btn btn-sm ${activeStatus === 'Applied' ? 'btn-primary' : 'btn-outline'}" onclick="setAppStatusFilter('Applied')">
        <i class="fa-solid fa-paper-plane"></i> Applied (${appliedCount})
      </button>
      <button class="btn btn-sm ${activeStatus === 'Shortlisted' ? 'btn-warning' : 'btn-outline'}" onclick="setAppStatusFilter('Shortlisted')">
        <i class="fa-solid fa-star"></i> Shortlisted (${shortlistedCount})
      </button>
      <button class="btn btn-sm ${activeStatus === 'Rejected' ? 'btn-danger' : 'btn-outline'}" onclick="setAppStatusFilter('Rejected')">
        <i class="fa-solid fa-xmark"></i> Rejected (${rejectedCount})
      </button>
    `;
  }
}

function setAppStatusFilter(statusVal) {
  const select = el('filterAppStatus');
  if (select) select.value = statusVal;
  renderApplicationsFiltered();
}

function clearAppFilters() {
  if (el('filterAppStatus')) el('filterAppStatus').value = '';
  if (el('filterAppYear'))   el('filterAppYear').value = '';
  if (el('filterAppSearch')) el('filterAppSearch').value = '';
  renderApplicationsFiltered();
}

function renderApplicationsFiltered() {
  const tbody = el('applicationsTableBody');
  if (!tbody) return;

  const statusVal = el('filterAppStatus')?.value || '';
  const yearVal   = el('filterAppYear')?.value || '';
  const searchVal = el('filterAppSearch')?.value.trim().toLowerCase() || '';

  let filtered = currentFetchedApplications || [];

  if (statusVal) {
    filtered = filtered.filter(a => a.status === statusVal);
  }
  if (yearVal) {
    filtered = filtered.filter(a => String(a.year) === String(yearVal));
  }
  if (searchVal) {
    filtered = filtered.filter(a =>
      (a.full_name && a.full_name.toLowerCase().includes(searchVal)) ||
      (a.register_number && a.register_number.toLowerCase().includes(searchVal)) ||
      (a.company_name && a.company_name.toLowerCase().includes(searchVal)) ||
      (a.job_role && a.job_role.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    let emptyLabel = 'No applications found matching the selected filters.';
    if (statusVal === 'Selected') emptyLabel = 'No placed students (Selected) found matching the filters.';
    else if (statusVal === 'Applied') emptyLabel = 'No applied students found matching the filters.';
    else if (statusVal === 'Shortlisted') emptyLabel = 'No shortlisted students found matching the filters.';
    else if (statusVal === 'Rejected') emptyLabel = 'No rejected students found matching the filters.';

    tbody.innerHTML = `
      <tr><td colspan="9" class="text-center" style="padding:40px;">
        <i class="fa-solid fa-filter-circle-xmark" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i>
        <span style="color:#64748b;font-weight:700;font-size:14px;">${emptyLabel}</span>
      </td></tr>`;
    return;
  }

  const statusMap = {
    'Applied':     'status-applied',
    'Shortlisted': 'status-shortlisted',
    'Selected':    'status-selected',
    'Rejected':    'status-rejected'
  };

  tbody.innerHTML = filtered.map(app => {
    const resumeHtml = app.resume_file
      ? `<a href="${app.resume_file.startsWith('http') ? app.resume_file : window.location.origin + app.resume_file}"
             target="_blank" class="btn btn-success btn-sm" style="padding:4px 8px;font-size:11px;">
          <i class="fa-solid fa-download"></i> Resume
         </a>`
      : '<span style="color:#94a3b8;font-size:11px;">—</span>';

    const isSelected = app.status === 'Selected';
    const statusLabel = isSelected ? '<i class="fa-solid fa-trophy" style="margin-right:3px;color:#059669;"></i> Placed (Selected)' : app.status;

    return `
    <tr style="${isSelected ? 'background:#ecfdf5;' : ''}">
      <td>
        <strong>${escapeHtml(app.company_name)}</strong>
        <div style="font-size:11px;color:#64748b;">${escapeHtml(app.job_role)} — ${escapeHtml(app.package_ctc)}</div>
      </td>
      <td><strong>${escapeHtml(app.full_name)}</strong></td>
      <td style="font-family:monospace;font-size:12px;">${escapeHtml(app.register_number || '—')}</td>
      <td>${app.year ? app.year + ' Yr' : '—'}</td>
      <td><strong style="color:#2563eb;">${app.cgpa ? parseFloat(app.cgpa).toFixed(2) : '—'}</strong></td>
      <td><span class="badge ${parseInt(app.standing_arrears_count || 0) > 0 ? 'badge-red' : 'badge-green'}">${app.standing_arrears_count || 0}</span></td>
      <td>${resumeHtml}</td>
      <td>
        <span class="status-pill ${statusMap[app.status] || 'status-applied'}">${statusLabel}</span>
      </td>
      <td>
        <select
          class="form-control"
          style="padding:5px 8px;font-size:12px;min-width:135px;"
          onchange="updateAppStatus(${app.app_id}, this.value, this)">
          <option value="">Change Status…</option>
          <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Selected (Placed)</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

// ============================================================
// UPDATE APPLICATION STATUS
// ============================================================
async function updateAppStatus(appId, newStatus, selectEl) {
  if (!newStatus) return;
  selectEl.disabled = true;

  try {
    const res  = await fetch(`${API_BASE}/admin/applications/status`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ application_id: appId, status: newStatus })
    });
    const data = await res.json();
    selectEl.disabled = false;

    if (data.success) {
      showAdminAlert(`Status updated to "${newStatus}".`, true);
      loadApplicationsList();
      loadDashboardStats();
      if (!el('adminTabPlaced')?.classList.contains('hidden')) {
        loadPlacedStudents();
      }
    } else {
      showAdminAlert(data.message || 'Failed to update status.');
      selectEl.value = '';
    }
  } catch (err) {
    console.error('Update status error:', err);
    selectEl.disabled = false;
    selectEl.value = '';
    showAdminAlert('Server error while updating status.');
  }
}

// ============================================================
// EXCEL EXPORT
// ============================================================
function downloadStudentExcel() {
  if (!currentFetchedStudents || currentFetchedStudents.length === 0) {
    showAdminAlert('No student data to export. Apply filters first if needed.');
    return;
  }

  const rows = currentFetchedStudents.map((s, i) => ({
    'S.No':              i + 1,
    'Register Number':   s.register_number || '',
    'Student Name':      s.full_name || '',
    'Email':             s.email || '',
    'Year':              s.year || '',
    '10th %':            s.tenth_percentage || '',
    '12th %':            s.twelth_percentage || '',
    'CGPA':              s.cgpa || '',
    'Standing Arrears':  s.standing_arrears_count || 0,
    'Domain Interest':   s.domain_interest || '',
    'LinkedIn':          s.linkedin_link || '',
    'GitHub':            s.github_link || '',
    'Resume URL':        s.resume_file || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { fgColor: { rgb: '2563EB' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center' }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `RIT_CSBS_Students_${timestamp}.xlsx`);
  showAdminAlert(`Exported ${rows.length} student records to Excel.`, true);
}

// ============================================================
// PLACED STUDENTS TAB LOGIC
// ============================================================
async function loadPlacedStudents() {
  const year   = el('filterPlacedYear')?.value || '';
  const search = el('filterPlacedSearch')?.value.trim() || '';

  const query = new URLSearchParams();
  if (year)   query.append('year', year);
  if (search) query.append('search', search);

  const tbody = el('placedStudentsTableBody');
  if (tbody) tbody.innerHTML = `
    <tr><td colspan="9" class="text-center" style="padding:30px;">
      <i class="fa-solid fa-spinner fa-spin" style="color:#10b981;"></i> Loading placed student records...
    </td></tr>`;

  try {
    const res  = await fetch(`${API_BASE}/admin/placed-students?${query.toString()}`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.placedStudents || data.placedStudents.length === 0) {
      currentPlacedStudents = [];
      if (tbody) tbody.innerHTML = `
        <tr><td colspan="9" class="text-center" style="padding:40px;">
          <i class="fa-solid fa-trophy" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i>
          <span style="color:#64748b;font-weight:700;font-size:15px;">No placed students found matching the criteria.</span>
          <p style="color:#94a3b8;font-size:12px;margin-top:4px;">When student applications are updated to 'Selected', placed records will appear here.</p>
        </td></tr>`;
      return;
    }

    currentPlacedStudents = data.placedStudents;
    renderPlacedStudents(data.placedStudents, tbody);
  } catch (err) {
    console.error('Placed students fetch error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:30px;color:#ef4444;">Failed to load placed records. Please try again.</td></tr>`;
  }
}

function renderPlacedStudents(placedList, tbody) {
  tbody.innerHTML = placedList.map(p => {
    const cgpa    = p.cgpa ? parseFloat(p.cgpa).toFixed(2) : '—';
    const yearStr = (p.year == 5 || String(p.year).toLowerCase().includes('passed'))
      ? '<span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;">Passed Out</span>'
      : (p.year ? `<span class="badge badge-blue">${p.year}${['','st','nd','rd','th'][p.year] || ''} Yr</span>` : '—');

    let resumeHtml = `<span style="color:#94a3b8;font-size:12px;">No resume</span>`;
    if (p.resume_file) {
      const url = getFullFileUrl(p.resume_file);
      resumeHtml = `<a href="${url}" target="_blank" download class="btn btn-success btn-sm" style="padding:4px 10px;font-size:11px;">
        <i class="fa-solid fa-download"></i> Resume
      </a>`;
    }

    const studentJson = JSON.stringify({
      full_name: p.full_name,
      register_number: p.register_number,
      email: p.email,
      phone: p.phone,
      year: p.year,
      cgpa: p.cgpa,
      standing_arrears_count: p.standing_arrears_count,
      resume_file: p.resume_file
    }).replace(/"/g, '&quot;');

    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:1px solid #a7f3d0;">
            ${escapeHtml((p.full_name || 'S').charAt(0).toUpperCase())}
          </div>
          <div>
            <strong style="color:#0f172a;">${escapeHtml(p.full_name)}</strong>
            <div style="font-size:11px;color:#64748b;">${escapeHtml(p.email)}</div>
          </div>
        </div>
      </td>
      <td style="font-family:monospace;font-size:12px;">${escapeHtml(p.register_number || '—')}</td>
      <td>${yearStr}</td>
      <td><span style="font-weight:800;color:#2563eb;">${cgpa}</span></td>
      <td>
        <span style="background:#ecfdf5;color:#047857;border:1.5px solid #6ee7b7;padding:5px 12px;border-radius:20px;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(16,185,129,0.12);">
          <i class="fa-solid fa-building" style="color:#10b981;"></i> ${escapeHtml(p.company_name)}
        </span>
      </td>
      <td><strong style="color:#334155;">${escapeHtml(p.job_role)}</strong></td>
      <td><span style="font-weight:700;color:#059669;">${escapeHtml(p.package_ctc)}</span></td>
      <td style="font-size:12px;color:#64748b;"><i class="fa-regular fa-calendar-check" style="margin-right:4px;color:#10b981;"></i>${fmtDate(p.applied_at)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          ${resumeHtml}
          <button class="btn btn-outline btn-sm" onclick="viewStudentModal(${studentJson})" title="View Student Profile" style="padding:4px 8px;font-size:11px;">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function downloadPlacedExcel() {
  if (!currentPlacedStudents || currentPlacedStudents.length === 0) {
    showAdminAlert('No placed student records to export.');
    return;
  }

  const rows = currentPlacedStudents.map((p, i) => ({
    'S.No':              i + 1,
    'Student Name':      p.full_name || '',
    'Register Number':   p.register_number || '',
    'Company Placed':    p.company_name || '',
    'Designation / Role':p.job_role || '',
    'Package (CTC)':     p.package_ctc || '',
    'Year':              p.year || '',
    'CGPA':              p.cgpa || '',
    'Email':             p.email || '',
    'Phone':             p.phone || '',
    'Selection Date':    fmtDate(p.applied_at),
    'Resume URL':        p.resume_file || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { fgColor: { rgb: '10B981' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center' }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Placed Students');
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `RIT_CSBS_Placed_Students_${timestamp}.xlsx`);
  showAdminAlert(`Exported ${rows.length} placed student records to Excel.`, true);
}
