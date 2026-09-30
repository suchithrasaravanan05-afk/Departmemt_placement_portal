// ==========================================================================
// FORM.JS — RIT CSBS DEPARTMENT PORTAL AUTHENTICATION & ROUTING
// Modern Reactive UI Controller for Glassmorphic Dual-Portal Architecture
// ==========================================================================

const API_BASE = `${window.location.origin}/api`;

let currentPortalMode = 'social'; // 'social' | 'placement'
let currentRole = 'faculty';       // 'faculty' | 'hod' | 'admin' | 'student'

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

  // Check URL hash for direct links (e.g. #placement, #student, #faculty, #register)
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
  if (hash === '#placement' || hash === '#student') {
    selectPortalMode('placement');
    selectStaffRole('student');
  } else if (hash === '#register' || hash === '#student-register') {
    selectPortalMode('placement');
    toggleStudentRegisterMode(true);
  } else if (hash === '#admin') {
    selectPortalMode('social');
    selectStaffRole('admin');
  } else if (hash === '#hod') {
    selectPortalMode('social');
    selectStaffRole('hod');
  } else {
    selectPortalMode('social');
    selectStaffRole('faculty');
  }
}

// ==========================================================================
// PORTAL MODE SWITCHING (Social Media Hub vs Placement Portal)
// ==========================================================================
function selectPortalMode(mode) {
  currentPortalMode = mode;
  hideAlert();
  toggleStudentRegisterMode(false);

  const tabSocial = document.getElementById('tabSocialHub');
  const tabPlacement = document.getElementById('tabPlacementPortal');
  const roleWrap = document.getElementById('rolePillsContainer');
  const regPrompt = document.getElementById('studentRegisterPrompt');
  const facultyPrompt = document.getElementById('facultyRegisterPrompt');
  const btnText = document.getElementById('btnSubmitText');
  const subtitle = document.getElementById('authCardSubtitle');

  if (mode === 'placement') {
    if (tabSocial) tabSocial.classList.remove('active');
    if (tabPlacement) tabPlacement.classList.add('active');

    // Role options for Placement Portal: Student & Placement Admin
    if (roleWrap) {
      roleWrap.innerHTML = `
        <button type="button" class="role-pill-btn active" data-role="student" onclick="selectStaffRole('student')">
          <i class="fa-solid fa-graduation-cap"></i>
          <span>Student</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="admin" onclick="selectStaffRole('admin')">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Placement Admin</span>
        </button>
      `;
    }

    if (btnText) btnText.textContent = 'Login to Placement Portal';
    if (subtitle) subtitle.textContent = 'Access placement drives, drives management & profiles';
    if (regPrompt) regPrompt.classList.remove('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
    selectStaffRole('student');

  } else {
    // Social Media Hub mode
    if (tabPlacement) tabPlacement.classList.remove('active');
    if (tabSocial) tabSocial.classList.add('active');

    // Role options for Social Media Hub: Faculty, HOD, Admin
    if (roleWrap) {
      roleWrap.innerHTML = `
        <button type="button" class="role-pill-btn active" data-role="faculty" onclick="selectStaffRole('faculty')">
          <i class="fa-solid fa-user-tie"></i>
          <span>Faculty</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="hod" onclick="selectStaffRole('hod')">
          <i class="fa-solid fa-building-columns"></i>
          <span>HOD</span>
        </button>
        <button type="button" class="role-pill-btn" data-role="admin" onclick="selectStaffRole('admin')">
          <i class="fa-solid fa-gear"></i>
          <span>Admin</span>
        </button>
      `;
    }

    if (btnText) btnText.textContent = 'Login to Social Media Hub';
    if (subtitle) subtitle.textContent = 'Select a portal and log in to continue';
    if (regPrompt) regPrompt.classList.add('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.remove('form-hidden');
    selectStaffRole('faculty');
  }
}

// ==========================================================================
// ROLE SWITCHING
// ==========================================================================
function selectStaffRole(role) {
  currentRole = role;
  hideAlert();

  // Update pill active classes
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
  const regPrompt = document.getElementById('studentRegisterPrompt');
  const facultyPrompt = document.getElementById('facultyRegisterPrompt');

  if (role === 'student') {
    if (lbl) lbl.textContent = 'Register Number / Official Email';
    if (input) input.placeholder = 'e.g. 953623244001 or student email';
    if (domainTag) domainTag.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Login to Placement Portal';
    if (regPrompt) regPrompt.classList.remove('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
  } else if (role === 'admin') {
    if (lbl) lbl.textContent = 'Admin ID / Official Email';
    if (input) input.placeholder = 'e.g. admin@ritrjpm.ac.in';
    if (domainTag) domainTag.style.display = 'inline-block';
    if (btnText) {
      btnText.textContent = currentPortalMode === 'placement' 
        ? 'Login as Placement Admin' 
        : 'Login to Social Media Hub';
    }
    if (regPrompt) regPrompt.classList.add('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
  } else if (role === 'hod') {
    if (lbl) lbl.textContent = 'HOD ID / Official Email';
    if (input) input.placeholder = 'e.g. hodcsbs@ritrjpm.ac.in';
    if (domainTag) domainTag.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Login as Head of Department';
    if (regPrompt) regPrompt.classList.add('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.add('form-hidden');
  } else {
    // Faculty
    if (lbl) lbl.textContent = 'Official Email';
    if (input) input.placeholder = 'faculty@ritrjpm.ac.in';
    if (domainTag) domainTag.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Login to Social Media Hub';
    if (regPrompt) regPrompt.classList.add('form-hidden');
    if (facultyPrompt) facultyPrompt.classList.remove('form-hidden');
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

  // Auto format email if user typed username without domain and it is an email field
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
  let text = 'Login to Social Media Hub';
  if (currentPortalMode === 'placement') {
    text = currentRole === 'admin' ? 'Login as Placement Admin' : 'Login to Placement Portal';
  } else if (currentRole === 'hod') {
    text = 'Login as Head of Department';
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

    showAlert('Student account registered! Entering Placement Portal...', 'success');
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
// GOOGLE SSO HANDLER (Institutional Account)
// ==========================================================================
function handleGoogleSSO() {
  showAlert('Redirecting to Google Institutional Sign-In (@ritrjpm.ac.in)...', 'success');
  setTimeout(() => {
    window.location.href = `${API_BASE}/auth/google?portal=${currentPortalMode}`;
  }, 600);
}

// ==========================================================================
// AUTOMATIC ROUTING ACCORDING TO ROLES & PERMISSIONS
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

  // Staff (Faculty, HOD, Admin) Routing:
  const preferredPortal = localStorage.getItem('csbs_active_portal');

  if (preferredPortal === 'social' || (!placementAccess && socialAccess)) {
    window.location.href = 'social_dashboard.html';
    return;
  }

  if (preferredPortal === 'placement' || (placementAccess && !socialAccess)) {
    window.location.href = 'admin_dashboard.html';
    return;
  }

  // Fallback to Placement Dashboard with module switcher enabled
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

function openDeptOverview() {
  // Department modal removed per requirements — information is permanently visible on the left side
}

function closeDeptOverview(e) {
  // Department modal removed per requirements
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