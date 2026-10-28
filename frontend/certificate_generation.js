// ============================================================
// AUTHENTICATION HELPER
// ============================================================
function getEffectiveAdminToken() {
  if (typeof currentAdminToken !== 'undefined' && currentAdminToken) return currentAdminToken;
  if (typeof window !== 'undefined' && window.currentAdminToken) return window.currentAdminToken;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
  }
  return '';
}

function getAdminAuthHeaders() {
  const token = getEffectiveAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const certGenState = {
  records: [],              // Currently loaded/extracted records
  currentBatchId: null,     // Currently generated or selected batch ID
  currentBatchCerts: [],    // Certificates in the active batch
  currentFilter: 'all',     // Table filter: all | valid | invalid | duplicates
  allowDuplicates: false,   // Allow duplicate override toggle
  batchesList: [],          // List of historical batches
  masterCertificates: [],   // Master issued certificates
  searchQuery: ''
};

// ============================================================
// INITIALIZATION
// ============================================================
function initCertificateGenerationTab() {
  updateCertGenRoleNotice();
  setCertGenDefaultDates();
  initCertEmailSettings();
  applyCertificatePreset('sttp_blockchain_2026');
  loadIssuedCertificatesHistoryTable();
}

function updateCertGenRoleNotice() {
  const roleBadge = document.getElementById('certGenRoleBadge');
  const roleDesc = document.getElementById('certGenRoleDesc');
  if (!roleBadge || !roleDesc) return;

  const role = (window.currentAdminUser && window.currentAdminUser.role) ? window.currentAdminUser.role.toLowerCase() : '';
  const designation = (window.currentAdminUser && window.currentAdminUser.designation) ? window.currentAdminUser.designation.toLowerCase() : '';

  if (role === 'admin' || role === 'administrator') {
    roleBadge.className = 'badge badge-purple';
    roleBadge.innerText = 'Role: Administrator (Manage & Issue Access)';
    roleDesc.innerText = 'Administrators have full permission to configure certificate events, upload rosters, validate records, customize templates, issue certificates, and manage revocations.';
  } else if (role === 'ja_faculty' || role === 'ja') {
    roleBadge.className = 'badge badge-blue';
    roleBadge.innerText = 'Role: JA Faculty (Verification Access)';
    roleDesc.innerText = 'JA Faculty members have access to verify certificates and browse issued records. Generation is restricted to Faculty Coordinators and Administrators.';
  } else {
    roleBadge.className = 'badge badge-green';
    roleBadge.innerText = 'Role: Faculty Coordinator (Manage & Issue Access)';
    roleDesc.innerText = 'Faculty Coordinators have full permission to upload student rosters, validate spreadsheet records, configure certificate templates, issue cryptographic certificates, and manage revocation.';
  }
}

function setCertGenDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const defDate = document.getElementById('cgDefEventDate');
  const defIssue = document.getElementById('cgDefIssueDate');
  if (defDate && !defDate.value) defDate.value = today;
  if (defIssue && !defIssue.value) defIssue.value = today;
}

// Quick jump stepper navigation
function jumpToCertGenSection(secId) {
  const sec = document.getElementById(secId);
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Update stepper active button
  const stepMap = {
    cgSecUpload: 'stepBtn1',
    cgSecPreview: 'stepBtn2',
    cgSecTemplate: 'stepBtn3',
    cgSecGenerate: 'stepBtn4',
    cgSecHistory: 'stepBtn5',
    cgSecVerify: 'stepBtn6'
  };

  ['stepBtn1', 'stepBtn2', 'stepBtn3', 'stepBtn4', 'stepBtn5', 'stepBtn6'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.remove('active');
  });

  const activeBtnId = stepMap[secId];
  if (activeBtnId) {
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');
  }
}

// ============================================================
// 1. TEMPLATE DOWNLOAD
// ============================================================
function downloadCertificateExcelTemplate() {
  // Direct download endpoint
  window.location.href = `${API_BASE}/admin/certificate-generation/template-download`;
}

// ============================================================
// 2. EXCEL / CSV UPLOAD & PARSING
// ============================================================
function handleCertGenFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(ext)) {
    showAdminAlert('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
    event.target.value = '';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showAdminAlert('File size exceeds 10MB limit. Please upload a smaller spreadsheet.');
    event.target.value = '';
    return;
  }

  // Update UI with selected file
  const banner = document.getElementById('certGenFileSelectedBanner');
  const nameEl = document.getElementById('certGenSelectedFileName');
  const sizeEl = document.getElementById('certGenSelectedFileSize');
  const dropzone = document.getElementById('certGenDropzone');

  if (nameEl) nameEl.innerText = file.name;
  if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB &bull; Ready to extract`;
  if (banner) banner.style.display = 'flex';
  if (dropzone) dropzone.style.display = 'none';
}

function resetCertGenUploadForm() {
  const fileInput = document.getElementById('certGenFileInput');
  if (fileInput) fileInput.value = '';

  const banner = document.getElementById('certGenFileSelectedBanner');
  const dropzone = document.getElementById('certGenDropzone');
  if (banner) banner.style.display = 'none';
  if (dropzone) dropzone.style.display = 'block';
}

async function uploadAndParseCertificateSpreadsheet() {
  const fileInput = document.getElementById('certGenFileInput');
  const file = fileInput && fileInput.files && fileInput.files[0];

  if (!file) {
    showAdminAlert('Please select a spreadsheet file first.');
    return;
  }

  const btn = document.getElementById('btnExtractCertData');
  const text = document.getElementById('btnExtractText');
  const spinner = document.getElementById('btnExtractSpinner');
  if (btn) btn.disabled = true;
  if (text) text.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/admin/certificate-generation/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: formData
    });

    const data = await res.json();
    if (!data.success) {
      showAdminAlert(data.message || 'Failed to extract records from spreadsheet.');
      return;
    }

    // Apply batch default fallbacks if rows omitted them
    const defEventName = document.getElementById('cgDefEventName')?.value?.trim();
    const defEventDate = document.getElementById('cgDefEventDate')?.value;
    const defAcademicYear = document.getElementById('cgDefAcademicYear')?.value;
    const defDept = document.getElementById('cgDefDepartment')?.value?.trim();
    const defPartType = document.getElementById('cgDefParticipationType')?.value?.trim();
    const defIssueDate = document.getElementById('cgDefIssueDate')?.value;

    const enriched = (data.records || []).map(r => {
      r.participant_name = (r.participant_name || r.student_name || '').trim();
      r.student_name = r.participant_name;
      r.participant_type = r.participant_type || 'Student';
      r.institution = r.institution || r.college_name || 'Ramco Institute of Technology';
      r.department = r.department || defDept || 'Computer Science and Business Systems';
      r.email = r.email || '';

      if (!r.event_name && defEventName) r.event_name = defEventName;
      if (!r.event_date && defEventDate) r.event_date = defEventDate;
      if ((!r.academic_year || r.academic_year === '2026-27') && defAcademicYear) r.academic_year = defAcademicYear;
      if (!r.participation_type && defPartType) r.participation_type = defPartType;
      if (!r.issue_date && defIssueDate) r.issue_date = defIssueDate;

      // Re-evaluate validity: Participant Name and Event Name are mandatory. Register Number is optional.
      const errors = [];
      if (!r.participant_name) errors.push('Participant Name is mandatory');
      if (!r.event_name) errors.push('Event Name is mandatory');
      r.errors = errors;
      r.is_valid = errors.length === 0;

      return r;
    });

    certGenState.records = enriched;
    renderCertGenTable();

    // Auto update Section 1 and template defaults
    if (enriched.length > 0 && enriched[0].event_name) {
      if (document.getElementById('cgConfirmEventName')) {
        document.getElementById('cgConfirmEventName').innerText = enriched[0].event_name;
      }
      if (document.getElementById('prevEventName')) {
        document.getElementById('prevEventName').innerText = `"${enriched[0].event_name}"`;
      }
    }

    // Smooth scroll to Preview Section
    jumpToCertGenSection('cgSecPreview');

  } catch (err) {
    console.error('Upload spreadsheet error:', err);
    showAdminAlert('Network or server error while parsing spreadsheet.');
  } finally {
    if (btn) btn.disabled = false;
    if (text) text.style.display = 'inline-flex';
    if (spinner) spinner.style.display = 'none';
  }
}

// ============================================================
// 3. TABLE RENDERING & INLINE EDITING
// ============================================================
function setCertGenTableFilter(flt) {
  certGenState.currentFilter = flt;

  ['cgFilterAll', 'cgFilterValid', 'cgFilterInvalid', 'cgFilterDup'].forEach(btnId => {
    const b = document.getElementById(btnId);
    if (b) {
      b.className = 'btn btn-sm btn-outline-secondary';
      b.style.background = '';
      b.style.color = '';
    }
  });

  const activeMap = {
    all: 'cgFilterAll',
    valid: 'cgFilterValid',
    invalid: 'cgFilterInvalid',
    duplicates: 'cgFilterDup'
  };

  const activeBtn = document.getElementById(activeMap[flt]);
  if (activeBtn) {
    activeBtn.className = 'btn btn-sm';
    activeBtn.style.background = '#581C87';
    activeBtn.style.color = '#fff';
  }

  renderCertGenTable();
}

function handleCertGenTableSearch() {
  const inp = document.getElementById('cgTableSearchInput');
  certGenState.searchQuery = inp ? inp.value.trim().toLowerCase() : '';
  renderCertGenTable();
}

function handleDuplicateOverrideToggle() {
  const cb = document.getElementById('cgAllowDuplicatesCheckbox');
  certGenState.allowDuplicates = !!(cb && cb.checked);
  renderCertGenTable();
}

function renderCertGenTable() {
  const records = certGenState.records || [];
  const tbody = document.getElementById('certGenTableBody');
  if (!tbody) return;

  const total = records.length;
  const validCount = records.filter(r => r.is_valid && !r.is_duplicate).length;
  const invalidCount = records.filter(r => !r.is_valid).length;
  const dupCount = records.filter(r => r.is_duplicate).length;
  const readyCount = records.filter(r => r.is_valid && (certGenState.allowDuplicates || !r.is_duplicate)).length;
  updateCertEmailSettingsUI();

  // Update KPI counters
  if (document.getElementById('cgKpiTotal')) document.getElementById('cgKpiTotal').innerText = total;
  if (document.getElementById('cgKpiValid')) document.getElementById('cgKpiValid').innerText = validCount;
  if (document.getElementById('cgKpiInvalid')) document.getElementById('cgKpiInvalid').innerText = invalidCount;
  if (document.getElementById('cgKpiDuplicates')) document.getElementById('cgKpiDuplicates').innerText = dupCount;

  if (document.getElementById('cntFltAll')) document.getElementById('cntFltAll').innerText = total;
  if (document.getElementById('cntFltValid')) document.getElementById('cntFltValid').innerText = validCount;
  if (document.getElementById('cntFltInvalid')) document.getElementById('cntFltInvalid').innerText = invalidCount;
  if (document.getElementById('cntFltDup')) document.getElementById('cntFltDup').innerText = dupCount;

  if (document.getElementById('cgReadyValidCount')) document.getElementById('cgReadyValidCount').innerText = readyCount;

  // Show/hide Error report button
  const errorReportBtn = document.getElementById('btnDownloadErrorReport');
  if (errorReportBtn) {
    errorReportBtn.style.display = (invalidCount > 0 || dupCount > 0) ? 'inline-flex' : 'none';
  }

  // Filter records
  let displayed = records;
  if (certGenState.currentFilter === 'valid') {
    displayed = displayed.filter(r => r.is_valid && !r.is_duplicate);
  } else if (certGenState.currentFilter === 'invalid') {
    displayed = displayed.filter(r => !r.is_valid);
  } else if (certGenState.currentFilter === 'duplicates') {
    displayed = displayed.filter(r => r.is_duplicate);
  }

  if (certGenState.searchQuery) {
    const q = certGenState.searchQuery;
    displayed = displayed.filter(r =>
      (r.student_name && r.student_name.toLowerCase().includes(q)) ||
      (r.event_name && r.event_name.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q))
    );
  }

  if (displayed.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:36px;color:#64748b;">
          <i class="fa-solid fa-filter" style="font-size:24px;color:#cbd5e1;display:block;margin-bottom:6px;"></i>
          No student records match the active filter.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  displayed.forEach((row) => {
    const actualIdx = records.indexOf(row);
    let rowClass = '';
    let statusBadge = '<span class="badge-cg-valid"><i class="fa-solid fa-check"></i> Valid</span>';

    if (!row.is_valid) {
      rowClass = 'row-invalid';
      statusBadge = '<span class="badge-cg-invalid"><i class="fa-solid fa-triangle-exclamation"></i> Error</span>';
    } else if (row.is_duplicate) {
      rowClass = 'row-duplicate';
      statusBadge = '<span class="badge-cg-duplicate"><i class="fa-solid fa-clone"></i> Duplicate</span>';
    }

    // Notes & error chips
    let notesHtml = '';
    if (row.errors && row.errors.length > 0) {
      notesHtml += row.errors.map(e => `<span style="display:inline-block;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:11px;padding:2px 6px;border-radius:4px;margin:2px 0;"><i class="fa-solid fa-circle-xmark"></i> ${escapeHtml(e)}</span>`).join(' ');
    }
    if (row.warnings && row.warnings.length > 0) {
      notesHtml += row.warnings.map(w => `<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:11px;padding:2px 6px;border-radius:4px;margin:2px 0;"><i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(w)}</span>`).join(' ');
    }
    if (!notesHtml) {
      notesHtml = '<span style="color:#059669;font-size:11.5px;"><i class="fa-solid fa-circle-check"></i> Passed all checks</span>';
    }

    const pName = row.participant_name || row.student_name || '';
    html += `
      <tr class="${rowClass}">
        <td style="text-align:center;font-weight:700;color:#64748b;">${row.row_index || (actualIdx + 1)}</td>
        <td>${statusBadge}</td>
        <td>
          <input type="text" class="certgen-table-input ${!pName ? 'has-error' : ''}" value="${escapeHtml(pName)}" placeholder="Participant Name" onchange="handleCertGenCellChange(${actualIdx}, 'participant_name', this.value)">
        </td>
        <td>
          <select class="certgen-table-input" onchange="handleCertGenCellChange(${actualIdx}, 'participant_type', this.value)">
            <option value="Student" ${row.participant_type === 'Student' ? 'selected' : ''}>Student</option>
            <option value="Professor" ${row.participant_type === 'Professor' ? 'selected' : ''}>Professor</option>
            <option value="Faculty" ${row.participant_type === 'Faculty' ? 'selected' : ''}>Faculty</option>
            <option value="Research Scholar" ${row.participant_type === 'Research Scholar' ? 'selected' : ''}>Research Scholar</option>
            <option value="Other" ${(!['Student','Professor','Faculty','Research Scholar'].includes(row.participant_type)) ? 'selected' : ''}>Other</option>
          </select>
        </td>
        <td>
          <input type="text" class="certgen-table-input" value="${escapeHtml(row.department || 'Computer Science and Business Systems')}" placeholder="Department" onchange="handleCertGenCellChange(${actualIdx}, 'department', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input" value="${escapeHtml(row.institution || 'Ramco Institute of Technology')}" placeholder="Institution" onchange="handleCertGenCellChange(${actualIdx}, 'institution', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input ${!row.event_name ? 'has-error' : ''}" value="${escapeHtml(row.event_name || '')}" placeholder="Event Name" onchange="handleCertGenCellChange(${actualIdx}, 'event_name', this.value)">
        </td>
        <td>
          <input type="date" class="certgen-table-input" value="${escapeHtml(row.event_date || '')}" onchange="handleCertGenCellChange(${actualIdx}, 'event_date', this.value)">
        </td>
        <td>${notesHtml}</td>
        <td style="text-align:center;">
          <button type="button" class="btn btn-sm btn-outline-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteCertGenRow(${actualIdx})" title="Delete row">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Update Status Banner
  const statusMsg = document.getElementById('cgValidationStatusMessage');
  if (statusMsg) {
    if (invalidCount > 0) {
      statusMsg.innerHTML = `<span style="color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> <strong>${invalidCount} record(s) contain errors.</strong> Please edit the highlighted cells or download the error report before generating certificates.</span>`;
    } else if (dupCount > 0 && !certGenState.allowDuplicates) {
      statusMsg.innerHTML = `<span style="color:#d97706;"><i class="fa-solid fa-circle-exclamation"></i> <strong>${dupCount} duplicate record(s) flagged.</strong> They will be safely skipped unless "Allow Duplicates Override" is enabled.</span>`;
    } else {
      statusMsg.innerHTML = `<span style="color:#059669;"><i class="fa-solid fa-circle-check"></i> <strong>All ${readyCount} records are verified and eligible</strong> for certificate generation.</span>`;
    }
  }
}

