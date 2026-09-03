// ============================================================
// ADMIN DASHBOARD JS — RIT CSBS Placement Portal
// ============================================================

const API_BASE = `${window.location.origin}/api`;

let currentAdminToken    = null;
let currentAdminUser     = null;
let currentFetchedStudents = [];
let currentPlacedStudents  = [];
let currentFetchedApplications = [];

// Global portal settings object with robust defaults
let portalSettings = {
  default_year: '2023-2027',
  default_year_num: 4,
  batches: [
    { id: 1, name: '2026-2030', year_num: 1, year_label: '1st Year', status: 'active', is_default: false },
    { id: 2, name: '2025-2029', year_num: 2, year_label: '2nd Year', status: 'active', is_default: false },
    { id: 3, name: '2024-2028', year_num: 3, year_label: '3rd Year', status: 'active', is_default: false },
    { id: 4, name: '2023-2027', year_num: 4, year_label: '4th Year', status: 'active', is_default: true },
    { id: 5, name: '2022-2026', year_num: 5, year_label: 'Passed Out', status: 'passed_out', is_default: false }
  ]
};

function getBatchMap() {
  const map = {};
  if (portalSettings && Array.isArray(portalSettings.batches)) {
    portalSettings.batches.forEach(b => {
      const isDef = (b.name === portalSettings.default_year);
      const defTag = isDef ? ' (Default Year)' : '';
      if (b.year_num) {
        if (b.status === 'passed_out' || b.year_num === 5) {
          map[b.year_num] = `${b.name} (Passed Out)${defTag}`;
        } else {
          map[b.year_num] = `${b.name}${defTag}`;
        }
      }
    });
  }
  if (!map[4]) map[4] = '2023-2027 (Default Year)';
  if (!map[5]) map[5] = '2022-2026 (Passed Out)';
  return map;
}

