// ==========================================================================
// FORM.JS — CSBS DEPARTMENT PORTAL AUTHENTICATION & ROUTING
// Ramco Institute of Technology — Department of CSBS
// ==========================================================================

const API_BASE = `${window.location.origin}/api`;

let selectedStaffRole = 'faculty'; // 'faculty' | 'hod' | 'admin'

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  // Check if session already exists
  const token = localStorage.getItem('token');
  const user = safeParseUser();

  if (token && user && user.role) {
    showLoadingOverlay('Restoring your session...');
    setTimeout(() => {
      routeAfterAuth(user);
    }, 400);
    return;
  }

  // Handle URL hash shortcuts if requested (e.g., #student, #faculty, #admin)
  const hash = window.location.hash.toLowerCase();
  if (hash === '#student') {
    showStudentAuth();
  } else if (hash === '#faculty') {
    proceedToStaffAuth('faculty');
  } else if (hash === '#hod') {
    proceedToStaffAuth('hod');
  } else if (hash === '#admin') {
    proceedToStaffAuth('admin');
  } else {
    showPortalChoice();
  }
});

// ==========================================================================
// VIEW SWITCHING
// ==========================================================================

function hideAllViews() {
  const views = ['viewPortalChoice', 'viewStudentAuth', 'viewStaffRoleSelect', 'viewStaffAuth'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('form-hidden');
  });
  hideAlerts();
}

function showPortalChoice() {
  hideAllViews();
  const el = document.getElementById('viewPortalChoice');
  if (el) el.classList.remove('form-hidden');
  history.replaceState(null, null, ' ');
}

function showStudentAuth() {
  hideAllViews();
  const el = document.getElementById('viewStudentAuth');
  if (el) el.classList.remove('form-hidden');
  window.location.hash = 'student';
  setTimeout(() => {
    const input = document.getElementById('studentRegNo');
    if (input) input.focus();
  }, 100);
}

function showStaffRoleSelect() {
  hideAllViews();
  const el = document.getElementById('viewStaffRoleSelect');
  if (el) el.classList.remove('form-hidden');
  history.replaceState(null, null, ' ');
}

function proceedToStaffAuth(role) {
  selectedStaffRole = role;
  hideAllViews();
  const el = document.getElementById('viewStaffAuth');
  if (el) el.classList.remove('form-hidden');

  const titleEl = document.getElementById('staffAuthTitle');
  const subEl = document.getElementById('staffAuthSub');
  const lblEl = document.getElementById('lblStaffIdentifier');
  const inputEl = document.getElementById('staffIdentifier');
  const iconEl = document.getElementById('staffIdentIcon');
  const headerIconEl = document.getElementById('staffRoleHeaderIcon');

  if (role === 'admin') {
    if (titleEl) titleEl.textContent = 'Placement Admin Login';
    if (subEl) subEl.textContent = 'Sign in with placement administrator credentials';
    if (lblEl) lblEl.textContent = 'Admin ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. admin@rit.ac.in or Admin ID';
    if (iconEl) iconEl.className = 'fa-solid fa-user-shield input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
    window.location.hash = 'admin';
  } else if (role === 'hod') {
    if (titleEl) titleEl.textContent = 'HOD Login';
    if (subEl) subEl.textContent = 'Sign in with Head of Department credentials';
    if (lblEl) lblEl.textContent = 'HOD ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. hod@rit.ac.in or HOD ID';
    if (iconEl) iconEl.className = 'fa-solid fa-building-columns input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-building-columns"></i>';
    window.location.hash = 'hod';
  } else {
    if (titleEl) titleEl.textContent = 'Faculty Login';
    if (subEl) subEl.textContent = 'Sign in with your faculty ID or official email';
    if (lblEl) lblEl.textContent = 'Faculty ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. faculty@rit.ac.in or Staff ID';
    if (iconEl) iconEl.className = 'fa-solid fa-chalkboard-user input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i>';
    window.location.hash = 'faculty';
  }

  setTimeout(() => {
    if (inputEl) inputEl.focus();
  }, 100);
}

function backToStaffRoleSelect() {
  showStaffRoleSelect();
}

// ==========================================================================
// STUDENT AUTHENTICATION
// ==========================================================================

async function handleStudentLogin(e) {
  e.preventDefault();
  hideAlerts();

  const regNo = document.getElementById('studentRegNo')?.value.trim();
  const password = document.getElementById('studentPassword')?.value;

  if (!regNo || !password) {
    showStudentAlert('Please enter both your Register Number and password.', 'error');
    return;
  }

  setBtnLoading('btnStudentSubmit', true, 'Signing in...');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: regNo,
        email: regNo,
        password,
        role: 'student'
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showStudentAlert(data.message || 'Invalid Register Number or password.', 'error');
      setBtnLoading('btnStudentSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Student Portal');
      return;
    }

    // Save tokens and user session
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showStudentAlert('Authentication successful! Entering portal...', 'success');
    showLoadingOverlay('Entering Student Placement Portal...');

    setTimeout(() => {
      routeAfterAuth(data.user);
    }, 600);

  } catch (err) {
    console.error('Student login error:', err);
    showStudentAlert('Unable to connect to the portal server. Please verify your network.', 'error');
    setBtnLoading('btnStudentSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Student Portal');
  }
}

