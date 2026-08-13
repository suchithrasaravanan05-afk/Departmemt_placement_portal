// ============================================================
// ADMIN DASHBOARD JS — RIT CSBS Placement Portal
// ============================================================

const API_BASE = `${window.location.origin}/api`;

let currentAdminToken    = null;
let currentAdminUser     = null;
let currentFetchedStudents = [];

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
function switchAdminTab(tabName) {
  const tabs   = ['students', 'drives', 'applications'];
  const tabMap = { students: 'tabBtnStudents', drives: 'tabBtnDrives', applications: 'tabBtnApplications' };
  const panMap = { students: 'adminTabStudents', drives: 'adminTabDrives', applications: 'adminTabApplications' };

  tabs.forEach(t => {
    el(panMap[t])?.classList.toggle('hidden', t !== tabName);
    el(tabMap[t])?.classList.toggle('active', t === tabName);
  });

  if (tabName === 'students')    fetchStudentRoster();
  if (tabName === 'drives')      loadAdminDrives();
  if (tabName === 'applications') loadApplicationsList();
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

    const yearSuffix = ['','st','nd','rd','th'][s.year] || '';

    return `
    <tr>
      <td><span class="badge badge-blue">${s.year ? s.year + yearSuffix + ' Yr' : '—'}</span></td>
      <td style="font-family:monospace;font-size:12px;">${s.register_number || '—'}</td>
      <td><strong>${s.full_name}</strong></td>
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

  if (year)     chips.push(`Year: ${year}`);
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

  el('studentModalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="detail-item"><span class="detail-label">Register No</span><span class="detail-value">${student.register_number || '—'}</span></div>
      <div class="detail-item"><span class="detail-label">Year</span><span class="detail-value">${student.year ? student.year + ' Year' : '—'}</span></div>
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

  container.innerHTML = `
    <div class="spinner-box">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#94a3b8;"></i>
      <p>Loading drives...</p>
    </div>`;

  try {
    // Reuse student drives endpoint to get all drives (as admin, use user_id=0)
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

    container.innerHTML = `
      <div class="drives-grid">
        ${data.drives.map(d => buildAdminDriveCard(d)).join('')}
      </div>`;
  } catch (err) {
    console.error('Load drives error:', err);
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i><p>Error loading drives.</p></div>`;
  }
}

function buildAdminDriveCard(d) {
  const deadlineStr = d.deadline ? fmtDate(d.deadline) : 'Open';
  const isExpired   = d.deadline && new Date(d.deadline) < new Date();

  return `
  <div class="drive-card" style="border-left:4px solid ${isExpired ? '#ef4444' : '#2563eb'};">
    <div>
      <div class="drive-company">${d.company_name}</div>
      <div class="drive-role" style="margin-top:2px;">${d.job_role}</div>
    </div>
    <div class="drive-meta">
      <span class="badge badge-blue"><i class="fa-solid fa-indian-rupee-sign"></i> ${d.package_ctc}</span>
      <span class="badge badge-gray"><i class="fa-solid fa-location-dot"></i> ${d.job_location || 'Flexible'}</span>
      <span class="badge ${isExpired ? 'badge-red' : 'badge-yellow'}">
        <i class="fa-solid fa-calendar"></i> ${deadlineStr}
      </span>
    </div>
    <div style="font-size:12px;color:#64748b;">
      Min CGPA: <strong>${parseFloat(d.min_cgpa || 0).toFixed(1)}</strong> &nbsp;|&nbsp;
      Max Arrears: <strong>${d.max_standing_arrears || 0}</strong> &nbsp;|&nbsp;
      Years: <strong>${d.eligible_years || 'All'}</strong>
    </div>
    ${d.description ? `<p style="font-size:12px;color:#64748b;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:8px;">${d.description.slice(0,120)}${d.description.length > 120 ? '…' : ''}</p>` : ''}
    <div style="margin-top:auto;text-align:right;">
      <button class="btn btn-danger btn-sm" onclick="deleteDrive(${d.id}, '${d.company_name.replace(/'/g, "\\'")}')">
        <i class="fa-solid fa-trash"></i> Delete Drive
      </button>
    </div>
  </div>`;
}

// ============================================================
// DELETE DRIVE
// ============================================================
async function deleteDrive(driveId, companyName) {
  if (!confirm(`Delete the placement drive for ${companyName}?\n\nAll applications for this drive will also be removed.`)) return;

  try {
    const res  = await fetch(`${API_BASE}/admin/drives/${driveId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert(`Drive for "${companyName}" deleted.`, true);
      loadAdminDrives();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to delete drive.');
    }
  } catch (err) {
    console.error('Delete drive error:', err);
    showAdminAlert('Server error while deleting drive.');
  }
}

// ============================================================
// LOAD APPLICATIONS
// ============================================================
async function loadApplicationsList() {
  const tbody = el('applicationsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:30px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res  = await fetch(`${API_BASE}/admin/applications`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.applications || data.applications.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="9" class="text-center" style="padding:40px;">
          <i class="fa-solid fa-inbox" style="font-size:28px;color:#94a3b8;display:block;margin-bottom:8px;"></i>
          <span style="color:#64748b;font-weight:600;">No applications yet.</span>
        </td></tr>`;
      return;
    }

    const statusMap = {
      'Applied':     'status-applied',
      'Shortlisted': 'status-shortlisted',
      'Selected':    'status-selected',
      'Rejected':    'status-rejected'
    };

    tbody.innerHTML = data.applications.map(app => {
      const resumeHtml = app.resume_file
        ? `<a href="${app.resume_file.startsWith('http') ? app.resume_file : window.location.origin + app.resume_file}"
               target="_blank" class="btn btn-success btn-sm" style="padding:4px 8px;font-size:11px;">
            <i class="fa-solid fa-download"></i>
           </a>`
        : '<span style="color:#94a3b8;font-size:11px;">—</span>';

      return `
      <tr>
        <td>
          <strong>${app.company_name}</strong>
          <div style="font-size:11px;color:#64748b;">${app.job_role} — ${app.package_ctc}</div>
        </td>
        <td><strong>${app.full_name}</strong></td>
        <td style="font-family:monospace;font-size:12px;">${app.register_number || '—'}</td>
        <td>${app.year ? app.year + ' Yr' : '—'}</td>
        <td><strong style="color:#2563eb;">${app.cgpa ? parseFloat(app.cgpa).toFixed(2) : '—'}</strong></td>
        <td><span class="badge ${parseInt(app.standing_arrears_count || 0) > 0 ? 'badge-red' : 'badge-green'}">${app.standing_arrears_count || 0}</span></td>
        <td>${resumeHtml}</td>
        <td>
          <span class="status-pill ${statusMap[app.status] || 'status-applied'}">${app.status}</span>
        </td>
        <td>
          <select
            class="form-control"
            style="padding:5px 8px;font-size:12px;min-width:130px;"
            onchange="updateAppStatus(${app.app_id}, this.value, this)">
            <option value="">Change Status…</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Applications load error:', err);
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:30px;color:#ef4444;">Error loading applications.</td></tr>`;
  }
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