function getYearLabels() {
  const labels = {};
  if (portalSettings && Array.isArray(portalSettings.batches)) {
    portalSettings.batches.forEach(b => {
      if (b.year_num) {
        labels[b.year_num] = (b.status === 'passed_out' || b.year_num === 5) ? `${b.name} (Passed Out)` : b.name;
      }
    });
  }
  if (!labels[1]) labels[1] = '2026-2030';
  if (!labels[2]) labels[2] = '2025-2029';
  if (!labels[3]) labels[3] = '2024-2028';
  if (!labels[4]) labels[4] = '2023-2027';
  if (!labels[5]) labels[5] = '2022-2026 (Passed Out)';
  return labels;
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  currentAdminToken = localStorage.getItem('token');
  currentAdminUser  = safeParseUser();

  if (!currentAdminToken || !currentAdminUser || currentAdminUser.role !== 'admin') {
    window.location.href = 'Form.html';
    return;
  }

  el('adminUserName').innerText = currentAdminUser.full_name || 'Placement Admin';

  // Load Portal Settings first so batch dropdowns and default year are applied across all pages
  await loadPortalSettings();

  loadDashboardStats();
  fetchStudentRoster();
  loadAnalyticsCharts();
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
  const tabs   = ['analytics', 'students', 'drives', 'applications', 'placed', 'settings'];
  const tabMap = { analytics: 'tabBtnAnalytics', students: 'tabBtnStudents', drives: 'tabBtnDrives', applications: 'tabBtnApplications', placed: 'tabBtnPlaced', settings: 'tabBtnSettings' };
  const panMap = { analytics: 'adminTabAnalytics', students: 'adminTabStudents', drives: 'adminTabDrives', applications: 'adminTabApplications', placed: 'adminTabPlaced', settings: 'adminTabSettings' };

  tabs.forEach(t => {
    el(panMap[t])?.classList.toggle('hidden', t !== tabName);
    el(tabMap[t])?.classList.toggle('active', t === tabName);
  });

  if (tabName === 'analytics')    loadAnalyticsCharts();
  if (tabName === 'students')     fetchStudentRoster();
  if (tabName === 'drives')       loadAdminDrives();
  if (tabName === 'applications') {
    if (initialStatusFilter !== null && el('filterAppStatus')) {
      el('filterAppStatus').value = initialStatusFilter;
    }
    loadApplicationsList();
  }
  if (tabName === 'placed')       loadPlacedStudents();
  if (tabName === 'settings')     renderSettingsTab();
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
// ANALYTICS CHARTS (EXECUTIVE PLACEMENT ANALYTICS)
// ============================================================
let _chartPlacedNonPlaced   = null;
let _chartPlacementInterest = null;
let _chartCompanyStats      = null;
let _chartTechNonTechYear   = null;

// Raw data cache for dropdown re-render
let _analyticsPlacedNonPlacedData = [];

async function loadAnalyticsCharts() {
  const btn = el('analyticsRefreshBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...'; }
  try {
    await Promise.all([
      loadChartPlacedNonPlaced(),
      loadChartPlacementInterest(),
      loadChartCompanyStats(),
      loadChartTechNonTechYear()
    ]);
  } catch (e) {
    console.warn('Analytics load error:', e);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh'; }
}

/* ─── Helper: classify role ─── */
function isTechnicalRole(role) {
  const kws = ['software','developer','engineer','data','analyst','devops','cloud','ai','ml',
    'machine learning','network','cyber','security','backend','frontend','full stack','fullstack',
    'embedded','iot','information technology','programmer','coding','architect','qa','testing',
    'automation','blockchain','java','python','react','angular','node','ui/ux','technical'];
  const r = (role || '').toLowerCase();
  return kws.some(k => r.includes(k));
}

/* ─── Helper: destroy chart safely ─── */
function destroyChart(ref) { if (ref) { try { ref.destroy(); } catch(_){} } return null; }

/* ─── Chart typography & grid defaults ─── */
const CHART_FONT = { family: "'Plus Jakarta Sans', -apple-system, sans-serif" };
const GRID_COLOR = 'rgba(241, 245, 249, 0.9)';

/* ══════════════════════════════════════════════════════════
   CHART 1 — Placed vs Non-Placed Students (Year-wise)
   ══════════════════════════════════════════════════════════ */
async function loadChartPlacedNonPlaced() {
  try {
    const res  = await fetch(`${API_BASE}/admin/analytics/placed-nonplaced`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    _analyticsPlacedNonPlacedData = data.success ? (data.rows || []) : [];
    renderPlacedNonPlacedChart(_analyticsPlacedNonPlacedData);
  } catch (e) {
    console.warn('Chart 1 error:', e);
    renderPlacedNonPlacedChart([]);
  }
}

function updatePlacedNonPlacedChart() {
  const filterVal = el('filterPlacedNonPlacedYear')?.value || 'all';
  let rows = _analyticsPlacedNonPlacedData;
  if (filterVal !== 'all') {
    rows = rows.filter(r => String(r.year) === filterVal);
  }
  renderPlacedNonPlacedChart(rows, filterVal);
}

function renderPlacedNonPlacedChart(rows, filterVal = 'all') {
  const canvas = el('chartPlacedNonPlaced');
  if (!canvas) return;

  const yearLabels = getYearLabels();

  let labels, placed, nonPlaced;

  if (filterVal !== 'all' && rows.length === 1) {
    const r = rows[0];
    const p = parseInt(r.placed_count || 0);
    const t = parseInt(r.total_count || 0);
    labels    = [yearLabels[r.year] || `Year ${r.year}`];
    placed    = [p];
    nonPlaced = [Math.max(0, t - p)];
  } else {
    labels    = rows.map(r => yearLabels[r.year] || `Year ${r.year}`);
    placed    = rows.map(r => parseInt(r.placed_count || 0));
    nonPlaced = rows.map(r => Math.max(0, parseInt(r.total_count || 0) - parseInt(r.placed_count || 0)));
  }

  // Update Stat Pills
  const totalPlaced = placed.reduce((s, v) => s + v, 0);
  const totalNonPlaced = nonPlaced.reduce((s, v) => s + v, 0);
  const grandTotal = totalPlaced + totalNonPlaced;
  const placedRate = grandTotal > 0 ? ((totalPlaced / grandTotal) * 100).toFixed(1) : '0.0';

  if (el('pillPlacedTotal'))    el('pillPlacedTotal').innerText    = totalPlaced;
  if (el('pillNonPlacedTotal')) el('pillNonPlacedTotal').innerText = totalNonPlaced;
  if (el('pillPlacedRate'))     el('pillPlacedRate').innerText     = `${placedRate}%`;

  _chartPlacedNonPlaced = destroyChart(_chartPlacedNonPlaced);
  _chartPlacedNonPlaced = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Placed Students',
          data: placed,
          backgroundColor: 'rgba(37, 99, 235, 0.88)',
          borderColor: '#2563eb',
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55,
          categoryPercentage: 0.7
        },
        {
          label: 'Non-Placed Students',
          data: nonPlaced,
          backgroundColor: 'rgba(226, 232, 240, 0.95)',
          borderColor: '#cbd5e1',
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { ...CHART_FONT, size: 12, weight: '700' },
          bodyFont: { ...CHART_FONT, size: 12 },
          padding: 10,
          cornerRadius: 8,
          mode: 'index',
          intersect: false,
          callbacks: {
            footer: items => `Total: ${items.reduce((s,i)=>s+i.parsed.y,0)} students`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { ...CHART_FONT, size: 11, weight: '700' }, color: '#475569' }
        },
        y: {
          beginAtZero: true,
          grid: { color: GRID_COLOR },
          ticks: { font: { ...CHART_FONT, size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 }
        }
      },
      animation: { duration: 750, easing: 'easeInOutQuart' }
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CHART 2 — Placement Interest (Willingness Breakdown)
   ══════════════════════════════════════════════════════════ */
async function loadChartPlacementInterest() {
  try {
    const res  = await fetch(`${API_BASE}/admin/analytics/placement-interest`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();

    const total         = parseInt(data.total || 0);
    const interested    = parseInt(data.interested || data.applied || 0);
    const notInterested = parseInt(data.not_interested || 0);
    const pending       = Math.max(0, total - (interested + notInterested));

    const cEl = el('cstatTotalStudents');
    if (cEl) cEl.textContent = total || '0';

    if (el('pillInterestedCount'))    el('pillInterestedCount').innerText    = interested;
    if (el('pillNotInterestedCount')) el('pillNotInterestedCount').innerText = notInterested + (pending > 0 ? ` (${pending} pending)` : '');

    const canvas = el('chartPlacementInterest');
    if (!canvas) return;

    _chartPlacementInterest = destroyChart(_chartPlacementInterest);
    _chartPlacementInterest = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Interested in Placements', 'Opted Out / Not Interested', 'Pending Decision'],
        datasets: [{
          data: [interested, notInterested, pending],
          backgroundColor: [
            'rgba(16, 185, 129, 0.9)',
            'rgba(244, 63, 94, 0.9)',
            'rgba(203, 213, 225, 0.85)'
          ],
          borderColor: ['#10b981', '#f43f5e', '#cbd5e1'],
          borderWidth: 2,
          hoverOffset: 8,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { ...CHART_FONT, size: 12, weight: '700' },
            bodyFont: { ...CHART_FONT, size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} student${ctx.parsed !== 1 ? 's' : ''}`
            }
          }
        },
        animation: { animateRotate: true, duration: 850, easing: 'easeInOutQuart' }
      }
    });
  } catch (e) { console.warn('Chart 2 error:', e); }
}

/* ══════════════════════════════════════════════════════════
   CHART 3 — Company-wise: Eligible / Registered / Placed
   ══════════════════════════════════════════════════════════ */
async function loadChartCompanyStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/company-stats`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    const rows = data.success ? (data.rows || []) : [];

    const labels     = rows.map(r => (r.company_name || 'Company').substring(0, 14));
    const eligible   = rows.map(r => parseInt(r.eligible   || 0));
    const registered = rows.map(r => parseInt(r.registered || 0));
    const placed     = rows.map(r => parseInt(r.placed     || 0));

    const canvas = el('chartCompanyStats');
    if (!canvas) return;

    _chartCompanyStats = destroyChart(_chartCompanyStats);
    _chartCompanyStats = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Eligible Pool',
            data: eligible,
            backgroundColor: 'rgba(6, 182, 212, 0.85)',
            borderColor: '#0891b2',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.75
          },
          {
            label: 'Registered Applicants',
            data: registered,
            backgroundColor: 'rgba(139, 92, 246, 0.85)',
            borderColor: '#8b5cf6',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.75
          },
          {
            label: 'Selected Offers',
            data: placed,
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.75
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { ...CHART_FONT, size: 12, weight: '700' },
            bodyFont: { ...CHART_FONT, size: 12 },
            padding: 10,
            cornerRadius: 8,
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { ...CHART_FONT, size: 11, weight: '600' }, color: '#475569', maxRotation: 25 }
          },
          y: {
            beginAtZero: true,
            grid: { color: GRID_COLOR },
            ticks: { font: { ...CHART_FONT, size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 }
          }
        },
        animation: { duration: 750, easing: 'easeInOutQuart' }
      }
    });
  } catch (e) { console.warn('Chart 3 error:', e); }
}

/* ══════════════════════════════════════════════════════════
   CHART 4 — Year-wise: Technical vs Non-Technical Placed
   ══════════════════════════════════════════════════════════ */
async function loadChartTechNonTechYear() {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/tech-nontech-year`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    const rows = data.success ? (data.rows || []) : [];

    // Build year → { tech, nonTech } map
    const yearMap = { 1: { tech: 0, nonTech: 0 }, 2: { tech: 0, nonTech: 0 }, 3: { tech: 0, nonTech: 0 }, 4: { tech: 0, nonTech: 0 }, 5: { tech: 0, nonTech: 0 } };
    rows.forEach(r => {
      const y = parseInt(r.year) || 4;
      if (!yearMap[y]) yearMap[y] = { tech: 0, nonTech: 0 };
      const cnt = parseInt(r.cnt || 1);
      if (isTechnicalRole(r.job_role)) yearMap[y].tech    += cnt;
      else                             yearMap[y].nonTech += cnt;
    });

    const yearLabels = getYearLabels();
    const sortedYears = [1, 2, 3, 4, 5];
    const labels  = sortedYears.map(y => yearLabels[y]);
    const tech    = sortedYears.map(y => yearMap[y].tech);
    const nonTech = sortedYears.map(y => yearMap[y].nonTech);

    const canvas = el('chartTechNonTechYear');
    if (!canvas) return;

    _chartTechNonTechYear = destroyChart(_chartTechNonTechYear);
    _chartTechNonTechYear = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Technical Roles',
            data: tech,
            backgroundColor: 'rgba(99, 102, 241, 0.88)',
            borderColor: '#6366f1',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7
          },
          {
            label: 'Non-Technical Roles',
            data: nonTech,
            backgroundColor: 'rgba(251, 113, 133, 0.88)',
            borderColor: '#fb7185',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { ...CHART_FONT, size: 12, weight: '700' },
            bodyFont: { ...CHART_FONT, size: 12 },
            padding: 10,
            cornerRadius: 8,
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { ...CHART_FONT, size: 11, weight: '700' }, color: '#475569' }
          },
          y: {
            beginAtZero: true,
            grid: { color: GRID_COLOR },
            ticks: { font: { ...CHART_FONT, size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 }
          }
        },
        animation: { duration: 750, easing: 'easeInOutQuart' }
      }
    });
  } catch (e) { console.warn('Chart 4 error:', e); }
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
    <tr><td colspan="12" class="text-center" style="padding:30px;">
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
        <tr><td colspan="12" class="text-center" style="padding:40px;">
          <i class="fa-solid fa-magnifying-glass" style="font-size:28px;color:#94a3b8;display:block;margin-bottom:8px;"></i>
          <span style="color:#64748b;font-weight:600;">No students found matching the filters.</span>
        </td></tr>`;
      return;
    }

    currentFetchedStudents = data.students;
    renderStudentRoster(data.students, tbody);
  } catch (err) {
    console.error('Roster fetch error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding:30px;color:#ef4444;">Error loading roster. Check network connection.</td></tr>`;
  }
}

