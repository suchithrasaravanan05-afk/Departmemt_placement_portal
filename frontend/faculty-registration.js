// ==========================================================================
// FACULTY-REGISTRATION.JS — RIT-CSBS PLACEMENT PORTAL
// Ramco Institute of Technology — Department of CSBS
// ==========================================================================

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api`
  : `${window.location.origin}/api`;

let isLoginEmailManuallyEdited = false;

document.addEventListener('DOMContentLoaded', () => {
  initFormListeners();
});

// Helper: Get element by ID
function el(id) {
  return document.getElementById(id);
}

// ==========================================================================
// FORM LISTENERS & REAL-TIME VALIDATION
// ==========================================================================
function initFormListeners() {
  const emailInput = el('facultyEmail');
  const loginEmailInput = el('facultyLoginEmail');
  const passwordInput = el('facultyPassword');
  const confirmPasswordInput = el('facultyConfirmPassword');
  const experienceInput = el('facultyExperience');
  const mobileInput = el('facultyMobile');

  // Auto-sync Email ID to Login Email ID
  if (emailInput && loginEmailInput) {
    emailInput.addEventListener('input', () => {
      if (!isLoginEmailManuallyEdited) {
        loginEmailInput.value = emailInput.value.trim();
      }
      validateField('facultyEmail');
    });

    loginEmailInput.addEventListener('input', () => {
      isLoginEmailManuallyEdited = true;
      validateField('facultyLoginEmail');
    });
  }

  // Real-time password criteria verification
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordCriteria(passwordInput.value);
      validateField('facultyPassword');
      if (confirmPasswordInput && confirmPasswordInput.value) {
        validateField('facultyConfirmPassword');
      }
    });
  }

  // Real-time confirm password check
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      validateField('facultyConfirmPassword');
    });
  }

  // Mobile number input formatting (digits only, max 10)
  if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
      mobileInput.value = mobileInput.value.replace(/[^0-9]/g, '').slice(0, 10);
      validateField('facultyMobile');
    });
  }

  // Experience number constraints
  if (experienceInput) {
    experienceInput.addEventListener('input', () => {
      if (experienceInput.value !== '') {
        const val = parseFloat(experienceInput.value);
        if (val < 0) experienceInput.value = 0;
        if (val > 50) experienceInput.value = 50;
      }
      validateField('facultyExperience');
    });
  }

  // Clear errors on field interaction
  const fields = [
    'facultyFullName', 'facultyGender', 'facultyDepartment',
    'facultyDesignation', 'facultyQualification', 'facultySpecialization'
  ];

  fields.forEach(fId => {
    const field = el(fId);
    if (field) {
      field.addEventListener('input', () => validateField(fId));
      field.addEventListener('change', () => validateField(fId));
    }
  });
}

// ==========================================================================
// PASSWORD CRITERIA CHECKER
// ==========================================================================
function updatePasswordCriteria(pw) {
  const criteria = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw)
  };

  updateCriteriaTag('critLength', criteria.length);
  updateCriteriaTag('critUpper', criteria.upper);
  updateCriteriaTag('critLower', criteria.lower);
  updateCriteriaTag('critNumber', criteria.number);
  updateCriteriaTag('critSpecial', criteria.special);

  return criteria.length && criteria.upper && criteria.lower && criteria.number && criteria.special;
}

function updateCriteriaTag(tagId, isMet) {
  const item = el(tagId);
  if (!item) return;

  if (isMet) {
    item.classList.remove('unmet');
    item.classList.add('met');
    const icon = item.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-circle-check';
  } else {
    item.classList.remove('met');
    item.classList.add('unmet');
    const icon = item.querySelector('i');
    if (icon) icon.className = 'fa-regular fa-circle';
  }
}

// ==========================================================================
// PASSWORD TOGGLE VISIBILITY
// ==========================================================================
function togglePasswordVisibility(inputId, btn) {
  const input = el(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btn.querySelector('i');
  if (icon) {
    if (isPassword) {
      icon.className = 'fa-regular fa-eye-slash';
      btn.title = 'Hide password';
    } else {
      icon.className = 'fa-regular fa-eye';
      btn.title = 'Show password';
    }
  }
}

// ==========================================================================
// FIELD-LEVEL VALIDATION
// ==========================================================================
function setFieldError(fieldId, errorMsg) {
  const group = el(fieldId)?.closest('.form-group');
  if (!group) return;

  if (errorMsg) {
    group.classList.add('has-error');
    let errSpan = group.querySelector('.field-error-msg');
    if (!errSpan) {
      errSpan = document.createElement('div');
      errSpan.className = 'field-error-msg';
      group.appendChild(errSpan);
    }
    errSpan.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${errorMsg}`;
  } else {
    group.classList.remove('has-error');
    const errSpan = group.querySelector('.field-error-msg');
    if (errSpan) errSpan.remove();
  }
}

