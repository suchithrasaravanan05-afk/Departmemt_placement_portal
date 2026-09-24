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

  // Handle URL hash shortcuts if requested (e.g., #student, #register, #faculty, #faculty-register, #admin)
  const hash = window.location.hash.toLowerCase();
  if (hash === '#student') {
    showStudentAuth();
  } else if (hash === '#register' || hash === '#student-register') {
    showStudentAuth();
    switchStudentAuthMode('register');
  } else if (hash === '#faculty') {
    proceedToStaffAuth('faculty');
  } else if (hash === '#faculty-register' || hash === '#faculty-registration') {
    proceedToStaffAuth('faculty');
    switchFacultyAuthMode('register');
  } else if (hash === '#hod') {
    proceedToStaffAuth('hod');
  } else if (hash === '#admin') {
    proceedToStaffAuth('admin');
  } else {
    showPortalChoice();
  }

  // Auto-sync email to login email in embedded faculty registration form
  const staffEmail = document.getElementById('staffRegEmail');
  const staffLoginEmail = document.getElementById('staffRegLoginEmail');
  if (staffEmail && staffLoginEmail) {
    staffEmail.addEventListener('input', () => {
      staffLoginEmail.value = staffEmail.value.trim();
    });
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
  switchStudentAuthMode('login');
  window.location.hash = 'student';
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
  const switchEl = document.getElementById('staffAuthModeSwitch');
  const tabLogin = document.getElementById('tabStaffLogin');
  const tabReg = document.getElementById('tabStaffRegister');
  const promptEl = document.getElementById('staffRegisterPrompt');
  const promptLabel = document.getElementById('staffPromptLabel');
  const formLogin = document.getElementById('staffLoginForm');
  const formReg = document.getElementById('facultyRegisterForm');

  // Always reset to login form view first
  if (formLogin) formLogin.classList.remove('form-hidden');
  if (formReg) formReg.classList.add('form-hidden');
  if (tabLogin) tabLogin.classList.add('active');
  if (tabReg) tabReg.classList.remove('active');

  if (role === 'admin') {
    // ADMIN: COMMON CREDENTIALS ONLY — NO REGISTRATION FORM OR REGISTRATION TABS
    if (titleEl) titleEl.textContent = 'Placement Admin Login';
    if (subEl) subEl.textContent = 'Sign in with placement administrator credentials';
    if (lblEl) lblEl.textContent = 'Admin ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. admin@rit.ac.in or Admin ID';
    if (iconEl) iconEl.className = 'fa-solid fa-user-shield input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
    if (switchEl) {
      switchEl.classList.add('form-hidden');
      switchEl.style.display = 'none';
    }
    if (promptEl) {
      promptEl.classList.add('form-hidden');
      promptEl.style.display = 'none';
    }
    window.location.hash = 'admin';
  } else if (role === 'hod') {
    // HOD: HAS REGISTRATION & LOGIN
    if (titleEl) titleEl.textContent = 'HOD Login';
    if (subEl) subEl.textContent = 'Sign in with Head of Department credentials';
    if (lblEl) lblEl.textContent = 'HOD ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. hod@rit.ac.in or HOD ID';
    if (iconEl) iconEl.className = 'fa-solid fa-building-columns input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-building-columns"></i>';
    if (switchEl) {
      switchEl.classList.remove('form-hidden');
      switchEl.style.display = 'flex';
      if (tabLogin) tabLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> HOD Login';
      if (tabReg) tabReg.innerHTML = '<i class="fa-solid fa-user-plus"></i> New HOD Registration';
    }
    if (promptEl) {
      promptEl.classList.remove('form-hidden');
      promptEl.style.display = 'block';
      if (promptLabel) promptLabel.textContent = 'New Head of Department?';
    }
    const desigSelect = document.getElementById('staffRegDesignation');
    if (desigSelect) desigSelect.value = 'Head of Department';
    window.location.hash = 'hod';
  } else {
    // FACULTY: HAS REGISTRATION & LOGIN
    if (titleEl) titleEl.textContent = 'Faculty Login';
    if (subEl) subEl.textContent = 'Sign in with your faculty ID or official email';
    if (lblEl) lblEl.textContent = 'Faculty ID / Official Email';
    if (inputEl) inputEl.placeholder = 'e.g. faculty@rit.ac.in or Staff ID';
    if (iconEl) iconEl.className = 'fa-solid fa-chalkboard-user input-icon';
    if (headerIconEl) headerIconEl.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i>';
    if (switchEl) {
      switchEl.classList.remove('form-hidden');
      switchEl.style.display = 'flex';
      if (tabLogin) tabLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Faculty Login';
      if (tabReg) tabReg.innerHTML = '<i class="fa-solid fa-user-plus"></i> New Faculty Registration';
    }
    if (promptEl) {
      promptEl.classList.remove('form-hidden');
      promptEl.style.display = 'block';
      if (promptLabel) promptLabel.textContent = 'New faculty member?';
    }
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
// FACULTY & HOD AUTHENTICATION (LOGIN & REGISTRATION TOGGLE)
// ==========================================================================

function switchFacultyAuthMode(mode) {
  hideAlerts();
  // Admin never has registration
  if (selectedStaffRole === 'admin') return;

  const tabLogin = document.getElementById('tabStaffLogin');
  const tabReg = document.getElementById('tabStaffRegister');
  const formLogin = document.getElementById('staffLoginForm');
  const formReg = document.getElementById('facultyRegisterForm');
  const title = document.getElementById('staffAuthTitle');
  const subtitle = document.getElementById('staffAuthSub');

  const isHod = selectedStaffRole === 'hod';

  if (mode === 'register') {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabReg) tabReg.classList.add('active');
    if (formLogin) formLogin.classList.add('form-hidden');
    if (formReg) formReg.classList.remove('form-hidden');
    if (title) title.textContent = isHod ? 'HOD Registration' : 'Faculty Registration';
    if (subtitle) subtitle.textContent = isHod
      ? 'Register your Head of Department account to access the College Placement Portal'
      : 'Register your faculty account to access the College Placement Portal';

    // Auto pre-select designation for HOD
    const desigSelect = document.getElementById('staffRegDesignation');
    if (desigSelect && isHod) {
      desigSelect.value = 'Head of Department';
    }

    window.location.hash = isHod ? 'hod-register' : 'faculty-register';
    setTimeout(() => {
      const input = document.getElementById('staffRegFullName');
      if (input) input.focus();
    }, 80);
  } else {
    if (tabReg) tabReg.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (formReg) formReg.classList.add('form-hidden');
    if (formLogin) formLogin.classList.remove('form-hidden');
    if (title) title.textContent = isHod ? 'HOD Login' : 'Faculty Login';
    if (subtitle) subtitle.textContent = isHod
      ? 'Sign in with Head of Department credentials'
      : 'Sign in with your faculty ID or official email';
    window.location.hash = isHod ? 'hod' : 'faculty';
    setTimeout(() => {
      const input = document.getElementById('staffIdentifier');
      if (input) input.focus();
    }, 80);
  }
}

async function handleFacultyRegisterFromPortal(e) {
  e.preventDefault();
  hideAlerts();

  const name = document.getElementById('staffRegFullName')?.value.trim();
  const email = document.getElementById('staffRegEmail')?.value.trim();
  const mobile = document.getElementById('staffRegMobile')?.value.trim();
  const gender = document.getElementById('staffRegGender')?.value.trim();
  const department = document.getElementById('staffRegDepartment')?.value.trim();
  const designation = document.getElementById('staffRegDesignation')?.value.trim();
  const experience = document.getElementById('staffRegExperience')?.value.trim();
  const qualification = document.getElementById('staffRegQualification')?.value.trim();
  const specialization = document.getElementById('staffRegSpecialization')?.value.trim();
  const password = document.getElementById('staffRegPassword')?.value;
  const confirmPassword = document.getElementById('staffRegConfirmPassword')?.value;

  if (!name) return showStaffAlert('Please enter your full name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showStaffAlert('Please enter a valid email ID', 'error');
  if (!mobile || mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) return showStaffAlert('Please enter a valid 10-digit mobile number', 'error');
  if (!gender) return showStaffAlert('Please select your gender', 'error');
  if (!department) return showStaffAlert('Please select your department', 'error');
  if (!designation) return showStaffAlert('Please select your designation', 'error');
  if (experience === '' || isNaN(experience) || Number(experience) < 0 || Number(experience) > 50) return showStaffAlert('Please enter your years of experience (0 - 50)', 'error');
  if (!qualification) return showStaffAlert('Please enter your qualification', 'error');
  if (!specialization) return showStaffAlert('Please enter your specialization', 'error');
  if (!password || password.length < 8) return showStaffAlert('Password must contain at least 8 characters', 'error');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return showStaffAlert('Password must include uppercase, lowercase, number, and special character', 'error');
  }
  if (password !== confirmPassword) return showStaffAlert('Passwords do not match', 'error');

  const payload = {
    name,
    email,
    mobile,
    gender,
    department,
    designation,
    experience: parseFloat(experience),
    qualification,
    specialization,
    password
  };

  setBtnLoading('btnStaffRegisterSubmit', true, 'Registering...');

  try {
    const res = await fetch(`${API_BASE}/faculty/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showStaffAlert('Faculty registration successful! You can now login to the Faculty Portal.', 'success');
      switchFacultyAuthMode('login');
      const idInput = document.getElementById('staffIdentifier');
      if (idInput) idInput.value = email;
      const pwInput = document.getElementById('staffPassword');
      if (pwInput) {
        pwInput.value = '';
        pwInput.focus();
      }
      clearFacultyInPlaceForm();
    } else {
      showStaffAlert(data.message || 'Registration failed. Please check your details.', 'error');
    }
  } catch (err) {
    console.error('Faculty registration error:', err);
    showStaffAlert('Network error connecting to the registration service.', 'error');
  } finally {
    setBtnLoading('btnStaffRegisterSubmit', false, '<i class="fa-solid fa-user-plus"></i> <span>Register Faculty</span>');
  }
}

function clearFacultyInPlaceForm() {
  const form = document.getElementById('facultyRegisterForm');
  if (form) form.reset();
}

// ==========================================================================
// STUDENT AUTHENTICATION (LOGIN & REGISTRATION)
// ==========================================================================

function switchStudentAuthMode(mode) {
  hideAlerts();
  const tabLogin = document.getElementById('tabStudentLogin');
  const tabReg = document.getElementById('tabStudentRegister');
  const formLogin = document.getElementById('studentLoginForm');
  const formReg = document.getElementById('studentRegisterForm');
  const title = document.getElementById('studentAuthTitle');
  const subtitle = document.getElementById('studentAuthSubtitle');

  if (mode === 'register') {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabReg) tabReg.classList.add('active');
    if (formLogin) formLogin.classList.add('form-hidden');
    if (formReg) formReg.classList.remove('form-hidden');
    if (title) title.textContent = 'New Student Registration';
    if (subtitle) subtitle.textContent = 'Create your institutional student placement profile';
    window.location.hash = 'register';
    setTimeout(() => {
      const input = document.getElementById('regFullName');
      if (input) input.focus();
    }, 80);
  } else {
    if (tabReg) tabReg.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (formReg) formReg.classList.add('form-hidden');
    if (formLogin) formLogin.classList.remove('form-hidden');
    if (title) title.textContent = 'Student Login';
    if (subtitle) subtitle.textContent = 'Enter your institutional register number & password';
    window.location.hash = 'student';
    setTimeout(() => {
      const input = document.getElementById('studentRegNo');
      if (input) input.focus();
    }, 80);
  }
}

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
      setBtnLoading('btnStudentSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> <span>Sign In to Student Portal</span>');
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
    setBtnLoading('btnStudentSubmit', false, '<i class="fa-solid fa-right-to-bracket"></i> <span>Sign In to Student Portal</span>');
  }
}

async function handleStudentRegister(e) {
  e.preventDefault();
  hideAlerts();

  const fullName = document.getElementById('regFullName')?.value.trim();
  const regNo = document.getElementById('regRegisterNo')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const phone = document.getElementById('regPhone')?.value.trim();
  const department = document.getElementById('regDepartment')?.value || 'CSBS';
  const year = document.getElementById('regYear')?.value || 4;
  const password = document.getElementById('regPassword')?.value;
  const confirmPassword = document.getElementById('regConfirmPassword')?.value;

  if (!fullName || !regNo || !email || !password) {
    showStudentAlert('Please fill in all required fields (Full Name, Register Number, Email, Password).', 'error');
    return;
  }

  if (password.length < 6) {
    showStudentAlert('Password must be at least 6 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showStudentAlert('Passwords do not match. Please verify your confirmation password.', 'error');
    return;
  }

  setBtnLoading('btnStudentRegister', true, 'Creating Student Account...');

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        register_number: regNo,
        email,
        phone: phone || null,
        department,
        year: parseInt(year, 10),
        password,
        role: 'student'
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showStudentAlert(data.message || 'Registration failed. Please check your details and try again.', 'error');
      setBtnLoading('btnStudentRegister', false, '<i class="fa-solid fa-user-plus"></i> <span>Register &amp; Create Student Account</span>');
      return;
    }

    // Save token and user session
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showStudentAlert('Account created successfully! Welcome to RIT CSBS Portal.', 'success');
    showLoadingOverlay('Creating your student profile & entering portal...');

    setTimeout(() => {
      routeAfterAuth(data.user);
    }, 700);

  } catch (err) {
    console.error('Student registration error:', err);
    showStudentAlert('Unable to connect to the portal server. Please verify your network.', 'error');
    setBtnLoading('btnStudentRegister', false, '<i class="fa-solid fa-user-plus"></i> <span>Register &amp; Create Student Account</span>');
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