function getFullFileUrl(pathStr) {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${window.location.origin}${cleanPath}`;
}

function renderStudentRoster(students, tbody) {
  const BATCH_MAP = getBatchMap();

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

    const sYr = parseInt(s.year);
    const isPassedOut = (sYr === 5 || String(s.year).toLowerCase().includes('passed'));
    const yearStr = isPassedOut
      ? `<span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;border:1px solid #d8b4fe;white-space:nowrap;">${BATCH_MAP[5] || 'Passed Out'}</span>`
      : (BATCH_MAP[sYr] ? `<span class="badge badge-blue" style="white-space:nowrap;">${BATCH_MAP[sYr]}</span>` : (s.year ? `${s.year} Yr` : '—'));

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
      <td>
        <button class="btn btn-outline-primary btn-sm"
          onclick="viewStudentModal(${JSON.stringify(s).replace(/"/g, '&quot;')})"
          title="View Student Profile"
          style="padding:4px 9px;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </td>
      <td>${resumeHtml}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <button
            onclick="openEditStudentModal(${s.user_id})"
            class="btn btn-primary btn-sm"
            title="Edit Student Profile & Login Details"
            style="padding:4px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button
            onclick="deleteStudent(${s.user_id}, '${s.full_name.replace(/'/g, "\\'")}')"
            class="btn btn-danger btn-sm"
            title="Delete Student Profile"
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

// ============================================================
// ADD NEW STUDENT MODAL (ADMIN DIRECT ACCOUNT CREATION)
// ============================================================
function openAddStudentModal() {
  const form = el('addStudentForm');
  if (form) form.reset();

  const pwInput = el('addStudentPassword');
  if (pwInput) pwInput.type = 'password';
  const icon = el('addPwToggleIcon');
  if (icon) icon.className = 'fa-solid fa-eye';

  // Set default batch year if available
  const defaultYear = portalSettings?.default_year_num || 4;
  if (el('addStudentYear')) el('addStudentYear').value = String(defaultYear);

  el('addStudentModal').classList.remove('hidden');
}

function closeAddStudentModal() {
  el('addStudentModal').classList.add('hidden');
}

function syncDefaultPassword() {
  const regNo = el('addStudentRegNo')?.value.trim() || '';
  const pwInput = el('addStudentPassword');
  if (pwInput && (!pwInput.dataset.manualEdit || pwInput.value === '')) {
    pwInput.value = regNo;
  }
}

function toggleAddPasswordVisibility() {
  const pwInput = el('addStudentPassword');
  const icon = el('addPwToggleIcon');
  if (!pwInput) return;
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    pwInput.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
}

