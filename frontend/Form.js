// =============================================
// FORM.JS — RIT CSBS Placement Portal Auth
// =============================================

const API_BASE = `${window.location.origin}/api`;

let selectedRole = 'student';
let isRegisterMode = false;

// ---- Boot: redirect if already logged in ----
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user  = safeParseUser();

  if (token && user) {
    redirect(user.role);
    return;
  }

  loadPortalRegistrationBatches();
  updateUI();
});

async function loadPortalRegistrationBatches() {
  const regYearSelect = document.getElementById('regYear');
  if (!regYearSelect) return;

  try {
    const res = await fetch(`${API_BASE}/auth/settings`);
    const data = await res.json();
    if (data.success && data.settings && Array.isArray(data.settings.batches)) {
      const defaultBatchName = data.settings.default_year || '2023-2027';
      const defaultYearNum   = data.settings.default_year_num || 4;

      const sorted = [...data.settings.batches].sort((a, b) => (b.year_num || 0) - (a.year_num || 0));
      regYearSelect.innerHTML = sorted.map(b => {
        const isDef = (b.name === defaultBatchName || b.year_num === defaultYearNum);
        const isPassed = (b.status === 'passed_out' || b.year_num === 5);
        const label = isPassed
          ? `${b.name} (Passed Out)${isDef ? ' (Default Year)' : ''}`
          : `${b.name}${isDef ? ' (Default Year)' : ''}`;
        return `<option value="${b.year_num}" ${isDef ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }
  } catch (err) {
    console.warn('Could not load dynamic batches for registration, using defaults:', err);
  }
}

// =============================================
// HELPERS
// =============================================
function safeParseUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}

function redirect(role) {
  window.location.href = role === 'admin' ? 'admin_dashboard.html' : 'student_dashboard.html';
}

// =============================================
// ROLE TOGGLE
// =============================================
function setRole(role) {
  selectedRole = role;

  document.getElementById('btnRoleStudent').classList.toggle('active', role === 'student');
  document.getElementById('btnRoleAdmin').classList.toggle('active', role === 'admin');

  updateUI();
  hideAlert();
}

function updateUI() {
  const isAdmin = selectedRole === 'admin';

  // Register/Login specific labels
  const formTitle = document.getElementById('formTitle');
  if (formTitle) {
    formTitle.innerText = isAdmin
      ? (isRegisterMode ? 'Admin Registration' : 'Placement Admin Login')
      : (isRegisterMode ? 'Student Registration' : 'Student Login');
  }

  const formSub = document.getElementById('formSub');
  if (formSub) {
    formSub.innerText = isAdmin
      ? (isRegisterMode ? 'Create admin placement portal account' : 'Sign in with your admin ID')
      : (isRegisterMode ? 'Create student placement portal account' : 'Sign in with your register number');
  }

  const lblEmail = document.getElementById('lblLoginEmail');
  if (lblEmail) {
    lblEmail.innerHTML = isAdmin
      ? '<i class="fa-solid fa-user-shield" style="margin-right:4px;"></i> ADMIN ID'
      : '<i class="fa-solid fa-id-card" style="margin-right:4px;"></i> REGISTER NUMBER';
  }

  const loginInput = document.getElementById('loginEmail');
  const loginIcon = document.getElementById('loginInputIcon');
  if (loginInput) {
    loginInput.placeholder = isAdmin ? 'Enter your admin ID' : 'Enter your register number';
    loginInput.setAttribute('autocomplete', isAdmin ? 'username' : 'off');
  }
  if (loginIcon) {
    loginIcon.className = isAdmin ? 'fa-solid fa-user-shield form-input-icon' : 'fa-solid fa-hashtag form-input-icon';
  }

  const grpReg = document.getElementById('grpRegisterNo');
  const grpDetails = document.getElementById('grpStudentDetails');
  if (grpReg) { grpReg.classList.toggle('form-hidden', isAdmin); grpReg.classList.toggle('hidden', isAdmin); }
  if (grpDetails) { grpDetails.classList.toggle('form-hidden', isAdmin); grpDetails.classList.toggle('hidden', isAdmin); }
}

// =============================================
// FORM MODE TOGGLE
// =============================================
function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm) { loginForm.classList.toggle('form-hidden', isRegisterMode); loginForm.classList.toggle('hidden', isRegisterMode); }
  if (registerForm) { registerForm.classList.toggle('form-hidden', !isRegisterMode); registerForm.classList.toggle('hidden', !isRegisterMode); }

  updateUI();
  hideAlert();
}

// =============================================
// PASSWORD VISIBILITY TOGGLE
// =============================================
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  const icon = btn.querySelector('i');
  if (icon) { icon.className = isText ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'; }
}

// =============================================
// ALERT DISPLAY
// =============================================
function showAlert(message, isSuccess = false) {
  const box = document.getElementById('authAlert');
  if (!box) return;

  const icon = isSuccess
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-circle-xmark"></i>';

  box.innerHTML = `${icon} ${message}`;
  box.style.cssText = isSuccess
    ? 'background:#ecfdf5;color:#065f46;border:1.5px solid #6ee7b7;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;'
    : 'background:#fef2f2;color:#991b1b;border:1.5px solid #fca5a5;padding:14px 18px;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px;animation:slideDown .3s ease;';
  box.classList.remove('hidden');
}

function hideAlert() {
  const box = document.getElementById('authAlert');
  if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
}

// =============================================
// BUTTON LOADING STATE
// =============================================
function setLoading(btnId, loading, text, icon) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
  } else {
    btn.disabled = false;
    btn.innerHTML = `<i class="${icon}"></i> ${text}`;
  }
}

// =============================================
// LOGIN HANDLER
// =============================================
async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const identifier = document.getElementById('loginEmail').value.trim();
  const password   = document.getElementById('loginPassword').value;

  if (!identifier || !password) {
    showAlert(selectedRole === 'admin' 
      ? 'Please enter your Admin ID and password.' 
      : 'Please enter your Register Number and password.');
    return;
  }

  setLoading('loginBtn', true);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: identifier, identifier, password, role: selectedRole })
    });

    let data = {};
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', response.status, text.slice(0, 200));
      showAlert(`Server error (${response.status}). Please check backend is running.`);
      setLoading('loginBtn', false, 'Login to Portal', 'fa-solid fa-right-to-bracket');
      return;
    }

    if (!response.ok || !data.success) {
      showAlert(data.message || 'Invalid credentials. Please try again.');
      setLoading('loginBtn', false, 'Login to Portal', 'fa-solid fa-right-to-bracket');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showAlert('Login successful! Redirecting...', true);

    setTimeout(() => redirect(data.user?.role), 900);

  } catch (err) {
    console.error('Login error:', err);
    showAlert('Unable to connect to the server. Check your network connection.');
    setLoading('loginBtn', false, 'Login to Portal', 'fa-solid fa-right-to-bracket');
  }
}

// =============================================
// REGISTER HANDLER
// =============================================
async function handleRegister(e) {
  e.preventDefault();
  hideAlert();

  const full_name       = document.getElementById('regFullName').value.trim();
  const register_number = document.getElementById('regRegisterNo')?.value.trim() || '';
  const email           = document.getElementById('regEmail').value.trim();
  const password        = document.getElementById('regPassword').value;
  const year            = document.getElementById('regYear')?.value || '3';
  const phone           = document.getElementById('regPhone')?.value.trim() || '';

  if (!full_name || !email || !password) {
    showAlert('Please fill in all required fields.');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters long.');
    return;
  }

  setLoading('registerBtn', true);

  try {
    const payload = {
      full_name,
      register_number: selectedRole === 'student' ? register_number : null,
      email,
      password,
      role: selectedRole,
      year: selectedRole === 'student' ? parseInt(year) : null,
      phone: phone || null
    };

    const response = await fetch(`${API_BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    let data = {};
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', response.status, text.slice(0, 200));
      showAlert(`Server error (${response.status}). Please check backend is running.`);
      setLoading('registerBtn', false, 'Register Account', 'fa-solid fa-user-plus');
      return;
    }

    if (!response.ok || !data.success) {
      showAlert(data.message || 'Registration failed. Please check details and try again.');
      setLoading('registerBtn', false, 'Register Account', 'fa-solid fa-user-plus');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showAlert('Account created! Redirecting to dashboard...', true);
    setTimeout(() => redirect(data.user?.role), 1000);

  } catch (err) {
    console.error('Register error:', err);
    showAlert('Unable to connect to the server. Please try again.');
    setLoading('registerBtn', false, 'Register Account', 'fa-solid fa-user-plus');
  }
}