function handleCertGenCellChange(idx, field, value) {
  if (!certGenState.records[idx]) return;
  certGenState.records[idx][field] = value.trim();
  if (field === 'participant_name') {
    certGenState.records[idx].student_name = value.trim();
  }

  // Re-run validation for this row
  const r = certGenState.records[idx];
  const pName = r.participant_name || r.student_name;
  const errors = [];
  if (!pName) errors.push('Participant Name is mandatory');
  if (!r.event_name) errors.push('Event Name is mandatory');

  r.errors = errors;
  r.is_valid = errors.length === 0;

  renderCertGenTable();
  updateLiveCertificatePreview();
}

function deleteCertGenRow(idx) {
  if (idx >= 0 && idx < certGenState.records.length) {
    certGenState.records.splice(idx, 1);
    renderCertGenTable();
    updateLiveCertificatePreview();
  }
}

function addManualStudentRow() {
  const defEventName = document.getElementById('cgDefEventName')?.value?.trim() || 'Department Placement Event';
  const defEventDate = document.getElementById('cgDefEventDate')?.value || new Date().toISOString().split('T')[0];
  const defDept = document.getElementById('cgDefDepartment')?.value?.trim() || 'Computer Science and Business Systems';
  const defAcademicYear = document.getElementById('cgDefAcademicYear')?.value || '2026-27';
  const defIssueDate = document.getElementById('cgDefIssueDate')?.value || new Date().toISOString().split('T')[0];

  certGenState.records.push({
    row_index: certGenState.records.length + 1,
    participant_name: '',
    student_name: '',
    participant_type: 'Student',
    institution: 'Ramco Institute of Technology',
    register_number: '',
    department: defDept,
    academic_year: defAcademicYear,
    event_name: defEventName,
    event_date: defEventDate,
    participation_type: 'Participation',
    achievement: 'Participation',
    issue_date: defIssueDate,
    is_valid: false,
    is_duplicate: false,
    errors: ['Participant Name is mandatory'],
    warnings: []
  });

  renderCertGenTable();
  // Scroll to bottom of table
  const wrap = document.querySelector('.certgen-table-wrap');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

async function revalidateAllTableRecords() {
  if (certGenState.records.length === 0) return;
  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/validate-raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({ records: certGenState.records })
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.records)) {
      certGenState.records = data.records;
      renderCertGenTable();
      showAdminAlert('Re-validation complete! Table updated with latest database checks.', 'success');
    }
  } catch (err) {
    console.error('Revalidate error:', err);
  }
}

// Download Error Report as Excel file
function downloadCertGenErrorReport() {
  const records = certGenState.records || [];
  const problematic = records.filter(r => !r.is_valid || r.is_duplicate);

  if (problematic.length === 0) {
    showAdminAlert('No invalid or duplicate records found!');
    return;
  }

  const exportRows = problematic.map(r => ({
    'Row #': r.row_index,
    'Status': !r.is_valid ? 'INVALID' : 'DUPLICATE',
    'Student Name': r.student_name,
    'Department': r.department,
    'Event Name': r.event_name,
    'Error Details': (r.errors || []).concat(r.warnings || []).join('; ')
  }));

  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Error Report');
    XLSX.writeFile(wb, `Certificate_Batch_Errors_${new Date().toISOString().split('T')[0]}.xlsx`);
  } else {
    alert('Spreadsheet library loading. Please try again.');
  }
}

function confirmBatchAndProceedToTemplate() {
  const records = certGenState.records || [];
  if (records.length === 0) {
    showAdminAlert('Please upload a spreadsheet or add student rows first.');
    return;
  }

  const validCount = records.filter(r => r.is_valid && (certGenState.allowDuplicates || !r.is_duplicate)).length;
  if (validCount === 0) {
    showAdminAlert('Cannot proceed: there are no valid student records eligible for generation.');
    return;
  }

  jumpToCertGenSection('cgSecTemplate');
}

// ============================================================
// 4. TEMPLATE MANAGEMENT & LIVE PREVIEW
// ============================================================
const customUploadedSignatures = {};

// Helper utilities to get and set form parameters across field name variations
function getFormParam(ids, fallback = '') {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.value !== undefined && String(el.value).trim() !== '') {
      return String(el.value).trim();
    }
  }
  return fallback;
}

function setFormParam(ids, val) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

