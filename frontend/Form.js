// ==========================================================================
// FORM.JS — RIT CSBS DIGITAL DEPARTMENT PORTAL
// Enterprise Authentication & Routing Controller
// Primary: Department Portal (Student & Placement Management)
// Secondary: Department Social Media Hub (Communication & Media)
// ==========================================================================

const API_BASE = `${window.location.origin}/api`;

let currentPortalMode = 'dept'; // 'dept' | 'social'
let currentRole = 'faculty';     // 'faculty' | 'student' | 'admin' | 'hod'

// ==========================================================================
// INITIALIZATION
// ==========================================================================
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

  // Restore remembered identifier if present
  const savedUser = localStorage.getItem('rit_remembered_identifier');
  if (savedUser) {
    const input = document.getElementById('authIdentifier');
    if (input) input.value = savedUser;
    const chk = document.getElementById('rememberMeCheckbox');
    if (chk) chk.checked = true;
  }

  // Handle URL hash for direct bookmark routing
  handleUrlHashRouting();

  // Allow clicking on domain suffix tag to append it
  const domainTag = document.getElementById('domainSuffixTag');
  if (domainTag) {
    domainTag.addEventListener('click', () => {
      const input = document.getElementById('authIdentifier');
      if (!input) return;
      const val = input.value.trim();
      if (val && !val.includes('@')) {
        input.value = `${val}@ritrjpm.ac.in`;
      }
      input.focus();
    });
  }
});

function handleUrlHashRouting() {
  const hash = window.location.hash.toLowerCase();
  if (hash === '#social' || hash === '#social-hub') {
    selectPortalMode('social');
    selectStaffRole('faculty');
  } else if (hash === '#social-student' || hash === '#hod') {
    selectPortalMode('social');
    selectStaffRole('student');
  } else if (hash === '#admin' || hash === '#social-admin') {
    selectPortalMode('social');
    selectStaffRole('admin');
  } else if (hash === '#student' || hash === '#placement') {
    selectPortalMode('dept');
    selectStaffRole('student');
  } else if (hash === '#register' || hash === '#student-register') {
    selectPortalMode('dept');
    toggleStudentRegisterMode(true);
  } else if (hash === '#placement-admin') {
    selectPortalMode('dept');
    selectStaffRole('admin');
  } else {
    // Default: Department Portal with Faculty role
    selectPortalMode('dept');
    selectStaffRole('faculty');
  }
}

// ==========================================================================
// PORTAL MODE SWITCHING (Department Portal vs Social Media Hub)
// ==========================================================================
function selectPortalMode(mode) {
  currentPortalMode = mode;
  hideAlert();
  toggleStudentRegisterMode(false);

  const tabDept = document.getElementById('tabDeptPortal');
  const tabSocial = document.getElementById('tabSocialHub');
  const roleWrap = document.getElementById('rolePillsContainer');
  const subtitle = document.getElementById('authCardSubtitle');

  const badgeDept = document.getElementById('badgeDeptPortal');
  const badgeSocial = document.getElementById('badgeSocialHub');

  if (mode === 'dept') {
    // Primary: Department Portal (Students, Placement, Faculty)
    if (tabDept) tabDept.classList.add('active');
    if (tabSocial) tabSocial.classList.remove('active');
    if (badgeDept) badgeDept.classList.remove('form-hidden');
    if (badgeSocial) badgeSocial.classList.add('form-hidden');

    if (subtitle) {
      subtitle.textContent = 'Manage students, placements and department career activities.';
    }

    if (roleWrap) {
      roleWrap.innerHTML = `
        <button type="button" class="role-pill-btn active" data-role="faculty" onclick="selectStaffRole('faculty')">
          <i class="fa-solid fa-user"></i>
          <span>Faculty</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="student" onclick="selectStaffRole('student')">
          <i class="fa-solid fa-graduation-cap"></i>
          <span>Student</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="admin" onclick="selectStaffRole('admin')">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Placement Admin</span>
        </button>
      `;
    }

    selectStaffRole('faculty');

  } else {
    // Secondary: Department Social Media Hub (News, Events, Gallery, Staff)
    if (tabSocial) tabSocial.classList.add('active');
    if (tabDept) tabDept.classList.remove('active');
    if (badgeSocial) badgeSocial.classList.remove('form-hidden');
    if (badgeDept) badgeDept.classList.add('form-hidden');

    if (subtitle) {
      subtitle.textContent = 'Manage department announcements, events, achievements and social media activities.';
    }

    if (roleWrap) {
      roleWrap.innerHTML = `
        <button type="button" class="role-pill-btn active" data-role="faculty" onclick="selectStaffRole('faculty')">
          <i class="fa-solid fa-user"></i>
          <span>Faculty</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="student" onclick="selectStaffRole('student')">
          <i class="fa-solid fa-graduation-cap"></i>
          <span>Student</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="admin" onclick="selectStaffRole('admin')">
          <i class="fa-solid fa-gear"></i>
          <span>Admin</span>
        </button>
      `;
    }

    selectStaffRole('faculty');
  }
}