async function handleAddStudentSubmit(e) {
  e.preventDefault();

  const btn = el('saveAddStudentBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Student Account...'; }

  const payload = {
    full_name: el('addStudentFullName')?.value.trim(),
    register_number: el('addStudentRegNo')?.value.trim(),
    email: el('addStudentEmail')?.value.trim().toLowerCase(),
    password: el('addStudentPassword')?.value.trim(),
    year: parseInt(el('addStudentYear')?.value || 4),
    phone: el('addStudentPhone')?.value.trim(),
    tenth_percentage: el('addStudentTenth')?.value || null,
    twelth_percentage: el('addStudentTwelth')?.value || null,
    diploma_percentage: el('addStudentDiploma')?.value || null,
    cgpa: el('addStudentCgpa')?.value || 0,
    standing_arrears_count: parseInt(el('addStudentStandingArrears')?.value || 0),
    history_arrears_count: parseInt(el('addStudentHistoryArrears')?.value || 0),
    domain_interest: el('addStudentDomain')?.value.trim() || 'General',
    linkedin_link: el('addStudentLinkedin')?.value.trim() || null,
    github_link: el('addStudentGithub')?.value.trim() || null
  };

  try {
    const res = await fetch(`${API_BASE}/admin/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showAdminAlert(data.message || 'Student account created successfully!', true);
      closeAddStudentModal();
      fetchStudentRoster();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to create student account.');
    }
  } catch (err) {
    console.error('Add student error:', err);
    showAdminAlert('Network or server error while creating student account.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Student Account';
    }
  }
}

// ============================================================
// EDIT STUDENT DETAILS MODAL (ADMIN MODIFY)
// ============================================================
async function openEditStudentModal(userId) {
  const form = el('editStudentForm');
  if (form) form.reset();

  const pwInput = el('editStudentNewPassword');
  if (pwInput) pwInput.type = 'password';
  const icon = el('editPwToggleIcon');
  if (icon) icon.className = 'fa-solid fa-eye';

  el('editStudentUserId').value = userId;
  el('editStudentModal').classList.remove('hidden');

  const btn = el('saveEditStudentBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading details...'; }

  try {
    const res = await fetch(`${API_BASE}/admin/students/${userId}`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();

    if (!data.success || !data.student) {
      showAdminAlert(data.message || 'Failed to load student details.');
      closeEditStudentModal();
      return;
    }

    const s = data.student;

    if (el('editStudentFullName'))  el('editStudentFullName').value  = s.full_name || '';
    if (el('editStudentRegNo'))     el('editStudentRegNo').value     = s.register_number || '';
    if (el('editStudentEmail'))     el('editStudentEmail').value     = s.email || s.college_email || '';
    if (el('editStudentYear'))      el('editStudentYear').value      = String(s.year || 4);
    if (el('editStudentPhone'))     el('editStudentPhone').value     = s.phone || s.phone_number || '';

    if (el('editStudentTenth'))     el('editStudentTenth').value     = s.tenth_percentage ?? '';
    if (el('editStudentTwelth'))    el('editStudentTwelth').value    = s.twelth_percentage ?? '';
    if (el('editStudentDiploma'))   el('editStudentDiploma').value   = s.diploma_percentage ?? '';
    if (el('editStudentCgpa'))      el('editStudentCgpa').value      = s.cgpa ?? '';

    // Semester GPAs
    for (let i = 1; i <= 8; i++) {
      const semEl = el(`editStudentSem${i}`);
      if (semEl) semEl.value = s[`sem${i}_gpa`] ?? '';
    }

    if (el('editStudentStandingArrears')) el('editStudentStandingArrears').value = s.standing_arrears_count ?? 0;
    if (el('editStudentHistoryArrears'))  el('editStudentHistoryArrears').value  = s.history_arrears_count ?? 0;
    if (el('editStudentDomain'))          el('editStudentDomain').value          = s.domain_interest || '';
    if (el('editStudentLinkedin'))        el('editStudentLinkedin').value        = s.linkedin_link || '';
    if (el('editStudentGithub'))          el('editStudentGithub').value          = s.github_link || '';

  } catch (err) {
    console.error('Error opening edit student modal:', err);
    showAdminAlert('Failed to load student details.');
    closeEditStudentModal();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Student Details';
    }
  }
}

function closeEditStudentModal() {
  el('editStudentModal').classList.add('hidden');
}

function toggleEditPasswordVisibility() {
  const pwInput = el('editStudentNewPassword');
  const icon = el('editPwToggleIcon');
  if (!pwInput) return;
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    pwInput.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
}

function calcEditStudentCgpa() {
  let total = 0, count = 0;
  for (let i = 1; i <= 8; i++) {
    const semVal = parseFloat(el(`editStudentSem${i}`)?.value);
    if (!isNaN(semVal) && semVal > 0) {
      total += semVal;
      count++;
    }
  }
  if (count > 0 && el('editStudentCgpa')) {
    el('editStudentCgpa').value = (total / count).toFixed(2);
  }
}

async function handleEditStudentSubmit(e) {
  e.preventDefault();

  const userId = el('editStudentUserId')?.value;
  if (!userId) return;

  const btn = el('saveEditStudentBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving changes...'; }

  const payload = {
    full_name: el('editStudentFullName')?.value.trim(),
    register_number: el('editStudentRegNo')?.value.trim(),
    email: el('editStudentEmail')?.value.trim().toLowerCase(),
    password: el('editStudentNewPassword')?.value.trim() || undefined,
    year: parseInt(el('editStudentYear')?.value || 4),
    phone: el('editStudentPhone')?.value.trim(),
    tenth_percentage: el('editStudentTenth')?.value || null,
    twelth_percentage: el('editStudentTwelth')?.value || null,
    diploma_percentage: el('editStudentDiploma')?.value || null,
    cgpa: el('editStudentCgpa')?.value || 0,
    standing_arrears_count: parseInt(el('editStudentStandingArrears')?.value || 0),
    history_arrears_count: parseInt(el('editStudentHistoryArrears')?.value || 0),
    domain_interest: el('editStudentDomain')?.value.trim() || 'General',
    linkedin_link: el('editStudentLinkedin')?.value.trim() || null,
    github_link: el('editStudentGithub')?.value.trim() || null,
    sem1_gpa: el('editStudentSem1')?.value || null,
    sem2_gpa: el('editStudentSem2')?.value || null,
    sem3_gpa: el('editStudentSem3')?.value || null,
    sem4_gpa: el('editStudentSem4')?.value || null,
    sem5_gpa: el('editStudentSem5')?.value || null,
    sem6_gpa: el('editStudentSem6')?.value || null,
    sem7_gpa: el('editStudentSem7')?.value || null,
    sem8_gpa: el('editStudentSem8')?.value || null
  };

  try {
    const res = await fetch(`${API_BASE}/admin/students/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showAdminAlert(data.message || 'Student details updated successfully!', true);
      closeEditStudentModal();
      fetchStudentRoster();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to update student details.');
    }
  } catch (err) {
    console.error('Update student error:', err);
    showAdminAlert('Network or server error while updating student details.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Student Details';
    }
  }
}