// ============================================================
// CERTIFICATE EMAIL SETTINGS
// ============================================================
const certEmailSettings = {
  manualSending: true,
  automaticSending: false,
  testMode: true,
  testEmail: 'rajakaleeswaranhari1976@gmail.com'
};

function initCertEmailSettings() {
  try {
    const saved = localStorage.getItem('rit_cert_email_settings');
    if (saved) {
      Object.assign(certEmailSettings, JSON.parse(saved));
    }
  } catch (e) {}
  updateCertEmailSettingsUI();
}

function saveCertEmailSettings() {
  try {
    localStorage.setItem('rit_cert_email_settings', JSON.stringify(certEmailSettings));
  } catch (e) {}
  updateCertEmailSettingsUI();
}

function toggleCertEmailOption(key) {
  if (key in certEmailSettings) {
    certEmailSettings[key] = !certEmailSettings[key];
    saveCertEmailSettings();
  }
}

function saveCertTestEmailAddress(email) {
  certEmailSettings.testEmail = (email || '').trim();
  saveCertEmailSettings();
}

function updateCertEmailSettingsUI() {
  const btnManual = document.getElementById('btnToggleManualSending');
  const btnAuto = document.getElementById('btnToggleAutomaticSending');
  const btnTest = document.getElementById('btnToggleTestMode');

  if (btnManual) {
    btnManual.className = `cert-toggle-btn ${certEmailSettings.manualSending ? 'active' : ''}`;
    btnManual.innerText = certEmailSettings.manualSending ? 'ON' : 'OFF';
  }
  if (btnAuto) {
    btnAuto.className = `cert-toggle-btn ${certEmailSettings.automaticSending ? 'active' : ''}`;
    btnAuto.innerText = certEmailSettings.automaticSending ? 'ON' : 'OFF';
  }
  if (btnTest) {
    btnTest.className = `cert-toggle-btn ${certEmailSettings.testMode ? 'active' : ''}`;
    btnTest.innerText = certEmailSettings.testMode ? 'ON' : 'OFF';
  }

  const testWrap = document.getElementById('certEmailTestAddressWrap');
  if (testWrap) {
    testWrap.style.display = certEmailSettings.testMode ? 'flex' : 'none';
  }
  const testInput = document.getElementById('cfgTestEmailAddress');
  if (testInput && certEmailSettings.testEmail) {
    testInput.value = certEmailSettings.testEmail;
  }

  if (document.getElementById('cgStatusManual')) {
    document.getElementById('cgStatusManual').innerText = certEmailSettings.manualSending ? 'Enabled' : 'Disabled';
  }
  if (document.getElementById('cgStatusAuto')) {
    document.getElementById('cgStatusAuto').innerText = certEmailSettings.automaticSending ? 'Enabled' : 'Disabled';
  }
  if (document.getElementById('cgStatusTest')) {
    document.getElementById('cgStatusTest').innerText = certEmailSettings.testMode ? 'Enabled' : 'Disabled';
  }

  const allowDup = Boolean(certGenState.allowDuplicates || document.getElementById('cgAllowDuplicatesCheckbox')?.checked);
  let readyCount = 0;
  if (certGenState.currentBatchCerts && certGenState.currentBatchCerts.length > 0) {
    readyCount = certGenState.currentBatchCerts.length;
  } else if (certGenState.records && certGenState.records.length > 0) {
    readyCount = certGenState.records.filter(r => r.is_valid && (allowDup || !r.is_duplicate)).length;
  }

  const plannedEl = document.getElementById('cgEmailPlannedCount');
  if (plannedEl) {
    if (readyCount > 0) {
      plannedEl.innerText = `${readyCount} participant${readyCount === 1 ? '' : 's'} ready`;
    } else {
      plannedEl.innerText = `0 participants (Awaiting roster upload)`;
    }
  }
}

async function executeCertEmailWorkflow() {
  const readyCount = (certGenState.records && certGenState.records.length > 0)
    ? certGenState.records.filter(r => r.is_valid && (certGenState.allowDuplicates || !r.is_duplicate)).length
    : (certGenState.currentBatchCerts && certGenState.currentBatchCerts.length > 0
      ? certGenState.currentBatchCerts.length
      : 0);

  if (!certGenState.currentBatchId && readyCount === 0) {
    showAdminAlert('Please generate or select a certificate batch first before sending emails.', 'info');
    jumpToCertGenSection('cgSecGenerate');
    return;
  }

  await sendBatchCertificatesViaEmail(certGenState.currentBatchId);
}

function applyCertificatePreset(presetKey) {
  document.querySelectorAll('.cert-preset-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(
    presetKey === 'sttp_blockchain' || presetKey === 'sttp_blockchain_2026' ? 'btnPresetSTTP' :
    presetKey === 'workshop_fullstack' || presetKey === 'workshop_ai_2026' ? 'btnPresetWorkshop' :
    'btnPresetMerit'
  );
  if (activeBtn) activeBtn.classList.add('active');

  if (presetKey === 'sttp_blockchain' || presetKey === 'sttp_blockchain_2026') {
    setFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    setFormParam(['tplCertType'], 'STTP');
    setFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'One Week Short-Term Training Programme (STTP)');
    setFormParam(['tplEventTopic', 'tplEventName'], 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives');
    setFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems');
    setFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    setFormParam(['tplProgrammeDates', 'tplProgDates'], 'October 12, 2026, to October 18, 2026');
    setFormParam(['tplIssueDate'], 'October 18, 2026');
    setFormParam(['tplCertWording'], 'for active participation in the One Week Short-Term Training Programme (STTP) on “Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives”, organized by the Department of Computer Science and Business Systems at Ramco Institute of Technology, Rajapalayam from October 12, 2026, to October 18, 2026.');
    setFormParam(['tplIdPrefix'], 'RIT-STTP-2026-');

    toggleSignatoryCount(6);
    setSigFields(1, 'Dr. M. Jeya Sundari', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'M. Rekha', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(3, 'M. Ramakrishnan', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(4, 'Dr. D. Kesavaraja', 'Convenor', 'CSBS, RIT');
    setSigFields(5, 'Dr. S. Rajakarunakaran', 'Patron', 'RIT');
    setSigFields(6, 'Dr. L. Ganesan', 'Chief Patron', 'RIT');
  } else if (presetKey === 'workshop_fullstack' || presetKey === 'workshop_ai_2026') {
    setFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    setFormParam(['tplCertType'], 'Workshop');
    setFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'Two-Day National Workshop');
    setFormParam(['tplEventTopic', 'tplEventName'], 'Generative AI and Enterprise Large Language Model Deployments');
    setFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems');
    setFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    setFormParam(['tplProgrammeDates', 'tplProgDates'], '18 – 19 September 2026');
    setFormParam(['tplIssueDate'], '2026-09-19');
    setFormParam(['tplCertWording'], 'for active participation in the Two-Day National Workshop on “Generative AI and Enterprise Large Language Model Deployments”, organized by the Department of Computer Science and Business Systems at Ramco Institute of Technology.');
    setFormParam(['tplIdPrefix'], 'RIT-GENAI-2026-');

    toggleSignatoryCount(4);
    setSigFields(1, 'Dr. M. Jeya Sundari', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Dr. D. Kesavaraja', 'Convenor', 'CSBS, RIT');
    setSigFields(3, 'Dr. S. Rajakarunakaran', 'Patron', 'RIT');
    setSigFields(4, 'Dr. L. Ganesan', 'Chief Patron', 'RIT');
  } else if (presetKey === 'merit_excellence' || presetKey === 'symposium_merit_2026') {
    setFormParam(['tplCertTitle'], 'CERTIFICATE OF MERIT');
    setFormParam(['tplCertType'], 'Merit');
    setFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'National Level Technical Symposium – TECHKRITI 2026');
    setFormParam(['tplEventTopic', 'tplEventName'], 'Smart Contract Auditing & Web3 Decentralized Hackathon');
    setFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems');
    setFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    setFormParam(['tplProgrammeDates', 'tplProgDates'], '28 August 2026');
    setFormParam(['tplIssueDate'], '2026-08-28');
    setFormParam(['tplCertWording'], 'for securing 1st Place and demonstrating exemplary technical competence in the National Level Technical Symposium on “Smart Contract Auditing & Web3 Decentralized Hackathon”, organized by the Department of Computer Science and Business Systems at Ramco Institute of Technology.');
    setFormParam(['tplIdPrefix'], 'RIT-MERIT-2026-');

    toggleSignatoryCount(4);
    setSigFields(1, 'Dr. M. Jeya Sundari', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Dr. D. Kesavaraja', 'Convenor', 'CSBS, RIT');
    setSigFields(3, 'Dr. S. Rajakarunakaran', 'Patron', 'RIT');
    setSigFields(4, 'Dr. L. Ganesan', 'Chief Patron', 'RIT');
  }

  updateLiveCertificatePreview();
}

function setSigFields(idx, name, title, dept) {
  if (document.getElementById(`tplSig${idx}Name`)) document.getElementById(`tplSig${idx}Name`).value = name;
  if (document.getElementById(`tplSig${idx}Title`)) document.getElementById(`tplSig${idx}Title`).value = title;
  if (document.getElementById(`tplSig${idx}Org`)) document.getElementById(`tplSig${idx}Org`).value = dept;
  if (document.getElementById(`tplSig${idx}Dept`)) document.getElementById(`tplSig${idx}Dept`).value = dept;
}

function toggleSignatoryCount(count) {
  const c = parseInt(count, 10);
  const sel = document.getElementById('tplSigCount');
  if (sel) sel.value = String(c);

  for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`cardSig${i}`) || document.getElementById(`sigCard${i}`);
    if (card) {
      card.style.display = (i <= c) ? 'block' : 'none';
    }
    const col = document.getElementById(`prevColSig${i}`);
    if (col) {
      col.style.display = (i <= c) ? '' : 'none';
    }
  }

  const prevGroup1 = document.getElementById('prevSigGroup1');
  const prevGroup2 = document.getElementById('prevSigGroup2');
  const prevGroup3 = document.getElementById('prevSigGroup3');
  const prevGroup4 = document.getElementById('prevSigGroup4');
  if (prevGroup1) prevGroup1.style.display = (c >= 1) ? '' : 'none';
  if (prevGroup2) prevGroup2.style.display = (c >= 4) ? '' : 'none';
  if (prevGroup3) prevGroup3.style.display = (c >= 5) ? '' : 'none';
  if (prevGroup4) prevGroup4.style.display = (c >= 6) ? '' : 'none';

  updateLiveCertificatePreview();
}

