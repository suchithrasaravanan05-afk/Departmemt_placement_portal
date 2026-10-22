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
  updateLiveCertificatePreview();
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
// 4. TEMPLATE LIVE PREVIEW
// ============================================================
function updateLiveCertificatePreview() {
  const title = document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION';
  const dept = document.getElementById('tplDeptName')?.value?.trim() || 'DEPARTMENT OF COMPUTER SCIENCE AND BUSINESS SYSTEMS';
  const acc = document.getElementById('tplAccreditation')?.value?.trim() || 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  const preamble = document.getElementById('tplPreamble')?.value?.trim() || 'This is to certify that';

  const sig1Name = document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. D. Kesavaraja';
  const sig1Title = document.getElementById('tplSig1Title')?.value?.trim() || 'Head of Department (HOD)';
  const sig2Name = document.getElementById('tplSig2Name')?.value?.trim() || 'Dr. S. Rajakarunakarun';
  const sig2Title = document.getElementById('tplSig2Title')?.value?.trim() || 'Vice Principal / Patron';
  const sig3Name = document.getElementById('tplSig3Name')?.value?.trim() || 'Dr. L. Ganesan';
  const sig3Title = document.getElementById('tplSig3Title')?.value?.trim() || 'Principal / Chief Patron';

  // Sample record or first record from batch
  const sample = (certGenState.records && certGenState.records.length > 0) ? certGenState.records[0] : null;
  const studentName = (sample && sample.student_name) ? sample.student_name : 'SIVARANJANI S';
  const regNo = (sample && sample.register_number) ? sample.register_number : '953623244001';
  const eventName = (sample && sample.event_name) ? sample.event_name : 'Full Stack Cloud Architecture Masterclass';
  const eventDate = (sample && sample.event_date) ? sample.event_date : '2026-10-22';

  if (document.getElementById('prevCertTitle')) document.getElementById('prevCertTitle').innerText = title;
  if (document.getElementById('prevDeptName')) document.getElementById('prevDeptName').innerText = dept;
  if (document.getElementById('prevAccreditation')) document.getElementById('prevAccreditation').innerText = acc;
  if (document.getElementById('prevPreamble')) document.getElementById('prevPreamble').innerText = preamble;

  if (document.getElementById('prevStudentName')) document.getElementById('prevStudentName').innerText = studentName.toUpperCase();
  if (document.getElementById('prevStudentMeta')) {
    document.getElementById('prevStudentMeta').innerHTML = `Register No: <strong>${escapeHtml(regNo)}</strong> &bull; Department of <strong>${escapeHtml(sample?.department || 'Computer Science and Business Systems')}</strong>`;
  }
  if (document.getElementById('prevEventName')) document.getElementById('prevEventName').innerText = `"${eventName}"`;
  if (document.getElementById('prevEventDate')) {
    const dStr = eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    document.getElementById('prevEventDate').innerText = `conducted on ${dStr}.`;
  }

  if (document.getElementById('prevSig1Name')) document.getElementById('prevSig1Name').innerText = sig1Name;
  if (document.getElementById('prevSig1Title')) document.getElementById('prevSig1Title').innerText = sig1Title;
  if (document.getElementById('prevSig2Name')) document.getElementById('prevSig2Name').innerText = sig2Name;
  if (document.getElementById('prevSig2Title')) document.getElementById('prevSig2Title').innerText = sig2Title;
  if (document.getElementById('prevSig3Name')) document.getElementById('prevSig3Name').innerText = sig3Name;
  if (document.getElementById('prevSig3Title')) document.getElementById('prevSig3Title').innerText = sig3Title;

  // QR preview thumbnail
  const sampleCertId = 'RIT-CSBS-2026-A83F192C';
  const verifyTarget = `${window.location.origin}/verify-certificate.html?id=${sampleCertId}`;

  if (document.getElementById('tplVerifyUrlPreview')) {
    document.getElementById('tplVerifyUrlPreview').innerText = `${window.location.origin}/verify-certificate.html?id=RIT-CSBS-2026-XXXXXXXX`;
  }

  if (window.QRCode && window.QRCode.toDataURL) {
    window.QRCode.toDataURL(verifyTarget, { width: 48, margin: 0 })
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

  const evName = (eligible[0] && eligible[0].event_name) ? eligible[0].event_name : 'Department Placement Event';
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
    const payload = {
      batch_title: `Batch - ${eligibleRecords[0]?.event_name || 'Event'} (${new Date().toLocaleDateString('en-GB')})`,
      event_name: eligibleRecords[0]?.event_name || 'Department Event',
      event_date: eligibleRecords[0]?.event_date || new Date().toISOString().split('T')[0],
      academic_year: eligibleRecords[0]?.academic_year || '2026-27',
      certificate_title: document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION',
      signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. D. Kesavaraja',
      signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Head of Department (HOD)',
      signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'Dr. S. Rajakarunakarun',
      signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'Vice Principal / Patron',
      signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'Dr. L. Ganesan',
      signatory_3_title: document.getElementById('tplSig3Title')?.value?.trim() || 'Principal / Chief Patron',
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

    // Scroll to success banner
    successAlert?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Batch generation error:', err);
    showAdminAlert('Network or server error during batch generation.');
  }
}

// ============================================================
// 6. GENERATE INDIVIDUAL PDF & ZIP ARCHIVE
// ============================================================
async function generateSingleCertificatePdfDoc(cert) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('PDF generator library not loaded.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

  // White Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Border (Navy #1e1b4b)
  doc.setDrawColor(30, 27, 75);
  doc.setLineWidth(1.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Inner Border (Gold #b45309)
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Corner decorative marks
  const corners = [
    [12, 12], [pageWidth - 12, 12],
    [12, pageHeight - 12], [pageWidth - 12, pageHeight - 12]
  ];
  doc.setFillColor(180, 83, 9);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 1.8, 'F');
  });

  // Logo
  const logoBase64 = (typeof window !== 'undefined' && window.RIT_LOGO_BASE64) ? window.RIT_LOGO_BASE64 : null;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 26, 17, 23, 23);
    } catch (e) {}
  }

  // College Name Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(30, 27, 75);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 26, { align: 'center' });

  // Department Subheader
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(180, 83, 9);
  doc.text('DEPARTMENT OF COMPUTER SCIENCE AND BUSINESS SYSTEMS', pageWidth / 2, 33, { align: 'center' });

  // Accreditation text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai', pageWidth / 2, 38.5, { align: 'center' });

  // Gold Divider
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.6);
  doc.line(26, 43, pageWidth - 26, 43);

  // Certificate Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 83, 9);
  doc.text(cert.certificate_title || 'CERTIFICATE OF PARTICIPATION', pageWidth / 2, 54, { align: 'center' });

  // Preamble
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11.5);
  doc.setTextColor(71, 85, 105);
  doc.text('This is to certify that', pageWidth / 2, 64, { align: 'center' });

  // Student Full Name
  const studentName = (cert.student_name || 'Student').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42);
  doc.text(studentName, pageWidth / 2, 75, { align: 'center' });

  // Underline
  const nameWidth = doc.getTextWidth(studentName);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line((pageWidth - nameWidth) / 2, 77, (pageWidth + nameWidth) / 2, 77);

  // Register Number & Department Line
  const regNo = cert.register_number || '---';
  const dept = cert.department || 'Computer Science and Business Systems';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Register No: ${regNo}   |   Department of ${dept}`, pageWidth / 2, 86, { align: 'center' });

  // Participation Statement
  const ach = cert.achievement || cert.certificate_type || 'participation';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`has demonstrated commendable ${ach.toLowerCase()} in the departmental event / workshop titled`, pageWidth / 2, 98, { align: 'center' });

  // Event Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(30, 27, 75);
  doc.text(`"${cert.event_name || 'Department Event'}"`, pageWidth / 2, 107.5, { align: 'center' });

  // Event Date
  const eventDateStr = cert.event_date ? new Date(cert.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`conducted on ${eventDateStr}.`, pageWidth / 2, 116, { align: 'center' });

  // Signatories Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(26, 128, pageWidth - 26, 128);

  // Signatory 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 27, 75);
  doc.text(cert.signatory_1_name || 'Dr. D. Kesavaraja', 28, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.signatory_1_title || 'Head of Department (HOD)', 28, 145);

  // Signatory 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 27, 75);
  doc.text(cert.signatory_2_name || 'Dr. S. Rajakarunakarun', pageWidth / 2, 139, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.signatory_2_title || 'Vice Principal / Patron', pageWidth / 2, 145, { align: 'center' });

  // Signatory 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 27, 75);
  doc.text(cert.signatory_3_name || 'Dr. L. Ganesan', pageWidth - 28, 139, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.signatory_3_title || 'Principal / Chief Patron', pageWidth - 28, 145, { align: 'right' });

  // Footer Divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.4);
  doc.line(26, 153, pageWidth - 26, 153);

  // Footer - Left: Certificate ID & Issue Date
  const certNumber = cert.certificate_number || cert.certificate_id || 'RIT-CSBS-CERT';
  const issueDateStr = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Certificate ID / Verification Number:', 28, 163);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(67, 56, 202);
  doc.text(certNumber, 28, 169);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Issue: ${issueDateStr}`, 28, 175);
  doc.text('Issuing Authority: Ramco Institute of Technology, CSBS Placement Cell', 28, 180);

  // QR Code Rendering
  const verifyUrl = `${window.location.origin}/verify-certificate.html?id=${encodeURIComponent(certNumber)}`;
  if (window.QRCode && window.QRCode.toDataURL) {
    try {
      const qrDataUrl = await window.QRCode.toDataURL(verifyUrl, { margin: 1, width: 140 });
      doc.addImage(qrDataUrl, 'PNG', pageWidth - 60, 158, 24, 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to verify authenticity', pageWidth - 48, 185, { align: 'center' });
    } catch (qrErr) {
      console.warn('QR code render warning:', qrErr);
    }
  }

  // Digitally Verified Stamp Box
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 125, 161, 58, 18, 2, 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text('DIGITALLY VERIFIED', pageWidth - 125 + 29, 169, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Institutional Digital Signature', pageWidth - 125 + 29, 174, { align: 'center' });

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
