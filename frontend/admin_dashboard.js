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
  const tabs   = ['students', 'placed', 'drives', 'applications'];
  const tabMap = { students: 'tabBtnStudents', placed: 'tabBtnPlaced', drives: 'tabBtnDrives', applications: 'tabBtnApplications' };
  const panMap = { students: 'adminTabStudents', placed: 'adminTabPlaced', drives: 'adminTabDrives', applications: 'adminTabApplications' };

  tabs.forEach(t => {
    el(panMap[t])?.classList.toggle('hidden', t !== tabName);
    el(tabMap[t])?.classList.toggle('active', t === tabName);
  });

  if (tabName === 'students')     fetchStudentRoster();
  if (tabName === 'placed')       loadPlacedStudents();
  if (tabName === 'drives')       loadAdminDrives();
  if (tabName === 'applications') {
    if (initialStatusFilter !== null && el('filterAppStatus')) {
      el('filterAppStatus').value = initialStatusFilter;
    }
    loadApplicationsList();
  }
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
// LOAD ADMIN DRIVES
// ============================================================
async function loadAdminDrives() {
  const container = el('adminDrivesContainer');
  if (!container) return;

  const batchFilter = el('filterDriveBatch')?.value || '';

  container.innerHTML = `
    <div class="spinner-box">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#94a3b8;"></i>
      <p>Loading drives...</p>
    </div>`;

  try {
    const res  = await fetch(`${API_BASE}/student/drives/0`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.drives || data.drives.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-briefcase" style="color:#94a3b8;"></i>
          <p>No drives posted yet. Use the form above to add one.</p>
        </div>`;
      return;
    }

    let drivesToRender = data.drives;
    if (batchFilter) {
      drivesToRender = data.drives.filter(d =>
        !d.target_batch || d.target_batch === 'All Batches' || d.target_batch === batchFilter
      );
    }

    if (drivesToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-filter" style="color:#94a3b8;"></i>
          <p>No placement drives found for batch "${batchFilter}".</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="drives-grid">
        ${drivesToRender.map(d => buildAdminDriveCard(d)).join('')}
      </div>`;
  } catch (err) {
    console.error('Load drives error:', err);
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i><p>Error loading drives.</p></div>`;
  }
}

function buildAdminDriveCard(d) {
  const deadlineStr  = d.deadline ? fmtDate(d.deadline) : 'Open';
  const isExpired    = d.deadline && new Date(d.deadline) < new Date();
  const isHidden     = d.is_deleted_for_students == 1 || d.is_deleted_for_students === true;
  const batchLabel   = d.target_batch || 'All Batches';

  return `
  <div class="drive-card ${isHidden ? 'is-archived-card' : ''}" style="border-left:4px solid ${isHidden ? '#94a3b8' : (isExpired ? '#ef4444' : '#2563eb')};position:relative;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div>
        <div class="drive-company">${d.company_name}</div>
        <div class="drive-role" style="margin-top:2px;">${d.job_role}</div>
      </div>
      <div class="admin-card-actions">
        <button class="admin-action-icon-btn ${isHidden ? 'restored' : 'deleted'}"
                onclick="toggleStudentVisibility(${d.id}, '${d.company_name.replace(/'/g, "\\'")}', ${isHidden ? 1 : 0})"
                title="${isHidden ? 'Restore for Students (Unhide)' : 'Delete / Hide for Students (Preserve in Admin)'}">
          <i class="fa-solid ${isHidden ? 'fa-eye' : 'fa-trash-can'}"></i>
        </button>
        ${isHidden ? `
          <button class="admin-action-icon-btn perm-delete"
                  onclick="permanentlyDeleteDrive(${d.id}, '${d.company_name.replace(/'/g, "\\'")}')"
                  title="Permanently Delete from Database">
            <i class="fa-solid fa-xmark"></i>
          </button>` : ''}
      </div>
    </div>

    <div class="drive-meta" style="margin-top:10px;">
      <span class="badge badge-blue"><i class="fa-solid fa-indian-rupee-sign"></i> ${d.package_ctc}</span>
      <span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;"><i class="fa-solid fa-graduation-cap"></i> ${batchLabel}</span>
      <span class="badge badge-gray"><i class="fa-solid fa-location-dot"></i> ${d.job_location || 'Flexible'}</span>
      <span class="badge ${isExpired ? 'badge-red' : 'badge-yellow'}">
        <i class="fa-solid fa-calendar"></i> ${deadlineStr}
      </span>
      ${isHidden ? `<span class="badge badge-red" style="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;font-weight:700;"><i class="fa-solid fa-eye-slash"></i> Hidden for Students</span>` : ''}
    </div>

    <div style="font-size:12px;color:#64748b;margin-top:6px;">
      Min CGPA: <strong>${parseFloat(d.min_cgpa || 0).toFixed(1)}</strong> &nbsp;|&nbsp;
      Max Arrears: <strong>${d.max_standing_arrears || 0}</strong> &nbsp;|&nbsp;
      Years: <strong>${d.eligible_years || 'All'}</strong>
    </div>

    ${d.description ? `<p style="font-size:12px;color:#64748b;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:8px;margin-top:6px;">${d.description.slice(0,120)}${d.description.length > 120 ? '…' : ''}</p>` : ''}
  </div>`;
}

// ============================================================
// TOGGLE STUDENT VISIBILITY (SOFT DELETE / RESTORE)
// ============================================================
async function toggleStudentVisibility(driveId, companyName, isCurrentlyHidden) {
  const willHide = !isCurrentlyHidden;

  const promptMsg = willHide
    ? `🗑️ Hide placement drive for "${companyName}" from students?\n\nThis drive will be removed from the Student Dashboard, but will REMAIN visible in the Admin Panel and Database for your batch records.`
    : `👁️ Restore placement drive for "${companyName}"?\n\nThis drive will become visible to students again in their dashboard.`;

  if (!confirm(promptMsg)) return;

  try {
    const res  = await fetch(`${API_BASE}/admin/drives/${driveId}/toggle-visibility`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ is_deleted_for_students: willHide ? 1 : 0 })
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert(data.message, true);
      loadAdminDrives();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to update drive visibility.');
    }
  } catch (err) {
    console.error('Toggle visibility error:', err);
    showAdminAlert('Server error while updating drive status.');
  }
}

// ============================================================
// PERMANENTLY DELETE DRIVE (ADMIN HARD DELETE)
// ============================================================
async function permanentlyDeleteDrive(driveId, companyName) {
  if (!confirm(`⚠️ PERMANENT DELETE: Delete placement drive for "${companyName}" permanently from Database?\n\nThis will remove all stored record of this drive. This action CANNOT be undone.`)) return;

  try {
    const res  = await fetch(`${API_BASE}/admin/drives/${driveId}?action=permanent`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert(`Drive for "${companyName}" permanently deleted.`, true);
      loadAdminDrives();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to delete drive.');
    }
  } catch (err) {
    console.error('Permanent delete drive error:', err);
    showAdminAlert('Server error while deleting drive.');
  }
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