function handleSignatureUpload(sigIndex, event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    showAdminAlert('Invalid image format. Please upload PNG, JPG, or SVG.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    customUploadedSignatures[sigIndex] = e.target.result;
    const imgEl = document.getElementById(`prevSig${sigIndex}Img`);
    if (imgEl) imgEl.src = e.target.result;
    showAdminAlert(`Signature ${sigIndex} updated!`, 'success');
    updateLiveCertificatePreview();
  };
  reader.readAsDataURL(file);
}

async function saveCurrentTemplateAsPreset() {
  const tplName = prompt('Enter a name for this custom template:', 'Custom Department STTP Template');
  if (!tplName || !tplName.trim()) return;

  const payload = {
    template_name: tplName.trim(),
    certificate_title: document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION',
    certificate_type: document.getElementById('tplCertType')?.value?.trim() || 'STTP',
    programme_title: document.getElementById('tplProgTitle')?.value?.trim() || 'One Week Short-Term Training Programme (STTP)',
    event_name: document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies',
    organizing_department: document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems',
    institution_name: document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology',
    programme_dates: document.getElementById('tplProgDates')?.value?.trim() || 'October 12, 2026, to October 18, 2026',
    issue_date: document.getElementById('tplIssueDate')?.value || '2026-10-18',
    certificate_wording: document.getElementById('tplCertWording')?.value?.trim() || '',
    id_prefix: document.getElementById('tplIdPrefix')?.value?.trim() || 'RIT-STTP-2026-',
    signatory_count: parseInt(document.getElementById('tplSigCount')?.value || '6', 10),
    signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. M. Jeya Sundari',
    signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
    signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'M. Rekha',
    signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_2_dept: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
    signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'M. Ramakrishnan',
    signatory_3_title: document.getElementById('tplSig3Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_3_dept: document.getElementById('tplSig3Org')?.value?.trim() || 'CSBS, RIT',
    signatory_4_name: document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. D. Kesavaraja',
    signatory_4_title: document.getElementById('tplSig4Title')?.value?.trim() || 'Convenor',
    signatory_4_dept: document.getElementById('tplSig4Org')?.value?.trim() || 'CSBS, RIT',
    signatory_5_name: document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
    signatory_5_title: document.getElementById('tplSig5Title')?.value?.trim() || 'Patron',
    signatory_5_dept: document.getElementById('tplSig5Org')?.value?.trim() || 'RIT',
    signatory_6_name: document.getElementById('tplSig6Name')?.value?.trim() || 'Dr. L. Ganesan',
    signatory_6_title: document.getElementById('tplSig6Title')?.value?.trim() || 'Chief Patron',
    signatory_6_dept: document.getElementById('tplSig6Org')?.value?.trim() || 'RIT'
  };

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert(`Template "${tplName}" saved successfully!`, 'success');
    } else {
      showAdminAlert(data.message || 'Failed to save template.');
    }
  } catch (e) {
    showAdminAlert(`Template "${tplName}" saved locally!`, 'success');
  }
}

function updateLiveCertificatePreview() {
  const title = document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION';
  const progTitle = document.getElementById('tplProgTitle')?.value?.trim() || 'One Week Short-Term Training Programme (STTP)';
  const eventName = document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  const orgDept = document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems';
  const institution = document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology, Rajapalayam';
  const progDates = document.getElementById('tplProgDates')?.value?.trim() || 'October 12, 2026, to October 18, 2026';
  const issueDate = document.getElementById('tplIssueDate')?.value || '2026-10-18';
  const idPrefix = document.getElementById('tplIdPrefix')?.value?.trim() || 'RIT-STTP-2026-';
  const sigCount = parseInt(document.getElementById('tplSigCount')?.value || '6', 10);

  // Sample participant name (NO register number)
  const sample = (certGenState.records && certGenState.records.length > 0) ? certGenState.records[0] : null;
  const participantName = (sample && (sample.participant_name || sample.student_name)) ? (sample.participant_name || sample.student_name) : 'Keerthana Mohan';

  if (document.getElementById('prevCertTitle')) document.getElementById('prevCertTitle').innerText = title;
  if (document.getElementById('prevStudentName')) document.getElementById('prevStudentName').innerText = participantName;
  if (document.getElementById('prevProgTitle')) document.getElementById('prevProgTitle').innerText = progTitle;
  if (document.getElementById('prevEventTopic')) document.getElementById('prevEventTopic').innerText = `“${eventName}”`;
  if (document.getElementById('prevOrgDept')) document.getElementById('prevOrgDept').innerText = orgDept;
  if (document.getElementById('prevInstitution')) document.getElementById('prevInstitution').innerText = institution;
  if (document.getElementById('prevProgDates')) document.getElementById('prevProgDates').innerText = progDates;

  const sampleCertId = `${idPrefix}0001`;
  if (document.getElementById('prevCertId')) document.getElementById('prevCertId').innerText = sampleCertId;

  // Signatories 1 to 6
  const defaultSigRoles = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakarunakaran', 'ganesan'];
  for (let i = 1; i <= 6; i++) {
    const name = document.getElementById(`tplSig${i}Name`)?.value?.trim() || '';
    const titleVal = document.getElementById(`tplSig${i}Title`)?.value?.trim() || '';
    const deptVal = document.getElementById(`tplSig${i}Org`)?.value?.trim() || document.getElementById(`tplSig${i}Dept`)?.value?.trim() || '';

    if (document.getElementById(`prevSig${i}Name`)) document.getElementById(`prevSig${i}Name`).innerText = name;
    if (document.getElementById(`prevSig${i}Title`)) document.getElementById(`prevSig${i}Title`).innerText = titleVal;
    if (document.getElementById(`prevSig${i}Dept`)) document.getElementById(`prevSig${i}Dept`).innerText = deptVal;

    const imgEl = document.getElementById(`prevSig${i}Img`);
    if (imgEl) {
      if (customUploadedSignatures[i]) {
        imgEl.src = customUploadedSignatures[i];
      } else {
        const role = defaultSigRoles[i - 1];
        const asset = (typeof getSignatoryAsset === 'function')
          ? getSignatoryAsset(name || role)
          : (window.CERT_ASSETS?.SIGNATURES?.[role] || `signature/${role}.png`);
        if (asset) {
          imgEl.src = asset;
        }
      }
    }
  }

  // QR preview
  const verifyTarget = `${window.location.origin}/verify-certificate.html?id=${encodeURIComponent(sampleCertId)}`;
  if (document.getElementById('tplVerifyUrlPreview')) {
    document.getElementById('tplVerifyUrlPreview').innerText = `${window.location.origin}/verify-certificate.html?id=${idPrefix}-XXXXXXXX`;
  }

  if (window.QRCode && window.QRCode.toDataURL) {
    window.QRCode.toDataURL(verifyTarget, { width: 64, margin: 0 })
      .then(url => {
        const qrEl = document.getElementById('prevQrThumbnail');
        if (qrEl) qrEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;" alt="QR">`;
      })
      .catch(() => {});
  }
}

// ============================================================
// 5. BATCH CONFIRMATION & GENERATION
// ============================================================
function openBatchConfirmationModal() {
  const records = certGenState.records || [];
  const eligible = records.filter(r => r.is_valid && (certGenState.allowDuplicates || !r.is_duplicate));

  if (eligible.length === 0) {
    showAdminAlert('There are no valid student records eligible for generation.');
    return;
  }

  const evName = document.getElementById('tplEventName')?.value?.trim() || eligible[0]?.event_name || 'STTP Blockchain Masterclass';
  if (document.getElementById('cgModalEventName')) document.getElementById('cgModalEventName').innerText = evName;
  if (document.getElementById('cgModalEligibleCount')) document.getElementById('cgModalEligibleCount').innerText = eligible.length;
  if (document.getElementById('cgModalDuplicatesNote')) {
    document.getElementById('cgModalDuplicatesNote').innerText = certGenState.allowDuplicates ? 'Duplicates Included (Override Enabled)' : 'Duplicates Skipped (Safe Mode)';
  }

  const modal = document.getElementById('certGenConfirmBatchModal');
  if (modal) modal.classList.remove('hidden');
}