function validateField(fieldId) {
  const val = el(fieldId)?.value.trim() || '';

  switch (fieldId) {
    case 'facultyFullName':
      if (!val) {
        setFieldError(fieldId, 'Please enter your full name');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyEmail':
      if (!val) {
        setFieldError(fieldId, 'Please enter a valid email ID');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setFieldError(fieldId, 'Please enter a valid email ID format');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyMobile':
      if (!val) {
        setFieldError(fieldId, 'Please enter a valid 10-digit mobile number');
        return false;
      }
      if (val.length !== 10 || !/^[6-9]\d{9}$/.test(val)) {
        setFieldError(fieldId, 'Please enter a valid 10-digit mobile number');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyGender':
      if (!val || val === 'Select Gender') {
        setFieldError(fieldId, 'Please select your gender');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyDepartment':
      if (!val || val === 'Select Department') {
        setFieldError(fieldId, 'Please select your department');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyDesignation':
      if (!val || val === 'Select Designation') {
        setFieldError(fieldId, 'Please select your designation');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyExperience':
      if (val === '') {
        setFieldError(fieldId, 'Please enter your years of experience');
        return false;
      }
      const exp = parseFloat(val);
      if (isNaN(exp) || exp < 0 || exp > 50) {
        setFieldError(fieldId, 'Experience must be between 0 and 50 years');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyQualification':
      if (!val) {
        setFieldError(fieldId, 'Please enter your qualification');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultySpecialization':
      if (!val) {
        setFieldError(fieldId, 'Please enter your specialization');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyLoginEmail':
      if (!val) {
        setFieldError(fieldId, 'Please enter email for login');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setFieldError(fieldId, 'Please enter a valid login email ID');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyPassword':
      const pw = el('facultyPassword')?.value || '';
      if (!pw) {
        setFieldError(fieldId, 'Password is required');
        return false;
      }
      if (pw.length < 8) {
        setFieldError(fieldId, 'Password must contain at least 8 characters');
        return false;
      }
      if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        setFieldError(fieldId, 'Password does not meet all complexity requirements');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    case 'facultyConfirmPassword':
      const pwVal = el('facultyPassword')?.value || '';
      const cpwVal = el('facultyConfirmPassword')?.value || '';
      if (!cpwVal) {
        setFieldError(fieldId, 'Please confirm your password');
        return false;
      }
      if (pwVal !== cpwVal) {
        setFieldError(fieldId, 'Passwords do not match');
        return false;
      }
      setFieldError(fieldId, null);
      return true;

    default:
      return true;
  }
}

// ============================================================
// ALERT HELPERS
// ============================================================
function showAlert(message, type = 'error') {
  const alertEl = el('regAlertBox');
  if (!alertEl) return;

  alertEl.className = `reg-alert ${type === 'success' ? 'alert-success' : 'alert-error'}`;
  alertEl.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <div>${escapeHtml(message)}</div>
  `;
  alertEl.classList.remove('hidden');

  // Scroll to alert smoothly
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideAlert() {
  const alertEl = el('regAlertBox');
  if (alertEl) alertEl.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// CLEAR FORM
// ==========================================================================
function clearFacultyForm() {
  const form = el('facultyRegistrationForm');
  if (form) form.reset();

  isLoginEmailManuallyEdited = false;
  hideAlert();

  // Clear all error classes and messages
  document.querySelectorAll('.form-group.has-error').forEach(g => {
    g.classList.remove('has-error');
    const err = g.querySelector('.field-error-msg');
    if (err) err.remove();
  });

  // Reset password criteria checklist
  updatePasswordCriteria('');

  // Reset password visibility toggles
  if (el('facultyPassword')) el('facultyPassword').type = 'password';
  if (el('facultyConfirmPassword')) el('facultyConfirmPassword').type = 'password';

  document.querySelectorAll('.btn-toggle-pw i').forEach(icon => {
    icon.className = 'fa-regular fa-eye';
  });

  el('facultyFullName')?.focus();
}

// ==========================================================================
// SUBMIT FORM (REGISTER FACULTY)
// ==========================================================================
async function handleFacultyRegistration(e) {
  e.preventDefault();
  hideAlert();

  // Validate all fields in order
  const fieldsToValidate = [
    'facultyFullName',
    'facultyEmail',
    'facultyMobile',
    'facultyGender',
    'facultyDepartment',
    'facultyDesignation',
    'facultyExperience',
    'facultyQualification',
    'facultySpecialization',
    'facultyLoginEmail',
    'facultyPassword',
    'facultyConfirmPassword'
  ];

  let firstInvalid = null;
  let allValid = true;

  for (const fieldId of fieldsToValidate) {
    const isValid = validateField(fieldId);
    if (!isValid) {
      allValid = false;
      if (!firstInvalid) firstInvalid = el(fieldId);
    }
  }

  if (!allValid) {
    showAlert('Please correct the highlighted fields before submitting.', 'error');
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Prepare faculty registration payload
  const payload = {
    name: el('facultyFullName').value.trim(),
    email: el('facultyEmail').value.trim(),
    mobile: el('facultyMobile').value.trim(),
    gender: el('facultyGender').value.trim(),
    department: el('facultyDepartment').value.trim(),
    designation: el('facultyDesignation').value.trim(),
    experience: parseFloat(el('facultyExperience').value.trim()),
    qualification: el('facultyQualification').value.trim(),
    specialization: el('facultySpecialization').value.trim(),
    password: el('facultyPassword').value
  };

  const submitBtn = el('btnRegisterFaculty');
  const originalBtnHtml = submitBtn.innerHTML;

  try {
    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Registering Faculty Account...';

    const response = await fetch(`${API_BASE}/faculty/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Show success modal
      showSuccessModal(payload);
    } else {
      const errorMsg = data.message || 'Registration failed. Please check your details and try again.';
      showAlert(errorMsg, 'error');
    }
  } catch (err) {
    console.error('Faculty registration network error:', err);
    showAlert('Unable to connect to the portal server. Please ensure the backend is running.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
}

// ==========================================================================
// SUCCESS MODAL & REDIRECTION
// ==========================================================================
function showSuccessModal(facultyData) {
  const modal = el('regSuccessModal');
  if (!modal) {
    showAlert('Faculty registration successful! You can now login to the Faculty Portal.', 'success');
    return;
  }

  if (el('modalFacultyName')) el('modalFacultyName').textContent = facultyData.name;
  if (el('modalFacultyEmail')) el('modalFacultyEmail').textContent = facultyData.email;
  if (el('modalFacultyDept')) el('modalFacultyDept').textContent = facultyData.department;
  if (el('modalFacultyDesig')) el('modalFacultyDesig').textContent = facultyData.designation;

  modal.classList.remove('hidden');
}

function redirectToFacultyLogin() {
  window.location.href = 'Form.html#faculty';
}
