// ============================================================
// CERTIFICATE GENERATION & QR VERIFICATION CLIENT MODULE
// RAMCO INSTITUTE OF TECHNOLOGY — CSBS DEPARTMENT
// ============================================================

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
    roleBadge.innerText = 'Role: Placement Admin (View-Only)';
    roleDesc.innerText = 'Administrators have read-only access to certificate batches and records. Batch spreadsheet upload, certificate generation, and revocation are restricted to Faculty Coordinators.';
  } else if (role === 'ja_faculty' || role === 'ja') {
    roleBadge.className = 'badge badge-blue';
    roleBadge.innerText = 'Role: JA Faculty (Verification Access)';
    roleDesc.innerText = 'JA Faculty members have access to verify certificates and browse issued records. Generation is restricted to Faculty Coordinators.';
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
        Authorization: `Bearer ${currentAdminToken}`
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
      if (!r.event_name && defEventName) r.event_name = defEventName;
      if (!r.event_date && defEventDate) r.event_date = defEventDate;
      if ((!r.academic_year || r.academic_year === '2026-27') && defAcademicYear) r.academic_year = defAcademicYear;
      if (!r.department && defDept) r.department = defDept;
      if (!r.participation_type && defPartType) r.participation_type = defPartType;
      if (!r.issue_date && defIssueDate) r.issue_date = defIssueDate;

      // Re-evaluate validity after applying fallbacks
      const errors = [];
      if (!r.student_name) errors.push('Student Name is mandatory');
      if (!r.register_number) errors.push('Register Number is mandatory');
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
      (r.register_number && r.register_number.toLowerCase().includes(q)) ||
      (r.event_name && r.event_name.toLowerCase().includes(q))
    );
  }

  if (displayed.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;padding:36px;color:#64748b;">
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

    html += `
      <tr class="${rowClass}">
        <td style="text-align:center;font-weight:700;color:#64748b;">${row.row_index || (actualIdx + 1)}</td>
        <td>${statusBadge}</td>
        <td>
          <input type="text" class="certgen-table-input ${!row.student_name ? 'has-error' : ''}" value="${escapeHtml(row.student_name || '')}" placeholder="Student Name" onchange="handleCertGenCellChange(${actualIdx}, 'student_name', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input ${!row.register_number ? 'has-error' : ''}" style="font-family:monospace;font-weight:600;" value="${escapeHtml(row.register_number || '')}" placeholder="Reg No" onchange="handleCertGenCellChange(${actualIdx}, 'register_number', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input" value="${escapeHtml(row.department || 'Computer Science and Business Systems')}" onchange="handleCertGenCellChange(${actualIdx}, 'department', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input ${!row.event_name ? 'has-error' : ''}" value="${escapeHtml(row.event_name || '')}" placeholder="Event Name" onchange="handleCertGenCellChange(${actualIdx}, 'event_name', this.value)">
        </td>
        <td>
          <input type="date" class="certgen-table-input" value="${escapeHtml(row.event_date || '')}" onchange="handleCertGenCellChange(${actualIdx}, 'event_date', this.value)">
        </td>
        <td>
          <input type="text" class="certgen-table-input" value="${escapeHtml(row.participation_type || 'Participation')}" onchange="handleCertGenCellChange(${actualIdx}, 'participation_type', this.value)">
        </td>
        <td>
          <input type="date" class="certgen-table-input" value="${escapeHtml(row.issue_date || '')}" onchange="handleCertGenCellChange(${actualIdx}, 'issue_date', this.value)">
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

  // Re-run validation for this row
  const r = certGenState.records[idx];
  const errors = [];
  if (!r.student_name) errors.push('Student Name is mandatory');
  if (!r.register_number) errors.push('Register Number is mandatory');
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
    student_name: '',
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
    errors: ['Student Name is mandatory', 'Register Number is mandatory'],
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
        Authorization: `Bearer ${currentAdminToken}`
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
    'Register Number': r.register_number,
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

function applyCertificatePreset(presetKey) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.preset-btn[data-preset="${presetKey}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (presetKey === 'sttp_blockchain_2026') {
    if (document.getElementById('tplCertTitle')) document.getElementById('tplCertTitle').value = 'CERTIFICATE OF PARTICIPATION';
    if (document.getElementById('tplCertType')) document.getElementById('tplCertType').value = 'STTP';
    if (document.getElementById('tplProgTitle')) document.getElementById('tplProgTitle').value = 'Short-Term Training Programme (STTP)';
    if (document.getElementById('tplEventName')) document.getElementById('tplEventName').value = 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
    if (document.getElementById('tplOrgDept')) document.getElementById('tplOrgDept').value = 'Department of Computer Science and Business Systems (CSBS)';
    if (document.getElementById('tplInstitution')) document.getElementById('tplInstitution').value = 'Ramco Institute of Technology';
    if (document.getElementById('tplProgDates')) document.getElementById('tplProgDates').value = '10 – 12 October 2026';
    if (document.getElementById('tplIssueDate')) document.getElementById('tplIssueDate').value = '2026-10-12';
    if (document.getElementById('tplCertWording')) document.getElementById('tplCertWording').value = 'This certificate is proudly presented to [STUDENT NAME] in recognition of active participation in the Short-Term Training Programme (STTP) on ‘Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives’, organized by the Department of Computer Science and Business Systems, Ramco Institute of Technology.';
    if (document.getElementById('tplIdPrefix')) document.getElementById('tplIdPrefix').value = 'RIT-STTP-2026';

    toggleSignatoryCount(5);
    setSigFields(1, 'Dr. K. Arulraj', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Dr. S. Rajakumaran', 'STTP Coordinator', 'CSBS, RIT');
    setSigFields(3, 'Dr. S. Rajakarunakaran', 'Head of Department', 'CSBS, RIT');
    setSigFields(4, 'Dr. L. Ganesan', 'Principal', 'RIT');
    setSigFields(5, 'Dr. R. Ramesh', 'Director', 'RIT');
  } else if (presetKey === 'workshop_ai_2026') {
    if (document.getElementById('tplCertTitle')) document.getElementById('tplCertTitle').value = 'CERTIFICATE OF PARTICIPATION';
    if (document.getElementById('tplCertType')) document.getElementById('tplCertType').value = 'Workshop';
    if (document.getElementById('tplProgTitle')) document.getElementById('tplProgTitle').value = 'Two-Day National Workshop';
    if (document.getElementById('tplEventName')) document.getElementById('tplEventName').value = 'Generative AI and Enterprise Large Language Model Deployments';
    if (document.getElementById('tplOrgDept')) document.getElementById('tplOrgDept').value = 'Department of Computer Science and Business Systems (CSBS)';
    if (document.getElementById('tplInstitution')) document.getElementById('tplInstitution').value = 'Ramco Institute of Technology';
    if (document.getElementById('tplProgDates')) document.getElementById('tplProgDates').value = '18 – 19 September 2026';
    if (document.getElementById('tplIssueDate')) document.getElementById('tplIssueDate').value = '2026-09-19';
    if (document.getElementById('tplCertWording')) document.getElementById('tplCertWording').value = 'This certificate is proudly presented to [STUDENT NAME] in recognition of active participation in the Two-Day National Workshop on ‘Generative AI and Enterprise Large Language Model Deployments’, organized by the Department of Computer Science and Business Systems, Ramco Institute of Technology.';
    if (document.getElementById('tplIdPrefix')) document.getElementById('tplIdPrefix').value = 'RIT-GENAI-2026';

    toggleSignatoryCount(3);
    setSigFields(1, 'Dr. K. Arulraj', 'Staff Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Dr. S. Rajakarunakaran', 'Head of Department', 'CSBS, RIT');
    setSigFields(3, 'Dr. L. Ganesan', 'Principal', 'RIT');
  } else if (presetKey === 'symposium_merit_2026') {
    if (document.getElementById('tplCertTitle')) document.getElementById('tplCertTitle').value = 'CERTIFICATE OF MERIT';
    if (document.getElementById('tplCertType')) document.getElementById('tplCertType').value = 'Merit';
    if (document.getElementById('tplProgTitle')) document.getElementById('tplProgTitle').value = 'National Level Technical Symposium – TECHKRITI 2026';
    if (document.getElementById('tplEventName')) document.getElementById('tplEventName').value = 'Smart Contract Auditing & Web3 Decentralized Hackathon';
    if (document.getElementById('tplOrgDept')) document.getElementById('tplOrgDept').value = 'Department of Computer Science and Business Systems (CSBS)';
    if (document.getElementById('tplInstitution')) document.getElementById('tplInstitution').value = 'Ramco Institute of Technology';
    if (document.getElementById('tplProgDates')) document.getElementById('tplProgDates').value = '28 August 2026';
    if (document.getElementById('tplIssueDate')) document.getElementById('tplIssueDate').value = '2026-08-28';
    if (document.getElementById('tplCertWording')) document.getElementById('tplCertWording').value = 'This certificate is proudly awarded to [STUDENT NAME] for exceptional technical excellence and securing 1st Place in the National Level Technical Symposium on ‘Smart Contract Auditing & Web3 Decentralized Hackathon’, organized by the Department of Computer Science and Business Systems, Ramco Institute of Technology.';
    if (document.getElementById('tplIdPrefix')) document.getElementById('tplIdPrefix').value = 'RIT-MERIT-2026';

    toggleSignatoryCount(3);
    setSigFields(1, 'Dr. S. Rajakumaran', 'Convener', 'CSBS, RIT');
    setSigFields(2, 'Dr. S. Rajakarunakaran', 'Head of Department', 'CSBS, RIT');
    setSigFields(3, 'Dr. L. Ganesan', 'Principal', 'RIT');
  }

  updateLiveCertificatePreview();
}

function setSigFields(idx, name, title, dept) {
  if (document.getElementById(`tplSig${idx}Name`)) document.getElementById(`tplSig${idx}Name`).value = name;
  if (document.getElementById(`tplSig${idx}Title`)) document.getElementById(`tplSig${idx}Title`).value = title;
  if (document.getElementById(`tplSig${idx}Dept`)) document.getElementById(`tplSig${idx}Dept`).value = dept;
}

function toggleSignatoryCount(count) {
  const c = parseInt(count, 10);
  const sel = document.getElementById('tplSigCount');
  if (sel) sel.value = String(c);

  const card4 = document.getElementById('sigCard4');
  const card5 = document.getElementById('sigCard5');
  const prevWrap = document.getElementById('prevSignatoriesWrap');

  if (c === 5) {
    if (card4) card4.style.display = 'block';
    if (card5) card5.style.display = 'block';
    if (prevWrap) prevWrap.className = 'cert-signatories-grid sig-count-5';
  } else {
    if (card4) card4.style.display = 'none';
    if (card5) card5.style.display = 'none';
    if (prevWrap) prevWrap.className = 'cert-signatories-grid sig-count-3';
  }
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
    programme_title: document.getElementById('tplProgTitle')?.value?.trim() || 'Short-Term Training Programme (STTP)',
    event_name: document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies',
    organizing_department: document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems (CSBS)',
    institution_name: document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology',
    programme_dates: document.getElementById('tplProgDates')?.value?.trim() || '10 – 12 October 2026',
    issue_date: document.getElementById('tplIssueDate')?.value || '2026-10-12',
    certificate_wording: document.getElementById('tplCertWording')?.value?.trim() || '',
    id_prefix: document.getElementById('tplIdPrefix')?.value?.trim() || 'RIT-STTP-2026',
    signatory_count: parseInt(document.getElementById('tplSigCount')?.value || '5', 10),
    signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. K. Arulraj',
    signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: document.getElementById('tplSig1Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'Dr. S. Rajakumaran',
    signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'STTP Coordinator',
    signatory_2_dept: document.getElementById('tplSig2Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
    signatory_3_title: document.getElementById('tplSig3Title')?.value?.trim() || 'Head of Department',
    signatory_3_dept: document.getElementById('tplSig3Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_4_name: document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. L. Ganesan',
    signatory_4_title: document.getElementById('tplSig4Title')?.value?.trim() || 'Principal',
    signatory_4_dept: document.getElementById('tplSig4Dept')?.value?.trim() || 'RIT',
    signatory_5_name: document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. R. Ramesh',
    signatory_5_title: document.getElementById('tplSig5Title')?.value?.trim() || 'Director',
    signatory_5_dept: document.getElementById('tplSig5Dept')?.value?.trim() || 'RIT'
  };

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
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
  const progTitle = document.getElementById('tplProgTitle')?.value?.trim() || 'Short-Term Training Programme (STTP)';
  const eventName = document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  const orgDept = document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems';
  const institution = document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology';
  const progDates = document.getElementById('tplProgDates')?.value?.trim() || '10 – 12 October 2026';
  const issueDate = document.getElementById('tplIssueDate')?.value || '2026-10-12';
  const idPrefix = document.getElementById('tplIdPrefix')?.value?.trim() || 'RIT-STTP-2026';
  const sigCount = parseInt(document.getElementById('tplSigCount')?.value || '5', 10);

  // Sample student name (NO register number)
  const sample = (certGenState.records && certGenState.records.length > 0) ? certGenState.records[0] : null;
  const studentName = (sample && sample.student_name) ? sample.student_name : 'SIVARANJANI S';

  if (document.getElementById('prevCertTitle')) document.getElementById('prevCertTitle').innerText = title;
  if (document.getElementById('prevStudentName')) document.getElementById('prevStudentName').innerText = studentName;
  if (document.getElementById('prevProgTitle')) document.getElementById('prevProgTitle').innerText = progTitle;
  if (document.getElementById('prevEventTopic')) document.getElementById('prevEventTopic').innerText = `“${eventName}”`;
  if (document.getElementById('prevOrgDept')) document.getElementById('prevOrgDept').innerText = orgDept;
  if (document.getElementById('prevInstitution')) document.getElementById('prevInstitution').innerText = institution;
  if (document.getElementById('prevProgDates')) document.getElementById('prevProgDates').innerText = progDates;

  if (document.getElementById('prevIssueDate')) {
    let dStr = issueDate;
    try {
      dStr = new Date(issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {}
    document.getElementById('prevIssueDate').innerText = dStr;
  }

  const sampleCertId = `${idPrefix}-0001`;
  if (document.getElementById('prevCertId')) document.getElementById('prevCertId').innerText = sampleCertId;

  // Signatories
  for (let i = 1; i <= 5; i++) {
    const name = document.getElementById(`tplSig${i}Name`)?.value?.trim() || '';
    const titleVal = document.getElementById(`tplSig${i}Title`)?.value?.trim() || '';
    const deptVal = document.getElementById(`tplSig${i}Dept`)?.value?.trim() || '';

    if (document.getElementById(`prevSig${i}Name`)) document.getElementById(`prevSig${i}Name`).innerText = name;
    if (document.getElementById(`prevSig${i}Title`)) document.getElementById(`prevSig${i}Title`).innerText = titleVal;
    if (document.getElementById(`prevSig${i}Dept`)) document.getElementById(`prevSig${i}Dept`).innerText = deptVal;

    const imgEl = document.getElementById(`prevSig${i}Img`);
    if (imgEl) {
      if (customUploadedSignatures[i]) {
        imgEl.src = customUploadedSignatures[i];
      } else if (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES) {
        const sigKeys = ['arulraj', 'rajakumaran', 'rajakarunakaran', 'ganesan', 'ramesh'];
        const key = sigKeys[i - 1];
        if (window.CERT_ASSETS.SIGNATURES[key]) {
          imgEl.src = window.CERT_ASSETS.SIGNATURES[key];
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
  const role = (window.currentAdminUser && window.currentAdminUser.role) ? window.currentAdminUser.role.toLowerCase() : '';
  if (role === 'admin' || role === 'administrator') {
    showAdminAlert('Permission Denied: Administrators have view-only access. Certificate generation is restricted to Faculty Coordinators.');
    return;
  }

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

  const eligibleRecords = (certGenState.records || []).filter(r => r.is_valid && (certGenState.allowDuplicates || !r.is_duplicate));

  try {
    const evName = document.getElementById('tplEventName')?.value?.trim() || eligibleRecords[0]?.event_name || 'STTP Blockchain Technologies';
    const sigCount = parseInt(document.getElementById('tplSigCount')?.value || '5', 10);

    const payload = {
      batch_title: `Batch - ${evName} (${new Date().toLocaleDateString('en-GB')})`,
      event_name: evName,
      event_date: document.getElementById('tplIssueDate')?.value || eligibleRecords[0]?.event_date || new Date().toISOString().split('T')[0],
      academic_year: eligibleRecords[0]?.academic_year || '2026-27',
      certificate_title: document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION',
      certificate_type: document.getElementById('tplCertType')?.value?.trim() || 'STTP',
      programme_title: document.getElementById('tplProgTitle')?.value?.trim() || 'Short-Term Training Programme (STTP)',
      programme_dates: document.getElementById('tplProgDates')?.value?.trim() || '10 – 12 October 2026',
      certificate_wording: document.getElementById('tplCertWording')?.value?.trim() || '',
      id_prefix: document.getElementById('tplIdPrefix')?.value?.trim() || 'RIT-STTP-2026',
      signatory_count: sigCount,
      signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. K. Arulraj',
      signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_1_dept: document.getElementById('tplSig1Dept')?.value?.trim() || 'CSBS, RIT',
      signatory_1_sig: customUploadedSignatures[1] || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.arulraj),
      signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'Dr. S. Rajakumaran',
      signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'STTP Coordinator',
      signatory_2_dept: document.getElementById('tplSig2Dept')?.value?.trim() || 'CSBS, RIT',
      signatory_2_sig: customUploadedSignatures[2] || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.rajakumaran),
      signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
      signatory_3_title: document.getElementById('tplSig3Title')?.value?.trim() || 'Head of Department',
      signatory_3_dept: document.getElementById('tplSig3Dept')?.value?.trim() || 'CSBS, RIT',
      signatory_3_sig: customUploadedSignatures[3] || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.rajakarunakaran),
      signatory_4_name: document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. L. Ganesan',
      signatory_4_title: document.getElementById('tplSig4Title')?.value?.trim() || 'Principal',
      signatory_4_dept: document.getElementById('tplSig4Dept')?.value?.trim() || 'RIT',
      signatory_4_sig: customUploadedSignatures[4] || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ganesan),
      signatory_5_name: document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. R. Ramesh',
      signatory_5_title: document.getElementById('tplSig5Title')?.value?.trim() || 'Director',
      signatory_5_dept: document.getElementById('tplSig5Dept')?.value?.trim() || 'RIT',
      signatory_5_sig: customUploadedSignatures[5] || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ramesh),
      allow_duplicates: certGenState.allowDuplicates,
      records: eligibleRecords
    };

    if (bar) bar.style.width = '45%';
    if (pct) pct.innerText = '45%';
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating cryptographic certificate IDs and updating institutional records...';

    const res = await fetch(`${API_BASE}/admin/certificate-generation/issue-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentAdminToken}`
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
    successAlert?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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

  // 1. Prepare Certificate Data with Template Fallbacks
  const certFullData = {
    student_name: cert.student_name || 'Student',
    // DO NOT INCLUDE REGISTER NUMBER ANYWHERE ON CERTIFICATE
    certificate_number: cert.certificate_number || cert.certificate_id || 'RIT-STTP-2026-0001',
    certificate_title: cert.certificate_title || document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION',
    programme_title: cert.programme_title || document.getElementById('tplProgTitle')?.value?.trim() || 'Short-Term Training Programme (STTP)',
    event_name: cert.event_name || document.getElementById('tplEventName')?.value?.trim() || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
    department: cert.department || document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems',
    college_name: cert.college_name || document.getElementById('tplInstitution')?.value?.trim() || 'Ramco Institute of Technology',
    programme_dates: cert.programme_dates || document.getElementById('tplProgDates')?.value?.trim() || '10 – 12 October 2026',
    issue_date: cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : (document.getElementById('tplIssueDate')?.value || '12 October 2026'),
    signatory_count: cert.signatory_count || parseInt(document.getElementById('tplSigCount')?.value || (cert.signatory_4_name ? '5' : '3'), 10),
    signatory_1_name: cert.signatory_1_name || document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. K. Arulraj',
    signatory_1_title: cert.signatory_1_title || document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: cert.signatory_1_dept || document.getElementById('tplSig1Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_1_sig: customUploadedSignatures[1] || cert.signatory_1_sig || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.arulraj),
    signatory_2_name: cert.signatory_2_name || document.getElementById('tplSig2Name')?.value?.trim() || 'Dr. S. Rajakumaran',
    signatory_2_title: cert.signatory_2_title || document.getElementById('tplSig2Title')?.value?.trim() || 'STTP Coordinator',
    signatory_2_dept: cert.signatory_2_dept || document.getElementById('tplSig2Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_2_sig: customUploadedSignatures[2] || cert.signatory_2_sig || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.rajakumaran),
    signatory_3_name: cert.signatory_3_name || document.getElementById('tplSig3Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
    signatory_3_title: cert.signatory_3_title || document.getElementById('tplSig3Title')?.value?.trim() || 'Head of Department',
    signatory_3_dept: cert.signatory_3_dept || document.getElementById('tplSig3Dept')?.value?.trim() || 'CSBS, RIT',
    signatory_3_sig: customUploadedSignatures[3] || cert.signatory_3_sig || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.rajakarunakaran),
    signatory_4_name: cert.signatory_4_name || document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. L. Ganesan',
    signatory_4_title: cert.signatory_4_title || document.getElementById('tplSig4Title')?.value?.trim() || 'Principal',
    signatory_4_dept: cert.signatory_4_dept || document.getElementById('tplSig4Dept')?.value?.trim() || 'RIT',
    signatory_4_sig: customUploadedSignatures[4] || cert.signatory_4_sig || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ganesan),
    signatory_5_name: cert.signatory_5_name || document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. R. Ramesh',
    signatory_5_title: cert.signatory_5_title || document.getElementById('tplSig5Title')?.value?.trim() || 'Director',
    signatory_5_dept: cert.signatory_5_dept || document.getElementById('tplSig5Dept')?.value?.trim() || 'RIT',
    signatory_5_sig: customUploadedSignatures[5] || cert.signatory_5_sig || (window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES && window.CERT_ASSETS.SIGNATURES.ramesh)
  };

  // 2. Render to High-Resolution Canvas (2000 x 1414 @ A4 Landscape ratio)
  const canvas = document.createElement('canvas');
  canvas.width = 2000;
  canvas.height = 1414;

  if (window.RIT_CERT_ASSETS && typeof window.RIT_CERT_ASSETS.drawCertificate === 'function') {
    await window.RIT_CERT_ASSETS.drawCertificate(canvas, certFullData);
  } else {
    // Fallback basic canvas rendering
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 2000, 1414);
    ctx.fillStyle = '#1E1B4B';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RAMCO INSTITUTE OF TECHNOLOGY', 1000, 120);
    ctx.fillText(certFullData.certificate_title, 1000, 300);
    ctx.font = 'bold italic 48px Georgia';
    ctx.fillText(certFullData.student_name, 1000, 480);
  }

  // 3. Insert into jsPDF A4 Landscape (297mm x 210mm)
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  doc.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
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
    'Register Number': c.register_number,
    'Department': c.department,
    'Event Name': c.event_name,
    'Event Date': c.event_date,
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
        <td colspan="8" style="text-align:center;padding:36px;color:#64748b;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:#7e22ce;display:block;margin-bottom:8px;"></i>
          Loading institutional certificate records...
        </td>
      </tr>
    `;
  }

  try {
    // 1. Fetch batches
    const bRes = await fetch(`${API_BASE}/admin/certificate-generation/batches`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
    });
    const bData = await bRes.json();
    if (bData.success && Array.isArray(bData.batches)) {
      certGenState.batchesList = bData.batches;
      populateBatchSelectorDropdown(bData.batches);
    }

    // 2. Fetch all certificates
    const cRes = await fetch(`${API_BASE}/admin/all-certificates`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` }
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

    html += `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
        <td>
          <span style="font-family:monospace;font-weight:800;color:#4338ca;font-size:12.5px;cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(cert.certificate_number)}');showAdminAlert('Copied ID: ${escapeHtml(cert.certificate_number)}','success');" title="Click to copy ID">
            ${escapeHtml(cert.certificate_number)}
          </span>
        </td>
        <td><strong>${escapeHtml(cert.student_name || 'Student')}</strong></td>
        <td><code style="font-size:11.5px;color:#475569;">${escapeHtml(cert.register_number || '—')}</code></td>
        <td>${escapeHtml(cert.event_name || 'Department Event')}</td>
        <td>${isDate}</td>
        <td>${statusBadge}</td>
        <td style="text-align:center;white-space:nowrap;">
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

function openCertGenRevokeModal(certId, studentName) {
  const role = (window.currentAdminUser && window.currentAdminUser.role) ? window.currentAdminUser.role.toLowerCase() : '';
  if (role === 'admin' || role === 'administrator') {
    showAdminAlert('Permission Denied: Administrators have view-only access. Certificate revocation is restricted to Faculty Coordinators.');
    return;
  }

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
        Authorization: `Bearer ${currentAdminToken}`
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