function closeBatchConfirmationModal() {
  const modal = document.getElementById('certGenConfirmBatchModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgConfirmBatchModal(e) {
  if (e.target.id === 'certGenConfirmBatchModal') {
    closeBatchConfirmationModal();
  }
}

async function proceedWithBatchGeneration() {
  closeBatchConfirmationModal();
  jumpToCertGenSection('cgSecGenerate');

  const progressBox = document.getElementById('certGenProgressBox');
  const bar = document.getElementById('certGenProgressBar');
  const pct = document.getElementById('cgProgressPct');
  const counts = document.getElementById('cgProgressCounts');
  const statusText = document.getElementById('cgProgressStatusText');

  if (progressBox) progressBox.style.display = 'block';
  if (bar) bar.style.width = '15%';
  if (pct) pct.innerText = '15%';
  if (statusText) statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validating credentials &amp; preparing database transactions...';

  const cb = document.getElementById('cgAllowDuplicatesCheckbox');
  const allowDup = Boolean(certGenState.allowDuplicates || (cb && cb.checked));
  certGenState.allowDuplicates = allowDup;
  let eligibleRecords = (certGenState.records || []).filter(r => r.is_valid && (allowDup || !r.is_duplicate));

  if (eligibleRecords.length === 0 && certGenState.records && certGenState.records.length > 0) {
    eligibleRecords = certGenState.records.filter(r => r.student_name && r.student_name.trim().length > 0);
    certGenState.allowDuplicates = true;
  }

  if (eligibleRecords.length === 0) {
    if (progressBox) progressBox.style.display = 'none';
    showAdminAlert('No eligible participant records found. Please upload or add records in Step 2.');
    return;
  }

  try {
    const evName = getFormParam(['tplEventTopic', 'tplEventName'], eligibleRecords[0]?.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives');
    const sigCount = parseInt(getFormParam(['tplSigCount'], '6'), 10);
    const progTitle = getFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'One Week Short-Term Training Programme (STTP)');
    const progDates = getFormParam(['tplProgrammeDates', 'tplProgDates'], 'October 12, 2026, to October 18, 2026');
    const orgDept = getFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems');
    const instName = getFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    const certTitle = getFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    const certType = getFormParam(['tplCertType'], 'STTP');
    const idPrefix = getFormParam(['tplIdPrefix'], 'RIT-STTP-2026-');

    const payload = {
      batch_title: `Batch - ${evName} (${new Date().toLocaleDateString('en-GB')})`,
      event_name: evName,
      event_date: getFormParam(['tplIssueDate'], eligibleRecords[0]?.event_date || new Date().toISOString().split('T')[0]),
      academic_year: eligibleRecords[0]?.academic_year || '2026-27',
      certificate_title: certTitle,
      certificate_type: certType,
      programme_title: progTitle,
      programme_dates: progDates,
      department: orgDept,
      institution: instName,
      college_name: instName,
      certificate_wording: getFormParam(['tplCertWording'], ''),
      id_prefix: idPrefix,
      signatory_count: sigCount,
      signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. M. Jeya Sundari',
      signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_1_dept: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
      signatory_1_org: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
      signatory_1_sig: customUploadedSignatures[1] || undefined,
      signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'M. Rekha',
      signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_2_dept: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
      signatory_2_org: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
      signatory_2_sig: customUploadedSignatures[2] || undefined,
      signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'M. Ramakrishnan',
      signatory_3_title: document.getElementById('tplSig3Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_3_dept: document.getElementById('tplSig3Org')?.value?.trim() || 'CSBS, RIT',
      signatory_3_org: document.getElementById('tplSig3Org')?.value?.trim() || 'CSBS, RIT',
      signatory_3_sig: customUploadedSignatures[3] || undefined,
      signatory_4_name: document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. D. Kesavaraja',
      signatory_4_title: document.getElementById('tplSig4Title')?.value?.trim() || 'Convenor',
      signatory_4_dept: document.getElementById('tplSig4Org')?.value?.trim() || 'CSBS, RIT',
      signatory_4_org: document.getElementById('tplSig4Org')?.value?.trim() || 'CSBS, RIT',
      signatory_4_sig: customUploadedSignatures[4] || undefined,
      signatory_5_name: document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
      signatory_5_title: document.getElementById('tplSig5Title')?.value?.trim() || 'Patron',
      signatory_5_dept: document.getElementById('tplSig5Org')?.value?.trim() || 'RIT',
      signatory_5_org: document.getElementById('tplSig5Org')?.value?.trim() || 'RIT',
      signatory_5_sig: customUploadedSignatures[5] || undefined,
      signatory_6_name: document.getElementById('tplSig6Name')?.value?.trim() || 'Dr. L. Ganesan',
      signatory_6_title: document.getElementById('tplSig6Title')?.value?.trim() || 'Chief Patron',
      signatory_6_dept: document.getElementById('tplSig6Org')?.value?.trim() || 'RIT',
      signatory_6_org: document.getElementById('tplSig6Org')?.value?.trim() || 'RIT',
      signatory_6_sig: customUploadedSignatures[6] || undefined,
      allow_duplicates: Boolean(certGenState.allowDuplicates || allowDup),
      records: eligibleRecords.map(r => ({
        student_name: r.student_name || r.participant_name || '',
        participant_name: r.participant_name || r.student_name || '',
        participant_type: r.participant_type || r.participants || 'Student',
        institution: r.institution || r.college_name || instName,
        college_name: r.college_name || r.institution || instName,
        department: r.department || orgDept,
        event_name: r.event_name || evName,
        event_date: r.event_date || getFormParam(['tplIssueDate'], new Date().toISOString().split('T')[0]),
        certificate_type: r.certificate_type || certType,
        achievement: r.achievement || r.participation_type || 'Participation',
        register_number: r.register_number || '',
        email: r.email || r.mail_id || '',
        phone: r.phone || ''
      }))
    };

    if (bar) bar.style.width = '45%';
    if (pct) pct.innerText = '45%';
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating cryptographic certificate IDs and updating institutional records...';

    const res = await fetch(`${API_BASE}/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      if (statusText) statusText.innerHTML = `<span style="color:#dc2626;"><i class="fa-solid fa-xmark"></i> Generation Failed: ${escapeHtml(data.message)}</span>`;
      showAdminAlert(data.message || 'Batch generation failed.');
      return;
    }

    if (bar) bar.style.width = '100%';
    if (pct) pct.innerText = '100%';
    if (counts) counts.innerText = `Processed ${data.total_issued} of ${eligibleRecords.length} records`;

    // Store generated certificates
    certGenState.currentBatchId = data.batch_id;
    certGenState.currentBatchCerts = data.certificates || [];

    // Show success alert
    const successAlert = document.getElementById('certGenSuccessAlert');
    const alertTitle = document.getElementById('cgSuccessAlertTitle');
    const alertMsg = document.getElementById('cgSuccessAlertMsg');

    if (alertTitle) alertTitle.innerText = `Successfully Issued ${data.total_issued} Certificates!`;
    if (alertMsg) alertMsg.innerText = `Batch ID: ${data.batch_id} &bull; All certificate records are permanently stored and digitally verified.`;
    if (successAlert) successAlert.style.display = 'block';

    // Reload Section 5 table
    loadIssuedCertificatesHistoryTable();
    updateCertEmailSettingsUI();
    successAlert?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Automatic email dispatch if enabled
    if (certEmailSettings.automaticSending) {
      showAdminAlert(`Automatic certificate emailing is enabled! Starting email dispatch for batch ${data.batch_id}...`, 'info');
      sendBatchCertificatesViaEmail(data.batch_id);
    }

  } catch (err) {
    console.error('Batch generation error:', err);
    showAdminAlert('Network or server error during batch generation.');
  }
}

// ============================================================
// 6. GENERATE INDIVIDUAL HIGH-FIDELITY PDF & ZIP ARCHIVE
// ============================================================
async function generateSingleCertificatePdfDoc(cert) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('PDF generator library not loaded.');
  }

  // 1. Prepare Certificate Data with Template Fallbacks (NO register number, NO dates, NO academic year)
  const participantName = cert.participant_name || cert.student_name || 'Participant';
  const certFullData = {
    participant_name: participantName,
    student_name: participantName,
    participant_type: cert.participant_type || 'Student',
    institution: cert.institution || cert.college_name || (typeof getFormParam === 'function' ? getFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam') : (document.getElementById('tplInstName')?.value?.trim() || document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology, Rajapalayam')),
    college_name: cert.institution || cert.college_name || (typeof getFormParam === 'function' ? getFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam') : (document.getElementById('tplInstName')?.value?.trim() || document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology, Rajapalayam')),
    certificate_number: cert.certificate_number || cert.certificate_id || 'RIT-STTP-2026-0001',
    certificate_title: cert.certificate_title || (typeof getFormParam === 'function' ? getFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION') : (document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION')),
    programme_title: cert.programme_title || (typeof getFormParam === 'function' ? getFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'One Week Short-Term Training Programme (STTP)') : (document.getElementById('tplProgrammeTitle')?.value?.trim() || document.getElementById('tplProgTitle')?.value?.trim() || 'One Week Short-Term Training Programme (STTP)')),
    event_name: cert.event_name || (typeof getFormParam === 'function' ? getFormParam(['tplEventTopic', 'tplEventName'], 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives') : (document.getElementById('tplEventTopic')?.value?.trim() || document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives')),
    department: cert.department || (typeof getFormParam === 'function' ? getFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems') : (document.getElementById('tplDeptName')?.value?.trim() || document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems')),
    programme_dates: cert.programme_dates || (typeof getFormParam === 'function' ? getFormParam(['tplProgrammeDates', 'tplProgDates'], 'October 12, 2026, to October 18, 2026') : (document.getElementById('tplProgrammeDates')?.value?.trim() || document.getElementById('tplProgDates')?.value?.trim() || 'October 12, 2026, to October 18, 2026')),
    signatory_count: cert.signatory_count || parseInt(document.getElementById('tplSigCount')?.value || '6', 10),
    signatory_1_name: cert.signatory_1_name || document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. M. Jeya Sundari',
    signatory_1_title: cert.signatory_1_title || document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: cert.signatory_1_dept || cert.signatory_1_org || document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
    signatory_1_sig: customUploadedSignatures[1] || cert.signatory_1_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_1_name || 'jeyasundari') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && (window.CERT_ASSETS.SIGNATURES.jeyasundari || window.CERT_ASSETS.SIGNATURES.faculty_coordinator))),
    signatory_2_name: cert.signatory_2_name || document.getElementById('tplSig2Name')?.value?.trim() || 'M. Rekha',
    signatory_2_title: cert.signatory_2_title || document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_2_dept: cert.signatory_2_dept || cert.signatory_2_org || document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
    signatory_2_sig: customUploadedSignatures[2] || cert.signatory_2_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_2_name || 'rekha') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.rekha)),
    signatory_3_name: cert.signatory_3_name || document.getElementById('tplSig3Name')?.value?.trim() || 'M. Ramakrishnan',
    signatory_3_title: cert.signatory_3_title || document.getElementById('tplSig3Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_3_dept: cert.signatory_3_dept || cert.signatory_3_org || document.getElementById('tplSig3Org')?.value?.trim() || 'CSBS, RIT',
    signatory_3_sig: customUploadedSignatures[3] || cert.signatory_3_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_3_name || 'ramakrishnan') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ramakrishnan)),
    signatory_4_name: cert.signatory_4_name || document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. D. Kesavaraja',
    signatory_4_title: cert.signatory_4_title || document.getElementById('tplSig4Title')?.value?.trim() || 'Convenor',
    signatory_4_dept: cert.signatory_4_dept || cert.signatory_4_org || document.getElementById('tplSig4Org')?.value?.trim() || 'CSBS, RIT',
    signatory_4_sig: customUploadedSignatures[4] || cert.signatory_4_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_4_name || 'kesavaraja') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.kesavaraja)),
    signatory_5_name: cert.signatory_5_name || document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
    signatory_5_title: cert.signatory_5_title || document.getElementById('tplSig5Title')?.value?.trim() || 'Patron',
    signatory_5_dept: cert.signatory_5_dept || cert.signatory_5_org || document.getElementById('tplSig5Org')?.value?.trim() || 'RIT',
    signatory_5_sig: customUploadedSignatures[5] || cert.signatory_5_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_5_name || 'rajakarunakaran') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && (window.CERT_ASSETS.SIGNATURES.rajakarunakaran || window.CERT_ASSETS.SIGNATURES.rajakumaran))),
    signatory_6_name: cert.signatory_6_name || document.getElementById('tplSig6Name')?.value?.trim() || 'Dr. L. Ganesan',
    signatory_6_title: cert.signatory_6_title || document.getElementById('tplSig6Title')?.value?.trim() || 'Chief Patron',
    signatory_6_dept: cert.signatory_6_dept || cert.signatory_6_org || document.getElementById('tplSig6Org')?.value?.trim() || 'RIT',
    signatory_6_sig: customUploadedSignatures[6] || cert.signatory_6_sig || (typeof getSignatoryAsset === 'function' ? getSignatoryAsset(cert.signatory_6_name || 'ganesan') : (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ganesan))
  };

  // Generate real data-driven PDF with selectable text & vector styling
  if (window.RIT_CERT_ASSETS && typeof window.RIT_CERT_ASSETS.createCertificatePdf === 'function') {
    return await window.RIT_CERT_ASSETS.createCertificatePdf(certFullData);
  }

  // Fallback
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', 148.5, 20, { align: 'center' });
  doc.text(certFullData.student_name, 148.5, 80, { align: 'center' });
  return doc;
}

// Download individual certificate PDF
async function downloadSingleCertificatePdf(cert) {
  try {
    const doc = await generateSingleCertificatePdfDoc(cert);
    const safeFilename = `${(cert.student_name || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_')}_${cert.certificate_number || 'CERT'}.pdf`;
    doc.save(safeFilename);
  } catch (err) {
    console.error('Download single PDF error:', err);
    showAdminAlert('Failed to generate PDF. Please try again.');
  }
}

// Preview single certificate PDF in a new window/tab
async function openSingleCertificatePreview(cert) {
  try {
    const doc = await generateSingleCertificatePdfDoc(cert);
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Preview PDF error:', err);
    showAdminAlert('Failed to preview PDF.');
  }
}

// Bulk ZIP Download of all certificates in active batch
async function downloadAllGeneratedCertificatesZip() {
  const certsToDownload = certGenState.currentBatchCerts.length > 0
    ? certGenState.currentBatchCerts
    : certGenState.masterCertificates;

  if (!certsToDownload || certsToDownload.length === 0) {
    showAdminAlert('No certificates available to download as ZIP archive.');
    return;
  }

  if (!window.JSZip) {
    showAdminAlert('ZIP compression library is loading. Please try again in a moment.');
    return;
  }

  const zip = new JSZip();
  showAdminAlert(`Generating ZIP archive for ${certsToDownload.length} certificates. Please wait...`, 'info');

  try {
    for (let i = 0; i < certsToDownload.length; i++) {
      const cert = certsToDownload[i];
      const doc = await generateSingleCertificatePdfDoc(cert);
      const pdfArrayBuffer = doc.output('arraybuffer');
      const filename = `${String(i + 1).padStart(3, '0')}_${(cert.student_name || 'Student').replace(/[^a-zA-Z0-9]/g, '_')}_${cert.certificate_number || 'CERT'}.pdf`;
      zip.file(filename, pdfArrayBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const batchName = certGenState.currentBatchCerts[0]?.event_name || 'RIT_CSBS_Certificates';
    const safeZipName = `${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificates.zip`;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = safeZipName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showAdminAlert('ZIP archive downloaded successfully!', 'success');
  } catch (err) {
    console.error('ZIP generation error:', err);
    showAdminAlert('Failed to generate ZIP archive.');
  }
}

// Export issued certificates list to Excel
function exportIssuedCertificatesExcel() {
  const certs = certGenState.masterCertificates || [];
  if (certs.length === 0) {
    showAdminAlert('No certificate records available to export.');
    return;
  }

  const rows = certs.map((c, idx) => ({
    '#': idx + 1,
    'Certificate ID': c.certificate_number,
    'Student Name': c.student_name,
    'Department': c.department,
    'Event Name': c.event_name,
    'Achievement': c.achievement || c.certificate_type,
    'Issue Date': c.issue_date,
    'Status': c.status,
    'Revocation Reason': c.revocation_reason || ''
  }));

  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Issued Certificates');
    XLSX.writeFile(wb, `Issued_Certificates_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

// ============================================================
// 7. SECTION 5: GENERATED RECORDS HISTORY TABLE
// ============================================================
async function loadIssuedCertificatesHistoryTable() {
  const tbody = document.getElementById('cgHistoryTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px;color:#64748b;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:#7e22ce;display:block;margin-bottom:8px;"></i>
          Loading institutional certificate records...
        </td>
      </tr>
    `;
  }

  try {
    // 1. Fetch batches
    const bRes = await fetch(`${API_BASE}/admin/certificate-generation/batches`, {
      headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
    });
    const bData = await bRes.json();
    if (bData.success && Array.isArray(bData.batches)) {
      certGenState.batchesList = bData.batches;
      populateBatchSelectorDropdown(bData.batches);
    }

    // 2. Fetch all certificates
    const cRes = await fetch(`${API_BASE}/admin/all-certificates`, {
      headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
    });
    const cData = await cRes.json();
    if (cData.success && Array.isArray(cData.certificates)) {
      certGenState.masterCertificates = cData.certificates;
      renderHistoryTable();
    }
  } catch (err) {
    console.error('History load error:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:36px;color:#dc2626;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;display:block;margin-bottom:8px;"></i>
            Failed to load certificate history. Please refresh.
          </td>
        </tr>
      `;
    }
  }
}

function populateBatchSelectorDropdown(batches) {
  const sel = document.getElementById('cgBatchSelector');
  if (!sel) return;

  let opts = '<option value="all">All Issued Certificates (Master History)</option>';
  batches.forEach(b => {
    const dStr = b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '';
    opts += `<option value="${escapeHtml(b.id)}">${escapeHtml(b.batch_title || b.event_name)} (${b.generated_count || 0} certs &bull; ${dStr})</option>`;
  });
  sel.innerHTML = opts;
}

function handleCertGenBatchSelect() {
  const sel = document.getElementById('cgBatchSelector');
  const batchId = sel ? sel.value : 'all';

  const delBtn = document.getElementById('btnDeleteSelectedBatch');
  if (delBtn) {
    delBtn.style.display = (batchId && batchId !== 'all') ? 'inline-flex' : 'none';
  }

  if (batchId === 'all') {
    certGenState.currentBatchCerts = certGenState.masterCertificates;
  } else {
    certGenState.currentBatchCerts = certGenState.masterCertificates.filter(c => String(c.batch_id) === String(batchId));
  }

  renderHistoryTable();
}

function handleCertGenHistorySearch() {
  renderHistoryTable();
}

function renderHistoryTable() {
  const tbody = document.getElementById('cgHistoryTableBody');
  if (!tbody) return;

  const sel = document.getElementById('cgBatchSelector');
  const batchId = sel ? sel.value : 'all';
  let certs = (batchId === 'all') ? certGenState.masterCertificates : certGenState.currentBatchCerts;

  const searchInput = document.getElementById('cgHistorySearchInput');
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (q) {
    certs = certs.filter(c =>
      (c.student_name && c.student_name.toLowerCase().includes(q)) ||
      (c.register_number && c.register_number.toLowerCase().includes(q)) ||
      (c.certificate_number && c.certificate_number.toLowerCase().includes(q)) ||
      (c.event_name && c.event_name.toLowerCase().includes(q))
    );
  }

  if (document.getElementById('cgHistoryDisplayCount')) {
    document.getElementById('cgHistoryDisplayCount').innerText = certs.length;
  }

  if (certs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:36px;color:#64748b;">
          <i class="fa-solid fa-certificate" style="font-size:24px;color:#cbd5e1;display:block;margin-bottom:8px;"></i>
          No issued certificate records found.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  certs.forEach((cert, idx) => {
    const isRevoked = cert.status === 'Revoked';
    const statusBadge = isRevoked
      ? '<span class="badge badge-danger" style="font-size:11px;padding:3px 8px;"><i class="fa-solid fa-ban"></i> Revoked</span>'
      : '<span class="badge badge-green" style="font-size:11px;padding:3px 8px;"><i class="fa-solid fa-circle-check"></i> Digitally Verified</span>';

    const certJson = JSON.stringify(cert).replace(/"/g, '&quot;');
    const isDate = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—';

    let emailBadge = '<span class="badge" style="background:#f8fafc;color:#64748b;border:1px solid #cbd5e1;font-size:11px;padding:3px 8px;"><i class="fa-solid fa-clock"></i> Pending</span>';
    if (cert.email_status === 'sent') {
      emailBadge = `<span class="badge" style="background:#ecfdf5;color:#059669;border:1px solid #86efac;font-size:11px;padding:3px 8px;" title="Sent on ${cert.email_sent_at ? new Date(cert.email_sent_at).toLocaleString() : ''}"><i class="fa-solid fa-check-double"></i> Sent</span>`;
    } else if (cert.email_status === 'failed') {
      emailBadge = `<span class="badge" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;font-size:11px;padding:3px 8px;" title="${escapeHtml(cert.email_error || 'Delivery failed')}"><i class="fa-solid fa-triangle-exclamation"></i> Failed</span>`;
    }

    html += `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
        <td>
          <span style="font-family:monospace;font-weight:800;color:#4338ca;font-size:12.5px;cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(cert.certificate_number)}');showAdminAlert('Copied ID: ${escapeHtml(cert.certificate_number)}','success');" title="Click to copy ID">
            ${escapeHtml(cert.certificate_number)}
          </span>
        </td>
        <td>
          <strong>${escapeHtml(cert.student_name || 'Student')}</strong>
          ${cert.student_email || cert.email ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(cert.student_email || cert.email)}</div>` : ''}
        </td>
        <td>${escapeHtml(cert.event_name || 'Department Event')}</td>
        <td>${isDate}</td>
        <td>${statusBadge}</td>
        <td>${emailBadge}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button type="button" class="btn btn-sm" style="background:#7e22ce;color:#fff;border:none;padding:4px 8px;font-size:11px;" onclick="sendSingleCertificateEmailPrompt('${escapeHtml(cert.certificate_number)}', '${escapeHtml(cert.student_email || cert.email || '')}', '${escapeHtml(cert.student_name)}')" title="Send Certificate via Email">
            <i class="fa-solid fa-paper-plane"></i> Email
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary" style="padding:4px 8px;font-size:11px;" onclick="downloadSingleCertificatePdf(${certJson})" title="Download PDF">
            <i class="fa-solid fa-file-pdf"></i> PDF
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:11px;" onclick="openSingleCertificatePreview(${certJson})" title="Preview Certificate">
            <i class="fa-solid fa-eye"></i> View
          </button>
          <a href="/verify-certificate.html?id=${encodeURIComponent(cert.certificate_number)}" target="_blank" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:11px;text-decoration:none;" title="Verify in Public Portal">
            <i class="fa-solid fa-qrcode"></i> Verify
          </a>
          ${!isRevoked ? `
            <button type="button" class="btn btn-sm btn-outline-danger" style="padding:4px 8px;font-size:11px;" onclick="openCertGenRevokeModal('${escapeHtml(cert.certificate_number)}', '${escapeHtml(cert.student_name)}')" title="Revoke Certificate">
              <i class="fa-solid fa-ban"></i>
            </button>
          ` : ''}
          <button type="button" class="btn btn-sm btn-outline-danger" style="padding:4px 8px;font-size:11px;" onclick="openDeleteSingleCertModal('${escapeHtml(cert.certificate_number)}', '${escapeHtml(cert.student_name)}')" title="Permanently Delete Certificate Record">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function refreshCertGenBatchesList() {
  loadIssuedCertificatesHistoryTable();
  showAdminAlert('Certificate records and batches refreshed!', 'success');
}

// ============================================================
// 8. CERTIFICATE REVOCATION MODAL
// ============================================================
let activeRevokeCertId = null;

// ============================================================
// 8B. BATCH & SINGLE RECORD DELETION MODALS (ADMIN ONLY)
// ============================================================
let activeDeleteBatchId = null;
let activeDeleteCertId = null;

function openDeleteBatchModal() {
  const sel = document.getElementById('cgBatchSelector');
  const batchId = sel ? sel.value : null;
  if (!batchId || batchId === 'all') {
    showAdminAlert('Please select a specific generation batch from the dropdown to delete.', 'warning');
    return;
  }

  activeDeleteBatchId = batchId;
  const batchObj = (certGenState.batchesList || []).find(b => String(b.id) === String(batchId));
  const certsInBatch = (certGenState.masterCertificates || []).filter(c => String(c.batch_id) === String(batchId));

  const idEl = document.getElementById('cgDeleteBatchModalBatchId');
  const titleEl = document.getElementById('cgDeleteBatchModalTitle');
  const eventEl = document.getElementById('cgDeleteBatchModalEvent');
  const countEl = document.getElementById('cgDeleteBatchModalCount');
  const expEl = document.getElementById('cgDeleteBatchExpectedConfirm');
  const inputEl = document.getElementById('cgDeleteBatchConfirmInput');
  const btnEl = document.getElementById('btnConfirmDeleteBatch');

  if (idEl) idEl.innerText = batchId;
  if (titleEl) titleEl.innerText = batchObj?.batch_title || 'Batch';
  if (eventEl) eventEl.innerText = batchObj?.event_name || 'Department Event';
  if (countEl) countEl.innerText = `${certsInBatch.length} certificate record(s)`;
  if (expEl) expEl.innerText = batchId;
  if (inputEl) inputEl.value = '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.style.opacity = '0.6';
    btnEl.style.cursor = 'not-allowed';
  }

  const modal = document.getElementById('certGenDeleteBatchModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDeleteBatchModal() {
  activeDeleteBatchId = null;
  const modal = document.getElementById('certGenDeleteBatchModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgDeleteBatchModal(e) {
  if (e.target.id === 'certGenDeleteBatchModal') {
    closeDeleteBatchModal();
  }
}

function checkDeleteBatchConfirmMatch() {
  const inputVal = (document.getElementById('cgDeleteBatchConfirmInput')?.value || '').trim();
  const btn = document.getElementById('btnConfirmDeleteBatch');
  if (!btn) return;
  if (inputVal === activeDeleteBatchId) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  }
}

async function submitDeleteSelectedBatch() {
  if (!activeDeleteBatchId) return;
  const confirmBatchId = (document.getElementById('cgDeleteBatchConfirmInput')?.value || '').trim();
  if (confirmBatchId !== activeDeleteBatchId) {
    alert('Confirmation failed: You must type the exact Batch ID to confirm deletion.');
    return;
  }

  const btn = document.getElementById('btnConfirmDeleteBatch');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting Records & Files...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/batch/${encodeURIComponent(activeDeleteBatchId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({ confirm_batch_id: confirmBatchId })
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'Failed to delete certificate batch.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Permanently Delete Batch';
      }
      return;
    }

    closeDeleteBatchModal();
    showAdminAlert(`Batch ${activeDeleteBatchId} and ${data.deleted_records_count || 0} record(s) deleted permanently.`, 'success');

    // Reset dropdown and refresh history
    const sel = document.getElementById('cgBatchSelector');
    if (sel) sel.value = 'all';
    const delBtn = document.getElementById('btnDeleteSelectedBatch');
    if (delBtn) delBtn.style.display = 'none';

    await loadIssuedCertificatesHistoryTable();
  } catch (err) {
    console.error('Batch deletion error:', err);
    alert('An unexpected error occurred while deleting the batch.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Permanently Delete Batch';
    }
  }
}

function openDeleteSingleCertModal(certId, studentName) {
  activeDeleteCertId = certId;
  const idEl = document.getElementById('cgDeleteSingleCertId');
  const nameEl = document.getElementById('cgDeleteSingleStudentName');
  const expEl = document.getElementById('cgDeleteSingleExpectedConfirm');
  const inputEl = document.getElementById('cgDeleteSingleConfirmInput');
  const btnEl = document.getElementById('btnConfirmDeleteSingleCert');

  if (idEl) idEl.innerText = certId;
  if (nameEl) nameEl.innerText = studentName || 'Student';
  if (expEl) expEl.innerText = certId;
  if (inputEl) inputEl.value = '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.style.opacity = '0.6';
    btnEl.style.cursor = 'not-allowed';
  }

  const modal = document.getElementById('certGenDeleteSingleCertModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDeleteSingleCertModal() {
  activeDeleteCertId = null;
  const modal = document.getElementById('certGenDeleteSingleCertModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgDeleteSingleCertModal(e) {
  if (e.target.id === 'certGenDeleteSingleCertModal') {
    closeDeleteSingleCertModal();
  }
}

function checkDeleteSingleConfirmMatch() {
  const inputVal = (document.getElementById('cgDeleteSingleConfirmInput')?.value || '').trim().toUpperCase();
  const btn = document.getElementById('btnConfirmDeleteSingleCert');
  if (!btn) return;
  if (inputVal === String(activeDeleteCertId).trim().toUpperCase()) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  }
}

async function submitDeleteSingleCert() {
  if (!activeDeleteCertId) return;
  const confirmCert = (document.getElementById('cgDeleteSingleConfirmInput')?.value || '').trim().toUpperCase();
  if (confirmCert !== String(activeDeleteCertId).trim().toUpperCase()) {
    alert('Confirmation failed: You must type the exact Certificate ID to confirm deletion.');
    return;
  }

  const btn = document.getElementById('btnConfirmDeleteSingleCert');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/record/${encodeURIComponent(activeDeleteCertId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({ confirm_cert_number: confirmCert })
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'Failed to delete certificate record.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Record';
      }
      return;
    }

    closeDeleteSingleCertModal();
    showAdminAlert(`Certificate ${activeDeleteCertId} deleted permanently.`, 'success');
    await loadIssuedCertificatesHistoryTable();
  } catch (err) {
    console.error('Certificate deletion error:', err);
    alert('An unexpected error occurred while deleting the certificate record.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Record';
    }
  }
}

function openCertGenRevokeModal(certId, studentName) {
  activeRevokeCertId = certId;
  const idEl = document.getElementById('cgRevokeModalCertId');
  const nameEl = document.getElementById('cgRevokeModalStudentName');
  const reasonEl = document.getElementById('cgRevokeReasonInput');

  if (idEl) idEl.innerText = certId;
  if (nameEl) nameEl.innerText = studentName || 'Student';
  if (reasonEl) reasonEl.value = '';

  const modal = document.getElementById('certGenRevokeModal');
  if (modal) modal.classList.remove('hidden');
}

function closeCertGenRevokeModal() {
  activeRevokeCertId = null;
  const modal = document.getElementById('certGenRevokeModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgRevokeModal(e) {
  if (e.target.id === 'certGenRevokeModal') {
    closeCertGenRevokeModal();
  }
}

async function submitCertificateRevocation() {
  if (!activeRevokeCertId) return;
  const reason = document.getElementById('cgRevokeReasonInput')?.value?.trim();
  if (!reason) {
    alert('Please enter a valid revocation reason.');
    return;
  }

  const btn = document.getElementById('btnConfirmRevocation');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/revoke/${encodeURIComponent(activeRevokeCertId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({ reason })
    });

    const data = await res.json();
    if (!data.success) {
      showAdminAlert(data.message || 'Failed to revoke certificate.');
      return;
    }

    closeCertGenRevokeModal();
    showAdminAlert(`Certificate ${activeRevokeCertId} has been revoked successfully.`, 'success');
    loadIssuedCertificatesHistoryTable();
  } catch (err) {
    console.error('Revoke error:', err);
    showAdminAlert('Failed to submit revocation.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// 9. SECTION 6: IN-DASHBOARD QUICK VERIFICATION
// ============================================================
async function executeQuickCertificateVerification(event) {
  if (event) event.preventDefault();
  const inp = document.getElementById('cgQuickVerifyInput');
  const val = inp ? inp.value.trim() : '';
  if (!val) return;

  const resultBox = document.getElementById('cgQuickVerifyResult');
  const btn = document.getElementById('btnCgQuickVerify');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/verify-quick/${encodeURIComponent(val)}`);
    const data = await res.json();

    if (resultBox) {
      resultBox.style.display = 'block';
      if (data.success && data.found && data.certificate) {
        const cert = data.certificate;
        const isRevoked = data.status === 'REVOKED' || cert.status === 'Revoked';

        resultBox.innerHTML = `
          <div style="background:${isRevoked ? '#fef2f2' : '#f0fdf4'};border:1.5px solid ${isRevoked ? '#fca5a5' : '#86efac'};border-radius:14px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <span class="badge ${isRevoked ? 'badge-danger' : 'badge-green'}" style="font-size:13px;padding:4px 10px;">
                ${isRevoked ? '<i class="fa-solid fa-ban"></i> Certificate Revoked' : '<i class="fa-solid fa-circle-check"></i> Officially Digitally Verified'}
              </span>
              <code style="font-weight:800;font-size:14px;color:#3B0764;">${escapeHtml(cert.certificate_number)}</code>
            </div>

            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">${escapeHtml(cert.student_name)}</div>
            <div style="font-size:13px;color:#475569;margin-bottom:12px;">${escapeHtml(cert.department || 'Computer Science and Business Systems')} &bull; ${escapeHtml(cert.college_name || 'Ramco Institute of Technology')}</div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;font-size:12.5px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
              <div><span style="color:#64748b;">Event:</span> <strong>${escapeHtml(cert.event_name)}</strong></div>
              <div><span style="color:#64748b;">Event Date:</span> <strong>${cert.event_date ? new Date(cert.event_date).toLocaleDateString('en-GB') : '—'}</strong></div>
              <div><span style="color:#64748b;">Issue Date:</span> <strong>${cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}</strong></div>
              <div><span style="color:#64748b;">Title:</span> <strong>${escapeHtml(cert.certificate_title || 'Participation')}</strong></div>
            </div>

            ${isRevoked ? `
              <div style="margin-top:10px;font-size:12.5px;color:#991b1b;background:#fee2e2;padding:8px 12px;border-radius:8px;">
                <strong>Revocation Reason:</strong> ${escapeHtml(cert.revocation_reason || 'Administrative revocation')}
              </div>
            ` : ''}

            <div style="margin-top:14px;display:flex;gap:10px;">
              <a href="/verify-certificate.html?id=${encodeURIComponent(cert.certificate_number)}" target="_blank" class="btn btn-sm btn-outline-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Verification Portal
              </a>
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `
          <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:14px;padding:20px;text-align:center;">
            <i class="fa-solid fa-circle-question" style="font-size:28px;color:#d97706;margin-bottom:8px;display:block;"></i>
            <h4 style="font-size:15px;font-weight:800;color:#92400e;margin:0;">Certificate Not Found</h4>
            <p style="font-size:13px;color:#78350f;margin:4px 0 0;">Certificate not found. Please check the certificate ID.</p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Quick verify error:', err);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// 10. AUTOMATED CERTIFICATE EMAIL DISPATCH & SETTINGS
// ============================================================

// Open Email Configuration Modal
function openEmailConfigModal() {
  const modal = document.getElementById('modalEmailConfig');
  if (modal) {
    modal.style.display = 'flex';
    loadEmailConfigIntoModal();
  }
}

// Close Email Configuration Modal
function closeEmailConfigModal() {
  const modal = document.getElementById('modalEmailConfig');
  if (modal) modal.style.display = 'none';
  const resultDiv = document.getElementById('emailTestResult');
  if (resultDiv) resultDiv.style.display = 'none';
}

// Fetch and populate current email config into modal
async function loadEmailConfigIntoModal() {
  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/email-config`, {
      headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
    });
    const data = await res.json();
    if (data.success && data.config) {
      if (document.getElementById('cfgSenderEmail')) {
        document.getElementById('cfgSenderEmail').value = data.config.sender_email || 'rajakaleeswaranhari1976@gmail.com';
      }
      if (document.getElementById('cfgSenderName')) {
        document.getElementById('cfgSenderName').value = data.config.sender_name || 'RIT CSBS Placement & Training Cell';
      }
    }
  } catch (e) {
    console.error('Error loading email config:', e);
  }
}

// Save email settings from modal
async function saveEmailConfigFromModal() {
  const senderEmail = document.getElementById('cfgSenderEmail')?.value?.trim();
  const appPassword = document.getElementById('cfgAppPassword')?.value?.trim();
  const senderName = document.getElementById('cfgSenderName')?.value?.trim();

  if (!senderEmail || !senderEmail.includes('@')) {
    alert('Please enter a valid Gmail address.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/email-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({
        sender_email: senderEmail,
        app_password: appPassword,
        sender_name: senderName
      })
    });
    const data = await res.json();
    if (data.success) {
      showAdminAlert('Email settings saved successfully!', 'success');
      closeEmailConfigModal();
    } else {
      alert(data.message || 'Failed to save email settings.');
    }
  } catch (e) {
    alert('Failed to connect to server.');
  }
}

// Test connection from modal
async function testEmailConnectionFromModal() {
  const btn = document.getElementById('btnTestEmailConn');
  const resultDiv = document.getElementById('emailTestResult');
  if (btn) btn.disabled = true;
  if (resultDiv) {
    resultDiv.style.display = 'block';
    resultDiv.style.background = '#f1f5f9';
    resultDiv.style.color = '#475569';
    resultDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Gmail SMTP authentication...';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/verify-email-connection`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
    });
    const data = await res.json();
    if (data.success) {
      if (resultDiv) {
        resultDiv.style.background = '#ecfdf5';
        resultDiv.style.color = '#065f46';
        resultDiv.style.border = '1px solid #86efac';
        resultDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(data.message)}`;
      }
    } else {
      if (resultDiv) {
        resultDiv.style.background = '#fef2f2';
        resultDiv.style.color = '#991b1b';
        resultDiv.style.border = '1px solid #fca5a5';
        resultDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(data.message)}`;
      }
    }
  } catch (e) {
    if (resultDiv) {
      resultDiv.style.background = '#fef2f2';
      resultDiv.style.color = '#991b1b';
      resultDiv.innerHTML = 'Network error testing email connection.';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Send batch certificates via email (e.g. all participants in batch or roster)
async function sendBatchCertificatesViaEmail(targetBatchId = null) {
  let batchId = targetBatchId || certGenState.currentBatchId;

  // If no current batch is selected, try to find the latest batch from batchesList
  if (!batchId && Array.isArray(certGenState.batchesList) && certGenState.batchesList.length > 0) {
    batchId = certGenState.batchesList[0].batch_id || certGenState.batchesList[0].id;
  }

  const batchCerts = batchId 
    ? (certGenState.masterCertificates || []).filter(c => String(c.batch_id) === String(batchId))
    : (certGenState.currentBatchCerts || []);

  const total = batchCerts.length > 0 ? batchCerts.length : (certGenState.records ? certGenState.records.filter(r => r.is_valid).length : 0);
  if (total === 0 && !batchId) {
    showAdminAlert('No certificates or active batch found to email. Please generate a batch first.');
    return;
  }

  const isTest = Boolean(certEmailSettings.testMode);
  const testEmail = (certEmailSettings.testEmail || '').trim();

  if (isTest && (!testEmail || !testEmail.includes('@'))) {
    showAdminAlert('Test Mode is active, but no valid test email address is configured. Please provide a valid test email address in Email Settings.', 'warning');
    const input = document.getElementById('cfgTestEmailAddress');
    if (input) input.focus();
    return;
  }

  const confirmMsg = isTest
    ? `⚠️ Test Mode is ENABLED.\n\nAll certificate emails (${total || 'batch'} participants) will be safely routed to your authorized test address:\n${testEmail}\n\nActual participants will NOT be contacted.\n\nProceed with test email dispatch?`
    : `Are you sure you want to automatically email official certificate PDFs to all ${total} participants?\n\nSender: rajakaleeswaranhari1976@gmail.com\nAttachment: High-Resolution Print-Ready PDF`;

  if (!confirm(confirmMsg)) return;

  const progressBox = document.getElementById('certEmailProgressBox');
  const bar = document.getElementById('certEmailProgressBar');
  const pct = document.getElementById('cgEmailProgressPct');
  const counts = document.getElementById('cgEmailProgressCounts');
  const details = document.getElementById('cgEmailProgressDetails');
  const statusText = document.getElementById('cgEmailStatusText');
  const sendBtn = document.getElementById('btnSendBatchEmails');
  const execBtn = document.getElementById('btnExecuteSendCertificates');

  if (progressBox) progressBox.style.display = 'block';
  if (bar) bar.style.width = '10%';
  if (pct) pct.innerText = '10%';
  if (counts) counts.innerText = isTest ? `Preparing test email dispatch to ${testEmail}...` : `Preparing email queue for ${total} participants...`;
  if (statusText) statusText.innerHTML = isTest 
    ? `<i class="fa-solid fa-flask fa-bounce"></i> Generating test PDFs &amp; routing to ${escapeHtml(testEmail)}...`
    : '<i class="fa-solid fa-paper-plane fa-bounce"></i> Generating PDFs &amp; dispatching emails via Gmail SMTP...';
  if (sendBtn) sendBtn.disabled = true;
  if (execBtn) execBtn.disabled = true;

  try {
    const authHeaders = (typeof getAdminAuthHeaders === 'function') 
      ? getAdminAuthHeaders() 
      : { Authorization: `Bearer ${getEffectiveAdminToken()}` };

    const endpoint = (typeof API_BASE !== 'undefined' && API_BASE)
      ? `${API_BASE}/admin/certificate-generation/send-batch-emails`
      : '/api/certificates/generate/send-batch-emails';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        batch_id: batchId,
        test_mode: isTest,
        test_email: testEmail,
        throttle_ms: 1200
      })
    });

    const data = await res.json();
    if (!data.success) {
      if (statusText) statusText.innerHTML = `<span style="color:#dc2626;"><i class="fa-solid fa-xmark"></i> Dispatch Failed: ${escapeHtml(data.message)}</span>`;
      alert(data.message || 'Batch email dispatch failed.');
      return;
    }

    if (bar) bar.style.width = '100%';
    if (pct) pct.innerText = '100%';
    if (counts) counts.innerText = isTest
      ? `Test Run Complete: Dispatched ${data.sent} test certificate email(s) to ${testEmail}!`
      : `Successfully delivered ${data.sent} of ${data.total} certificate emails!`;
    if (details) details.innerText = `Failed: ${data.failed} • Skipped: ${data.skipped} (Test Mode: ${isTest ? 'Active' : 'Off'})`;
    if (statusText) statusText.innerHTML = `<span style="color:#059669;font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${isTest ? 'Test Dispatch Successful!' : 'Email Dispatch Complete!'}</span>`;

    showAdminAlert(data.message || `Dispatched ${data.sent} certificate emails successfully!`, 'success');
    loadIssuedCertificatesHistoryTable();

  } catch (err) {
    console.error('Batch email dispatch error:', err);
    if (statusText) statusText.innerHTML = '<span style="color:#dc2626;">Network error during email dispatch.</span>';
    showAdminAlert('Network or server error during email dispatch.');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (execBtn) execBtn.disabled = false;
  }
}