// Close modals on overlay click
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'studentModal') closeStudentModal();
  if (e.target && e.target.id === 'addStudentModal') closeAddStudentModal();
  if (e.target && e.target.id === 'editStudentModal') closeEditStudentModal();
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
  const defaultBatch = (portalSettings && portalSettings.default_year) ? portalSettings.default_year : '2023-2027';
  const batchFilter = batchSelect ? batchSelect.value : defaultBatch;

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
    if (batchFilter && batchFilter !== 'All Batches') {
      drivesToRender = data.drives.filter(d => {
        const b = d.target_batch || '';
        return !b || b === 'All Batches' || b === batchFilter || (batchFilter === defaultBatch && (!d.target_batch || d.target_batch === 'All Batches' || d.target_batch === defaultBatch));
      });
    }

    if (drivesToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <i class="fa-solid fa-filter" style="color:#94a3b8;font-size:36px;margin-bottom:12px;"></i>
          <p style="font-weight:600;color:#475569;">No active drives for batch "${escapeHtml(batchFilter)}".</p>
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
// COMPANY BRAND LOGOS GENERATOR (SVG / VECTOR EMBLEMS)
// ============================================================
function getCompanyLogoHtml(name) {
  const norm = (name || '').trim().toLowerCase();

  // Zoho Corporation
  if (norm.includes('zoho')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#ffffff;border:1px solid #e2e8f0;padding:4px;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <rect width="44" height="44" x="4" y="4" rx="10" fill="#E52520"/>
        <rect width="44" height="44" x="52" y="4" rx="10" fill="#43A047"/>
        <rect width="44" height="44" x="4" y="52" rx="10" fill="#1E88E5"/>
        <rect width="44" height="44" x="52" y="52" rx="10" fill="#FBC02D"/>
        <text x="50" y="69" font-size="54" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">Z</text>
      </svg>
    </div>`;
  }

  // Tata Consultancy Services (TCS)
  if (norm.includes('tcs') || norm.includes('tata consultancy')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:linear-gradient(135deg, #001F54 0%, #0A2540 100%);">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="58" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="1" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">TCS</text>
        <circle cx="82" cy="48" r="4.5" fill="#00D4B2"/>
        <rect x="20" y="68" width="60" height="4" rx="2" fill="#E63946"/>
      </svg>
    </div>`;
  }

  // Cognizant / CTS / GenC
  if (norm.includes('cognizant') || norm.includes('cts') || norm.includes('genc')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:linear-gradient(135deg, #0033A0 0%, #001A57 100%);">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <path d="M 70 30 C 58 18, 32 20, 24 38 C 14 56, 20 74, 38 80 C 54 86, 68 76, 74 62" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"/>
        <circle cx="72" cy="30" r="7" fill="#00B2E2"/>
      </svg>
    </div>`;
  }

  // Infosys
  if (norm.includes('infosys') || norm.includes('infy')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:linear-gradient(135deg, #007CC3 0%, #005A9C 100%);">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="62" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">infy</text>
      </svg>
    </div>`;
  }

  // Wipro
  if (norm.includes('wipro')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:linear-gradient(135deg, #2E1A47 0%, #170928 100%);">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <circle cx="50" cy="50" r="32" fill="none" stroke="#502C82" stroke-width="4"/>
        <circle cx="34" cy="36" r="6" fill="#E40046"/>
        <circle cx="66" cy="36" r="6" fill="#F36C21"/>
        <circle cx="66" cy="64" r="6" fill="#00A88F"/>
        <circle cx="34" cy="64" r="6" fill="#009CDE"/>
        <text x="50" y="58" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">W</text>
      </svg>
    </div>`;
  }

  // Accenture
  if (norm.includes('accenture')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#000000;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <path d="M 32 28 L 64 50 L 32 72" fill="none" stroke="#A100FF" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
  }

  // Amazon / AWS
  if (norm.includes('amazon') || norm.includes('aws')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#131921;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="52" font-size="40" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">a</text>
        <path d="M 26 68 Q 50 82 74 68" fill="none" stroke="#FF9900" stroke-width="6" stroke-linecap="round"/>
        <path d="M 70 64 L 76 68 L 70 72" fill="#FF9900"/>
      </svg>
    </div>`;
  }

  // Microsoft
  if (norm.includes('microsoft')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#ffffff;border:1px solid #e2e8f0;padding:6px;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <rect x="18" y="18" width="28" height="28" fill="#F25022"/>
        <rect x="54" y="18" width="28" height="28" fill="#7FBA00"/>
        <rect x="18" y="54" width="28" height="28" fill="#00A4EF"/>
        <rect x="54" y="54" width="28" height="28" fill="#FFB900"/>
      </svg>
    </div>`;
  }

  // Google
  if (norm.includes('google')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#ffffff;border:1px solid #e2e8f0;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="69" font-size="58" font-weight="900" fill="#4285F4" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">G</text>
      </svg>
    </div>`;
  }

  // IBM
  if (norm.includes('ibm')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#006699;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="60" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="2" text-anchor="middle" font-family="monospace">IBM</text>
      </svg>
    </div>`;
  }

  // Capgemini
  if (norm.includes('capgemini')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#0070AD;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="64" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">♠</text>
      </svg>
    </div>`;
  }

  // Tech Mahindra
  if (norm.includes('tech mahindra') || norm.includes('mahindra')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#E31B23;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="58" font-size="32" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">TM</text>
      </svg>
    </div>`;
  }

  // HCL / HCLTech
  if (norm.includes('hcl')) {
    return `<div class="pro-company-avatar" title="${escapeHtml(name)}" style="background:#005696;">
      <svg viewBox="0 0 100 100" class="brand-svg">
        <text x="50" y="60" font-size="32" font-weight="900" fill="#ffffff" letter-spacing="1" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif">HCL</text>
      </svg>
    </div>`;
  }

  // Bespoke 2-letter Monogram Avatar with deterministic color gradient
  const initials = (name || 'CO')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'CO';
  const avatarBg = getCompanyAvatarColor(name);

  return `<div class="pro-company-avatar custom-brand" style="background: ${avatarBg};" title="${escapeHtml(name)}">
    ${initials}
  </div>`;
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
  const logoHtml      = getCompanyLogoHtml(companyName);
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
        ${logoHtml}
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
    let res = await fetch(`${API_BASE}/admin/drives/${driveId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok && res.status !== 400) {
      res = await fetch(`${API_BASE}/admin/drives/${driveId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${currentAdminToken}`
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();

    if (data.success) {
      closeEditDriveModal();
      showAdminAlert(`✅ Placement drive for "${payload.company_name}" updated successfully! Changes are live across Admin and Student portals.`, true);
      loadAdminDrives();
      loadDashboardStats();
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

    el('eligibleTotalCount').innerText       = s.total_eligible;
    el('eligibleAppliedCount').innerText     = s.applied_count;
    if (el('eligibleShortlistedCount')) el('eligibleShortlistedCount').innerText = s.shortlisted_count || 0;
    if (el('eligiblePlacedCount'))      el('eligiblePlacedCount').innerText      = s.placed_count || 0;
    el('eligibleUnappliedCount').innerText   = s.unapplied_count;

    el('pillCountAll').innerText         = s.total_eligible;
    el('pillCountApplied').innerText     = s.applied_count;
    if (el('pillCountShortlisted')) el('pillCountShortlisted').innerText = s.shortlisted_count || 0;
    if (el('pillCountPlaced'))      el('pillCountPlaced').innerText      = s.placed_count || 0;
    el('pillCountUnapplied').innerText   = s.unapplied_count;

    filterEligibleModalList('all');
  } catch (err) {
    console.error('Eligible students error:', err);
    el('eligibleStudentsTableBody').innerHTML = `
      <tr><td colspan="10" class="text-center" style="padding:30px;color:#ef4444;">Network error while fetching eligible students.</td></tr>`;
  }
}

function closeDriveEligibleModal() {
  const modal = el('driveEligibleModal');
  if (modal) modal.classList.add('hidden');
  currentEligibleData = null;
}

function filterEligibleModalList(filterType) {
  currentEligibleFilter = filterType;

  ['btnFilterAllEligible', 'btnFilterAppliedEligible', 'btnFilterShortlistedEligible', 'btnFilterPlacedEligible', 'btnFilterUnappliedEligible'].forEach(id => {
    const btn = el(id);
    if (btn) {
      btn.className = 'btn btn-sm btn-outline';
    }
  });

  if (filterType === 'all' && el('btnFilterAllEligible')) {
    el('btnFilterAllEligible').className = 'btn btn-sm btn-primary';
  } else if (filterType === 'applied' && el('btnFilterAppliedEligible')) {
    el('btnFilterAppliedEligible').className = 'btn btn-sm btn-success';
  } else if (filterType === 'shortlisted' && el('btnFilterShortlistedEligible')) {
    el('btnFilterShortlistedEligible').className = 'btn btn-sm btn-primary';
  } else if (filterType === 'placed' && el('btnFilterPlacedEligible')) {
    el('btnFilterPlacedEligible').className = 'btn btn-sm btn-success';
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
  if (currentEligibleFilter === 'applied')     list = currentEligibleData.students.applied || [];
  if (currentEligibleFilter === 'shortlisted') list = currentEligibleData.students.shortlisted || [];
  if (currentEligibleFilter === 'placed')      list = currentEligibleData.students.placed || [];
  if (currentEligibleFilter === 'unapplied')   list = currentEligibleData.students.unapplied || [];

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
        <td colspan="10" class="text-center" style="padding:32px;color:#94a3b8;">
          <i class="fa-solid fa-users-slash" style="font-size:24px;margin-bottom:6px;"></i>
          <p>No eligible students match this view / search.</p>
        </td>
      </tr>`;
    return;
  }

  const driveId = currentEligibleData.drive ? currentEligibleData.drive.id : null;

  tbody.innerHTML = list.map((s, idx) => {
    const rawSt = (s.application_status || '').toLowerCase();
    let statusPill = '';
    if (!s.is_applied) {
      statusPill = `<span class="badge badge-yellow" style="font-weight:700;"><i class="fa-solid fa-clock"></i> Not Applied</span>`;
    } else if (rawSt === 'selected' || rawSt === 'placed') {
      statusPill = `<span class="badge badge-green" style="font-weight:800;background:#ecfdf5;color:#047857;border:1.5px solid #6ee7b7;"><i class="fa-solid fa-trophy"></i> Placed</span>`;
    } else if (rawSt === 'shortlisted') {
      statusPill = `<span class="badge" style="background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;font-weight:700;"><i class="fa-solid fa-star"></i> Shortlisted</span>`;
    } else if (rawSt === 'rejected') {
      statusPill = `<span class="badge badge-red" style="font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>`;
    } else {
      statusPill = `<span class="badge badge-blue" style="font-weight:700;"><i class="fa-solid fa-file-signature"></i> Applied</span>`;
    }

    const actionSelect = s.is_applied && s.application_id
      ? `<select class="form-control" style="font-size:11.5px;padding:3px 6px;width:125px;font-weight:700;border-radius:6px;" onchange="handleInlineApplicationStatusChange(this, ${s.application_id}, ${driveId})">
           <option value="Applied" ${rawSt === 'applied' ? 'selected' : ''}>Applied</option>
           <option value="Shortlisted" ${rawSt === 'shortlisted' ? 'selected' : ''}>⭐ Shortlisted</option>
           <option value="Selected" ${(rawSt === 'selected' || rawSt === 'placed') ? 'selected' : ''}>🏆 Placed</option>
           <option value="Rejected" ${rawSt === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
         </select>`
      : `<span style="color:#94a3b8;font-size:11.5px;font-style:italic;">Not Applied</span>`;

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
        <td>${actionSelect}</td>
        <td>${resumeBtn}</td>
      </tr>`;
  }).join('');
}

async function handleInlineApplicationStatusChange(selectEl, applicationId, driveId) {
  const newStatus = selectEl.value;
  selectEl.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/admin/applications/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ application_id: applicationId, status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      showAdminAlert(`Application status updated to "${newStatus}"`, true);
      // Reload this modal data silently to keep filter tabs & counts up to date
      if (driveId) {
        const savedFilter = currentEligibleFilter;
        await openDriveEligibleModal(driveId);
        filterEligibleModalList(savedFilter);
      }
      // Update general stats and tables
      loadDashboardStats();
    } else {
      alert(data.message || 'Failed to update status');
      selectEl.disabled = false;
    }
  } catch (err) {
    console.error('Status update error:', err);
    alert('Network error while updating status');
    selectEl.disabled = false;
  }
}

function exportEligibleStudentsExcel() {
  if (!currentEligibleData || !currentEligibleData.students || !window.XLSX) {
    alert('Excel library or data not ready.');
    return;
  }

  let list = currentEligibleData.students.all || [];
  if (currentEligibleFilter === 'applied')     list = currentEligibleData.students.applied || [];
  if (currentEligibleFilter === 'shortlisted') list = currentEligibleData.students.shortlisted || [];
  if (currentEligibleFilter === 'placed')      list = currentEligibleData.students.placed || [];
  if (currentEligibleFilter === 'unapplied')   list = currentEligibleData.students.unapplied || [];

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
  XLSX.utils.book_append_sheet(wb, ws, `${currentEligibleFilter.toUpperCase()}_Students`);
  XLSX.writeFile(wb, `${companySafe}_${currentEligibleFilter}_Students.xlsx`);
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

// ============================================================
// PORTAL SETTINGS & BATCH MANAGEMENT FUNCTIONS
// ============================================================

async function loadPortalSettings(showToast = false) {
  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success && data.settings) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      if (showToast) {
        showAdminAlert('Portal settings & batches refreshed successfully!', true);
      }
      renderSettingsTab();
    }
  } catch (err) {
    console.warn('Failed to load portal settings from API, using default settings:', err);
    populateAllAdminBatchDropdowns();
  }
}

function populateAllAdminBatchDropdowns() {
  if (!portalSettings || !Array.isArray(portalSettings.batches)) return;

  const defaultBatchName = portalSettings.default_year || '2023-2027';
  const defaultYearNum   = portalSettings.default_year_num || 4;

  // 1. Settings tab elements
  const settingsSelect = el('settingsDefaultBatchSelect');
  if (settingsSelect) {
    settingsSelect.innerHTML = portalSettings.batches.map(b => {
      const isDef = (b.name === defaultBatchName);
      const isPassed = (b.status === 'passed_out' || b.year_num === 5);
      const statusLabel = isPassed ? ' — Passed Out' : (b.year_label ? ` — ${b.year_label}` : '');
      return `<option value="${escapeHtml(b.name)}" ${isDef ? 'selected' : ''}>${escapeHtml(b.name)}${statusLabel}${isDef ? ' ⭐ (Current Default)' : ''}</option>`;
    }).join('');
  }

  if (el('currentDefaultYearBadge')) {
    el('currentDefaultYearBadge').innerText = `Current Default: ${defaultBatchName}`;
  }

  const finalYearBatch = portalSettings.batches.find(b => b.year_num === 4 && b.status === 'active') || portalSettings.batches.find(b => b.name === '2023-2027');
  const passedOutBatch = portalSettings.batches.find(b => b.status === 'passed_out') || portalSettings.batches.find(b => b.name === '2022-2026');
  if (el('calloutFinalBatchName') && finalYearBatch) el('calloutFinalBatchName').innerText = finalYearBatch.name;
  if (el('calloutPassedBatchName') && passedOutBatch) el('calloutPassedBatchName').innerText = passedOutBatch.name;

  // 2. Year-based filter & student dropdowns:
  // - #filterPlacedNonPlacedYear (Analytics)
  // - #filterYear (Student Roster)
  // - #filterAppYear (Applications)
  // - #filterPlacedYear (Placed Students)
  // - #addStudentYear (Add Student Modal)
  // - #editStudentYear (Edit Student Modal)
  const yearSelectIds = ['filterPlacedNonPlacedYear', 'filterYear', 'filterAppYear', 'filterPlacedYear', 'addStudentYear', 'editStudentYear'];
  yearSelectIds.forEach(id => {
    const sel = el(id);
    if (!sel) return;
    const prevVal = sel.value;

    const isFilter = (id !== 'addStudentYear' && id !== 'editStudentYear');
    let html = '';
    if (id === 'filterPlacedNonPlacedYear') {
      html = '<option value="all">All Batches</option>';
    } else if (isFilter) {
      html = '<option value="">All Batches</option>';
    }

    // Sort batches by year_num descending (5, 4, 3, 2, 1)
    const sorted = [...portalSettings.batches].sort((a, b) => (b.year_num || 0) - (a.year_num || 0));
    sorted.forEach(b => {
      const isDef = (b.name === defaultBatchName || b.year_num === defaultYearNum);
      const isPassed = (b.status === 'passed_out' || b.year_num === 5);
      const label = isPassed
        ? `${b.name} (Passed Out)${isDef ? ' (Default Year)' : ''}`
        : `${b.name}${isDef ? ' (Default Year)' : ''}`;
      
      html += `<option value="${b.year_num}" ${isDef ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    });

    sel.innerHTML = html;
    if (prevVal && prevVal !== 'all' && prevVal !== '') {
      sel.value = prevVal;
    } else if (id === 'filterPlacedNonPlacedYear' && prevVal === 'all') {
      sel.value = 'all';
    } else {
      sel.value = String(defaultYearNum);
    }
  });

  // 3. Batch Name-based dropdowns:
  // - #driveBatchInput (Post Drive)
  // - #filterDriveBatch (Filter Drives)
  // - #editDriveBatch (Edit Drive)
  const batchNameSelectIds = ['driveBatchInput', 'filterDriveBatch', 'editDriveBatch'];
  batchNameSelectIds.forEach(id => {
    const sel = el(id);
    if (!sel) return;
    const prevVal = sel.value;

    let html = '';
    if (id === 'filterDriveBatch') {
      html += '<option value="">All Batches</option>';
    }

    portalSettings.batches.forEach(b => {
      const isDef = (b.name === defaultBatchName);
      const isPassed = (b.status === 'passed_out' || b.year_num === 5);
      const label = isPassed
        ? `${b.name} (Passed Out)${isDef ? ' (Default Year)' : ''}`
        : `${b.name}${isDef ? ' (Default Year)' : ''}`;
      html += `<option value="${escapeHtml(b.name)}" ${isDef ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    });

    if (id === 'driveBatchInput' || id === 'editDriveBatch') {
      html += '<option value="All Batches">All Batches</option>';
    }

    sel.innerHTML = html;
    if (prevVal && prevVal !== 'All Batches' && prevVal !== '') {
      sel.value = prevVal;
    } else if (id === 'filterDriveBatch' && prevVal === '') {
      sel.value = '';
    } else {
      sel.value = defaultBatchName;
    }
  });
}

function renderSettingsTab() {
  const tbody = el('batchesTableBody');
  if (!tbody || !portalSettings || !Array.isArray(portalSettings.batches)) return;

  const defaultBatchName = portalSettings.default_year || '2023-2027';
  const batches = portalSettings.batches;

  if (el('batchesCountBadge')) {
    el('batchesCountBadge').innerText = `${batches.length} Batches`;
  }

  tbody.innerHTML = batches.map(b => {
    const isDef = (b.name === defaultBatchName);
    const isPassed = (b.status === 'passed_out' || b.year_num === 5);

    const statusBadge = isPassed
      ? `<span class="badge-passedout-year"><i class="fa-solid fa-flag-checkered"></i> Passed Out</span>`
      : `<span class="badge-active-year"><i class="fa-solid fa-circle-check"></i> Active</span>`;

    const defaultBadge = isDef
      ? `<span class="badge-default-year"><i class="fa-solid fa-star"></i> Default Year</span>`
      : `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px;" onclick="setBatchAsDefaultAction('${escapeHtml(b.name)}')">Set as Default</button>`;

    const togglePassedBtn = isPassed
      ? `<button class="btn btn-outline-primary btn-sm" style="font-size:11px;padding:3px 8px;" onclick="toggleBatchPassedOutAction('${escapeHtml(b.name)}', false)" title="Mark as Active"><i class="fa-solid fa-rotate-left"></i> Make Active</button>`
      : `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 8px;color:#7c3aed;border-color:#d8b4fe;" onclick="toggleBatchPassedOutAction('${escapeHtml(b.name)}', true)" title="Mark as Passed Out"><i class="fa-solid fa-user-graduate"></i> Mark Passed Out</button>`;

    // Allow deleting only custom non-default batches
    const isCoreBatch = ['2023-2027', '2022-2026'].includes(b.name);
    const deleteBtn = (!isDef && !isCoreBatch)
      ? `<button class="pro-delete-text-btn" style="margin-left:6px;" onclick="deleteBatchAction('${escapeHtml(b.name)}')" title="Delete Batch"><i class="fa-solid fa-trash-can"></i></button>`
      : '';

    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:32px;height:32px;border-radius:8px;background:${isPassed ? '#f3e8ff' : '#eff6ff'};color:${isPassed ? '#7c3aed' : '#2563eb'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <strong style="font-size:14px;color:#0f172a;">${escapeHtml(b.name)}</strong>
          </div>
        </div>
      </td>
      <td>
        <span style="font-weight:600;color:#334155;">
          ${escapeHtml(b.year_label || (isPassed ? 'Passed Out' : `Year ${b.year_num}`))}
        </span>
      </td>
      <td>${statusBadge}</td>
      <td>${defaultBadge}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          ${togglePassedBtn}
          ${deleteBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function handleSaveDefaultYear(event) {
  event.preventDefault();
  const select = el('settingsDefaultBatchSelect');
  if (!select) return;
  const selectedBatch = select.value;
  if (!selectedBatch) return;

  const btn = el('saveDefaultBatchBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ default_year: selectedBatch })
    });
    const data = await res.json();
    if (data.success) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      renderSettingsTab();

      const successMsg = el('saveSettingsSuccessMsg');
      if (successMsg) {
        successMsg.style.display = 'inline-flex';
        setTimeout(() => { successMsg.style.display = 'none'; }, 4000);
      }
      showAdminAlert(`Default Academic Year set to "${selectedBatch}" across all admin combo boxes!`, true);
    } else {
      showAdminAlert(data.message || 'Failed to update default year.');
    }
  } catch (err) {
    console.error('Error saving default year setting:', err);
    showAdminAlert('Server error while saving default year setting.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Apply Default Year';
    }
  }
}

function autoCalculateBatchName() {
  const startInput = el('newBatchStartYear');
  const endInput   = el('newBatchEndYear');
  const nameInput  = el('newBatchName');

  if (startInput && endInput && nameInput) {
    const s = parseInt(startInput.value);
    if (!isNaN(s) && !endInput.value) {
      endInput.value = s + 4;
    }
    const e = parseInt(endInput.value);
    if (!isNaN(s) && !isNaN(e) && s > 0 && e > 0) {
      nameInput.value = `${s}-${e}`;
    }
  }
}

async function handleCreateNewBatch(event) {
  event.preventDefault();
  const nameInput       = el('newBatchName');
  const startInput      = el('newBatchStartYear');
  const endInput        = el('newBatchEndYear');
  const advanceCheck    = el('chkAdvanceStudents');
  const setDefCheck     = el('chkSetNewAsDefault');

  const name            = nameInput?.value.trim();
  const start_year      = parseInt(startInput?.value);
  const end_year        = parseInt(endInput?.value);
  const promote_students= advanceCheck ? advanceCheck.checked : true;
  const set_as_default  = setDefCheck ? setDefCheck.checked : false;

  if (!name) {
    showAdminAlert('Please specify a batch name.');
    return;
  }

  const btn = el('createBatchBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Batch & Rollover...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({
        name,
        start_year,
        end_year,
        promote_students,
        set_as_default
      })
    });

    const data = await res.json();
    if (data.success) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      renderSettingsTab();
      if (el('formCreateNewBatch')) el('formCreateNewBatch').reset();

      showAdminAlert(
        `Batch "${name}" created successfully! The previous final year batch has been marked as Passed Out.`,
        true
      );

      // Refresh other tabs data
      fetchStudentRoster();
      loadDashboardStats();
    } else {
      showAdminAlert(data.message || 'Failed to create new batch.');
    }
  } catch (err) {
    console.error('Error creating new batch:', err);
    showAdminAlert('Server error while creating new batch.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Create Batch & Advance Final Year';
    }
  }
}

async function setBatchAsDefaultAction(batchName) {
  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ default_year: batchName })
    });
    const data = await res.json();
    if (data.success) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      renderSettingsTab();
      showAdminAlert(`Default Academic Year set to "${batchName}"!`, true);
    } else {
      showAdminAlert(data.message || 'Failed to set default batch.');
    }
  } catch (err) {
    console.error('Error updating default batch:', err);
    showAdminAlert('Server error while updating default batch.');
  }
}

async function toggleBatchPassedOutAction(batchName, isPassedOut) {
  try {
    const res = await fetch(`${API_BASE}/admin/batches/${encodeURIComponent(batchName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ is_passed_out: isPassedOut })
    });
    const data = await res.json();
    if (data.success) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      renderSettingsTab();
      showAdminAlert(`Batch "${batchName}" updated to ${isPassedOut ? 'Passed Out' : 'Active'} status.`, true);
    } else {
      showAdminAlert(data.message || 'Failed to update batch status.');
    }
  } catch (err) {
    console.error('Error updating batch status:', err);
    showAdminAlert('Server error while updating batch status.');
  }
}

async function deleteBatchAction(batchName) {
  if (!confirm(`Are you sure you want to delete batch "${batchName}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/batches/${encodeURIComponent(batchName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      portalSettings = data.settings;
      populateAllAdminBatchDropdowns();
      renderSettingsTab();
      showAdminAlert(`Batch "${batchName}" deleted successfully.`, true);
    } else {
      showAdminAlert(data.message || 'Failed to delete batch.');
    }
  } catch (err) {
    console.error('Error deleting batch:', err);
    showAdminAlert('Server error while deleting batch.');
  }
}