// ==========================================================================
// STAFF AUTHENTICATION (FACULTY / HOD / ADMIN)
// ==========================================================================

async function handleStaffLogin(e) {
  e.preventDefault();
  hideAlerts();

  const identifier = document.getElementById('staffIdentifier')?.value.trim();
  const password = document.getElementById('staffPassword')?.value;

  if (!identifier || !password) {
    showStaffAlert('Please enter your Staff ID or official email and password.', 'error');
    return;
  }

  setBtnLoading('btnStaffSubmit', true, 'Authenticating...');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        email: identifier,
        password,
        role: selectedStaffRole // Validated against actual role in DB
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showStaffAlert(data.message || 'Invalid credentials or unauthorized role access.', 'error');
      setBtnLoading('btnStaffSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> Authenticate &amp; Enter Portal');
      return;
    }

    // Save tokens and user session
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.adminToken) {
      localStorage.setItem('adminToken', data.adminToken);
    }

    showStaffAlert('Authentication successful! Verifying module permissions...', 'success');
    showLoadingOverlay('Loading your authorized portal...');

    setTimeout(() => {
      routeAfterAuth(data.user);
    }, 600);

  } catch (err) {
    console.error('Staff login error:', err);
    showStaffAlert('Unable to connect to portal server. Please check backend connection.', 'error');
    setBtnLoading('btnStaffSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> Authenticate &amp; Enter Portal');
  }
}

// ==========================================================================
// AUTOMATIC DASHBOARD ROUTING ACCORDING TO ROLES & PERMISSIONS
// ==========================================================================

function routeAfterAuth(user) {
  if (!user) {
    window.location.href = 'Form.html';
    return;
  }

  const role = (user.role || '').toLowerCase();
  const placementAccess = user.placement_access !== false;
  const socialAccess = user.social_media_access === true;

  // Student is strictly routed to Student Placement Dashboard
  if (role === 'student') {
    window.location.href = 'student_dashboard.html';
    return;
  }

  // Staff (Faculty, HOD, Admin) Permission Routing:
  // Case 1: Staff with Placement Access ONLY
  if (placementAccess && !socialAccess) {
    window.location.href = 'admin_dashboard.html';
    return;
  }

  // Case 2: Staff with Social Media Hub Access ONLY
  if (!placementAccess && socialAccess) {
    window.location.href = 'social_dashboard.html';
    return;
  }

  // Case 3: Staff with BOTH Placement and Social Media Hub Access
  // Open default portal (Placement Portal) with module switcher active
  if (placementAccess && socialAccess) {
    // Check if user previously active on social media before login
    const savedActivePortal = localStorage.getItem('csbs_active_portal');
    if (savedActivePortal === 'social') {
      window.location.href = 'social_dashboard.html';
    } else {
      window.location.href = 'admin_dashboard.html';
    }
    return;
  }

  // Fallback if neither permission is explicitly set
  window.location.href = 'admin_dashboard.html';
}

// ==========================================================================
// UI HELPERS & MODALS
// ==========================================================================

function showStudentAlert(msg, type = 'error') {
  const box = document.getElementById('studentAlertBox');
  if (!box) return;
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check" style="color:#16A34A;"></i>' 
    : '<i class="fa-solid fa-circle-exclamation" style="color:#DC2626;"></i>';
  box.innerHTML = `${icon} <span>${msg}</span>`;
  box.className = `alert-box ${type}`;
}

function showStaffAlert(msg, type = 'error') {
  const box = document.getElementById('staffAlertBox');
  if (!box) return;
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check" style="color:#16A34A;"></i>' 
    : '<i class="fa-solid fa-circle-exclamation" style="color:#DC2626;"></i>';
  box.innerHTML = `${icon} <span>${msg}</span>`;
  box.className = `alert-box ${type}`;
}

function hideAlerts() {
  const sBox = document.getElementById('studentAlertBox');
  const fBox = document.getElementById('staffAlertBox');
  if (sBox) sBox.className = 'alert-box form-hidden';
  if (fBox) fBox.className = 'alert-box form-hidden';
}

function setBtnLoading(btnId, isLoading, defaultHtml) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Please wait...</span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = defaultHtml;
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPw = input.type === 'password';
  input.type = isPw ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }
}

function openForgotModal() {
  const modal = document.getElementById('forgotModal');
  if (modal) modal.classList.remove('form-hidden');
}

function closeForgotModal(e) {
  const modal = document.getElementById('forgotModal');
  if (modal) modal.classList.add('form-hidden');
}

function showLoadingOverlay(desc = 'Verifying role and module permissions') {
  const overlay = document.getElementById('portalLoadingOverlay');
  const descEl = document.getElementById('loadingOverlayDesc');
  if (descEl) descEl.textContent = desc;
  if (overlay) overlay.classList.remove('form-hidden');
}

function safeParseUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
}