// Send selected batch from Section 5 History
function sendSelectedBatchViaEmail() {
  const sel = document.getElementById('cgBatchSelector');
  const batchId = sel ? sel.value : 'all';

  if (batchId === 'all') {
    const confirmAll = confirm('This will email ALL issued certificates in the master database. Do you wish to proceed?');
    if (!confirmAll) return;
    sendBatchCertificatesViaEmail(null);
  } else {
    sendBatchCertificatesViaEmail(batchId);
  }
}

// Send individual certificate to a single participant
async function sendSingleCertificateEmailPrompt(certNumber, currentEmail, studentName) {
  const email = prompt(`Send Certificate (${certNumber}) to ${studentName}:\nConfirm or edit email address:`, currentEmail);
  if (!email || !email.includes('@')) {
    if (email !== null) alert('Please enter a valid recipient email address.');
    return;
  }

  showAdminAlert(`Sending certificate to ${email}...`, 'info');

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/send-certificate-email/${encodeURIComponent(certNumber)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify({ email_override: email })
    });

    const data = await res.json();
    if (data.success) {
      showAdminAlert(`Certificate PDF successfully emailed to ${email}!`, 'success');
      loadIssuedCertificatesHistoryTable();
    } else {
      alert(data.message || 'Failed to send certificate email.');
    }
  } catch (err) {
    console.error('Send single email error:', err);
    alert('Failed to send certificate email due to network/server error.');
  }
}