// ==========================================================================
// ROLE SWITCHING
// ==========================================================================
function selectStaffRole(role) {
  currentRole = role;
  hideAlert();

  // Update active pill classes
  const pillBtns = document.querySelectorAll('.role-pill-btn');
  pillBtns.forEach(btn => {
    if (btn.getAttribute('data-role') === role) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const lbl = document.getElementById('lblIdentifierText');
  const input = document.getElementById('authIdentifier');
  const domainTag = document.getElementById('domainSuffixTag');
  const btnText = document.getElementById('btnSubmitText');
  const studentPrompt = document.getElementById('studentRegisterPrompt');
  const facultyPrompt = document.getElementById('facultyRegisterPrompt');

  if (currentPortalMode === 'dept') {
    // Roles in Department Portal
    if (role === 'student') {
      if (lbl) lbl.textContent = 'Official Email / Register Number';
      if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Department Portal';
      if (studentPrompt) studentPrompt.classList.remove('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
    } else if (role === 'admin') {
      if (lbl) lbl.textContent = 'Official Email / Register Number';
      if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Department Portal';
      if (studentPrompt) studentPrompt.classList.add('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
    } else {
      // Faculty (Default)
      if (lbl) lbl.textContent = 'Official Email / Register Number';
      if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Department Portal';
      if (studentPrompt) studentPrompt.classList.add('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.remove('form-hidden');
    }
  } else {
    // Roles in Department Social Media Hub
    if (role === 'student') {
      if (lbl) lbl.textContent = 'Official Email / Register Number';
      if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Social Media Hub';
      if (studentPrompt) studentPrompt.classList.remove('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
    } else if (role === 'admin') {
      if (lbl) lbl.textContent = 'Admin ID / Official Email';
      if (input) input.placeholder = 'admin@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Social Media Hub';
      if (studentPrompt) studentPrompt.classList.add('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
    } else {
      // Faculty
      if (lbl) lbl.textContent = 'Official Email / Register Number';
      if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
      if (domainTag) domainTag.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Login to Social Media Hub';
      if (studentPrompt) studentPrompt.classList.add('form-hidden');
      if (facultyPrompt) facultyPrompt.classList.remove('form-hidden');
    }
  }
}

// ==========================================================================
// STUDENT REGISTRATION EXPANSION
// ==========================================================================
function toggleStudentRegisterMode(showRegister) {
  hideAlert();
  const loginFormContainer = document.getElementById('authMainFormContainer');
  const registerContainer = document.getElementById('studentRegisterContainer');
  const roleWrap = document.getElementById('roleSelectorWrap');

  if (showRegister) {
    if (loginFormContainer) loginFormContainer.classList.add('form-hidden');
    if (registerContainer) registerContainer.classList.remove('form-hidden');
    if (roleWrap) roleWrap.classList.add('form-hidden');
    setTimeout(() => {
      const nameInput = document.getElementById('regFullName');
      if (nameInput) nameInput.focus();
    }, 60);
  } else {
    if (registerContainer) registerContainer.classList.add('form-hidden');
    if (loginFormContainer) loginFormContainer.classList.remove('form-hidden');
    if (roleWrap) roleWrap.classList.remove('form-hidden');
  }
}

// ==========================================================================
// LOGIN SUBMISSION HANDLER
// ==========================================================================
async function handlePortalLogin(e) {
  e.preventDefault();
  hideAlert();

  let identifier = document.getElementById('authIdentifier')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const rememberMe = document.getElementById('rememberMeCheckbox')?.checked;

  if (!identifier || !password) {
    showAlert('Please fill in both your email/ID and password.', 'error');
    return;
  }

  // Handle Remember Me in localStorage
  if (rememberMe) {
    localStorage.setItem('rit_remembered_identifier', identifier);
  } else {
    localStorage.removeItem('rit_remembered_identifier');
  }

  setBtnLoading('btnSubmitLogin', true, 'Signing in...');

  // Auto format email if user typed username without domain
  let emailPayload = identifier;
  if (!identifier.includes('@') && isNaN(identifier)) {
    emailPayload = `${identifier}@ritrjpm.ac.in`;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: identifier,
        email: emailPayload,
        password,
        role: currentRole
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(data.message || 'Invalid credentials or unauthorized role access.', 'error');
      resetSubmitButton();
      return;
    }

    // Save tokens and session
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.adminToken) {
      localStorage.setItem('adminToken', data.adminToken);
    }

    // Record user's active portal choice for smart landing
    localStorage.setItem('csbs_active_portal', currentPortalMode);

    showAlert('Authentication successful! Entering portal...', 'success');
    showLoadingOverlay(`Welcome ${data.user.full_name || ''}! Loading your portal...`);

    setTimeout(() => {
      routeAfterAuth(data.user);
    }, 500);

  } catch (err) {
    console.error('Portal Login error:', err);
    showAlert('Unable to connect to portal server. Please verify backend connection.', 'error');
    resetSubmitButton();
  }
}

function resetSubmitButton() {
  const btn = document.getElementById('btnSubmitLogin');
  if (!btn) return;
  btn.disabled = false;
  let text = 'Login to Department Portal';
  if (currentPortalMode === 'social') {
    text = currentRole === 'hod' ? 'Login as Head of Department' : (currentRole === 'admin' ? 'Login as Administrator' : 'Login to Social Media Hub');
  } else {
    text = currentRole === 'admin' ? 'Login as Placement Admin' : 'Login to Department Portal';
  }
  btn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> <span id="btnSubmitText">${text}</span>`;
}

// ==========================================================================
// STUDENT REGISTRATION SUBMISSION HANDLER
// ==========================================================================
async function handleStudentRegister(e) {
  e.preventDefault();
  hideAlert();

  const fullName = document.getElementById('regFullName')?.value.trim();
  const regNo = document.getElementById('regRegisterNo')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const phone = document.getElementById('regPhone')?.value.trim();
  const year = document.getElementById('regYear')?.value || 4;
  const password = document.getElementById('regPassword')?.value;
  const confirmPassword = document.getElementById('regConfirmPassword')?.value;

  if (!fullName || !regNo || !email || !password) {
    showAlert('Please fill in all required fields marked with *.', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters long.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Passwords do not match. Please re-enter carefully.', 'error');
    return;
  }

  setBtnLoading('btnSubmitRegister', true, 'Creating Student Account...');

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        register_number: regNo,
        email,
        phone: phone || null,
        department: 'CSBS',
        year: parseInt(year, 10),
        password,
        role: 'student'
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAlert(data.message || 'Registration failed. Please check your details.', 'error');
      setBtnLoading('btnSubmitRegister', false, '<i class="fa-solid fa-user-plus"></i> <span>Create Student Account</span>');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showAlert('Student account registered! Entering Department Portal...', 'success');
    showLoadingOverlay('Creating your student profile...');

    setTimeout(() => {
      routeAfterAuth(data.user);
    }, 600);

  } catch (err) {
    console.error('Registration error:', err);
    showAlert('Unable to reach server. Please check your network connection.', 'error');
    setBtnLoading('btnSubmitRegister', false, '<i class="fa-solid fa-user-plus"></i> <span>Create Student Account</span>');
  }
}

// ==========================================================================
// AUTOMATIC ROUTING ACCORDING TO ROLES & PREFERRED PORTAL
// ==========================================================================
function routeAfterAuth(user) {
  if (!user) {
    window.location.href = 'Form.html';
    return;
  }

  const role = (user.role || '').toLowerCase();
  const preferredPortal = localStorage.getItem('csbs_active_portal');

  // If user selected or preferred Social Media Hub:
  if (preferredPortal === 'social') {
    window.location.href = 'social_dashboard.html';
    return;
  }

  // Student default for Department Portal: Student Placement Dashboard
  if (role === 'student') {
    window.location.href = 'student_dashboard.html';
    return;
  }

  // Staff (Faculty, Admin) default for Department Portal: Admin Dashboard
  window.location.href = 'admin_dashboard.html';
}

// ==========================================================================
// UI HELPERS & MODALS
// ==========================================================================
function showAlert(msg, type = 'error') {
  const box = document.getElementById('authAlertBox');
  if (!box) return;
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check" style="color:#16A34A;"></i>' 
    : '<i class="fa-solid fa-circle-exclamation" style="color:#DC2626;"></i>';
  box.innerHTML = `${icon} <span>${msg}</span>`;
  box.className = `auth-alert-box ${type}`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const box = document.getElementById('authAlertBox');
  if (box) box.className = 'auth-alert-box form-hidden';
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

function showLoadingOverlay(desc = 'Verifying institutional credentials') {
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