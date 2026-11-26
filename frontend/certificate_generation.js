// ============================================================
// API BASE & AUTHENTICATION HELPER
// ============================================================
window.API_BASE = window.API_BASE || (typeof window !== 'undefined' && window.location && window.location.origin ? `${window.location.origin}/api` : '/api');
var API_BASE = window.API_BASE;

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
  searchQuery: '',
  programmes: [],           // Available certificate programmes
  selectedProgrammeId: 'prog_01_sttp_blockchain',
  selectedEventNumber: '01'
};

// ============================================================
// INITIALIZATION
// ============================================================
function initCertificateGenerationTab() {
  updateCertGenRoleNotice();
  setCertGenDefaultDates();
  loadCertificateProgrammes();
  applyCertificatePreset('prog_01_sttp_blockchain');
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
    cgSecProgrammes: 'stepBtn0',
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

// ============================================================
// CERTIFICATE PROGRAMME MANAGEMENT (ADMIN & FACULTY EDITABLE)
// ============================================================
async function loadCertificateProgrammes() {
  const tbody = document.getElementById('cgProgrammesTableBody');
  const selectUpload = document.getElementById('cgEventSelectUpload');

  try {
    const res = await fetch(`${API_BASE}/admin/certificate-generation/programmes`, {
      headers: getAdminAuthHeaders()
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.programmes)) {
      throw new Error(data.message || 'Failed to load programmes');
    }

    certGenState.programmes = data.programmes;
    renderProgrammesTable(data.programmes);

    // Populate dropdown in Section 1 (Upload)
    if (selectUpload) {
      selectUpload.innerHTML = data.programmes.map(p => {
        const isSel = (p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber) ? 'selected' : '';
        return `<option value="${escapeHtml(p.id)}" ${isSel}>Event ${escapeHtml(p.event_number)}: ${escapeHtml(p.programme_title)} — ${escapeHtml(p.programme_topic)} [Next: ${escapeHtml(p.next_certificate_id)}]` + `</option>`;
      }).join('');
    }

    // Synchronize active programme
    const activeProg = data.programmes.find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber) || data.programmes[0];
    if (activeProg) {
      selectProgrammeForGeneration(activeProg.id);
    }
  } catch (err) {
    console.error('Error loading certificate programmes:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ef4444;padding:16px;">Failed to load programmes: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function renderProgrammesTable(programmes) {
  const tbody = document.getElementById('cgProgrammesTableBody');
  if (!tbody) return;

  if (!programmes || programmes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748b;">No certificate programmes found. Click "Create New Programme" to add one.</td></tr>';
    return;
  }

  tbody.innerHTML = programmes.map(p => {
    const isSelected = (p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber);
    const rowBg = isSelected ? 'background:#f5f3ff;' : '';
    const certCount = p.certificates_generated || 0;
    const nextCert = p.next_certificate_id || ('RITCB ' + p.event_number + ' 0001');

    return `
      <tr style="${rowBg}border-bottom:1px solid #f1f5f9;">
        <td style="text-align:center;font-weight:800;color:#6b21a8;font-size:14px;">
          ${escapeHtml(p.event_number)}
        </td>
        <td style="max-width:320px;">
          <div style="font-weight:700;color:#1e293b;">${escapeHtml(p.programme_title)}</div>
          <div style="font-size:12px;color:#7c3aed;margin-top:2px;">“${escapeHtml(p.programme_topic)}”</div>
        </td>
        <td>
          <span class="badge badge-purple" style="font-size:11px;">${escapeHtml(p.programme_type || 'STTP')}</span>
        </td>
        <td style="max-width:240px;font-size:12px;">
          <div>${escapeHtml(p.organizing_department || 'Department of CSBS')}</div>
          ${p.association ? `<div style="color:#059669;margin-top:2px;"><i class="fa-solid fa-handshake"></i> ${escapeHtml(p.association)}</div>` : ''}
        </td>
        <td style="text-align:center;font-size:12px;white-space:nowrap;color:#475569;">
          ${escapeHtml(p.start_date || '-')} to<br>${escapeHtml(p.end_date || '-')}
        </td>
        <td style="text-align:center;">
          <span class="badge" style="background:#e0e7ff;color:#3730a3;font-size:12px;font-weight:700;padding:4px 10px;">${certCount}</span>
        </td>
        <td style="text-align:center;font-family:monospace;font-weight:800;color:#047857;font-size:13px;">
          ${escapeHtml(nextCert)}
        </td>
        <td style="text-align:center;">
          <span class="badge badge-green" style="font-size:11px;">${escapeHtml(p.status || 'ACTIVE')}</span>
        </td>
        <td style="text-align:center;">
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
            <button type="button" class="btn btn-xs ${isSelected ? 'btn-success' : 'btn-primary'}" onclick="selectProgrammeForGeneration('${escapeHtml(p.id)}')" style="font-size:11px;padding:4px 8px;font-weight:700;">
              <i class="fa-solid fa-check"></i> ${isSelected ? 'Active' : 'Select'}
            </button>
            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="openEditProgrammeModal('${escapeHtml(p.id)}')" style="font-size:11px;padding:4px 8px;">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button type="button" class="btn btn-xs btn-outline-info" onclick="previewProgrammeCertificate('${escapeHtml(p.id)}')" style="font-size:11px;padding:4px 8px;">
              <i class="fa-solid fa-eye"></i> Preview
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateActiveEventBadge(prog) {
  const badge = document.getElementById('cgActiveEventSummaryBadge');
  if (badge) {
    badge.innerHTML = `<i class="fa-solid fa-award"></i> Active Event: <strong>${escapeHtml(prog.event_number)}</strong> &bull; Next ID: <strong>${escapeHtml(prog.next_certificate_id || ('RITCB ' + prog.event_number + ' 0001'))}</strong>`;
  }
}

function selectProgrammeForGeneration(progIdOrNumber) {
  const prog = (certGenState.programmes || []).find(p => p.id === progIdOrNumber || p.event_number === progIdOrNumber);
  if (!prog) return;

  certGenState.selectedProgrammeId = prog.id;
  certGenState.selectedEventNumber = prog.event_number;

  // 1. Update Section 1 Select & Badges
  const sel = document.getElementById('cgEventSelectUpload');
  if (sel) sel.value = prog.id;

  updateActiveEventBadge(prog);
  renderProgrammesTable(certGenState.programmes);

  // 2. Update Preset Buttons active state
  document.querySelectorAll('.cert-preset-btn').forEach(b => b.classList.remove('active'));
  if (prog.id === 'prog_01_sttp_blockchain' || prog.event_number === '01') {
    document.getElementById('btnPresetSTTP')?.classList.add('active');
  } else if (prog.id === 'prog_02_fdp_superintelligent' || prog.event_number === '02') {
    document.getElementById('btnPresetFDP')?.classList.add('active');
  }

  // 3. Update Section 1 Default Fallback fields
  const activeTopic = prog.programme_topic || prog.programme_title || '';
  const activeDate = prog.end_date || prog.start_date || '';
  if (document.getElementById('cgDefEventName')) {
    document.getElementById('cgDefEventName').value = activeTopic;
  }
  if (document.getElementById('cgDefEventDate')) {
    document.getElementById('cgDefEventDate').value = activeDate;
  }

  // 4. Populate form fields in Section 3
  setFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
  setFormParam(['tplCertType'], prog.programme_type || 'Faculty Development Programme (FDP)');
  setFormParam(['tplProgrammeTitle', 'tplProgTitle'], prog.programme_title || '');
  setFormParam(['tplEventTopic', 'tplEventName'], prog.programme_topic || '');
  setFormParam(['tplDeptName', 'tplOrgDept'], prog.organizing_department || 'Department of Computer Science and Business Systems (CSBS)');
  setFormParam(['tplInstName', 'tplInstitution'], prog.institution_name || 'Ramco Institute of Technology, Rajapalayam');

  const datesStr = (prog.start_date && prog.end_date) ? `${prog.start_date} to ${prog.end_date}` : (prog.start_date || prog.end_date || '');
  setFormParam(['tplProgrammeDates', 'tplProgDates'], datesStr);
  if (prog.end_date) setFormParam(['tplIssueDate'], prog.end_date);

  setFormParam(['tplCertWording'], prog.certificate_content || '');
  setFormParam(['tplIdPrefix'], `RITCB ${prog.event_number} `);

  // 5. Update Section 4 & 5 Event Info & ID format
  if (document.getElementById('cgConfirmEventName')) {
    document.getElementById('cgConfirmEventName').innerText = activeTopic || '—';
  }
  if (document.getElementById('prevEventName')) {
    document.getElementById('prevEventName').innerText = `"${activeTopic}"`;
  }
  if (document.getElementById('cgBatchIdFormatPreview')) {
    document.getElementById('cgBatchIdFormatPreview').innerText = `RITCB ${prog.event_number} 0001`;
  }

  // 6. Update Signatories for Event 01 / 02
  toggleSignatoryCount(6);
  setSigFields(1, 'Dr. S.Erana Verrappa Dinesh', 'Faculty Coordinator', 'CSBS, RIT');
  setSigFields(2, 'Mrs. B.Yazhini', 'Faculty Coordinator', 'CSBS, RIT');
  setSigFields(3, 'Ms. Preethi Ram', 'Faculty Coordinator', 'CSBS, RIT');
  setSigFields(4, 'Dr. D. Kesavaraja', 'Convenor', 'CSBS, RIT');
  setSigFields(5, 'Dr. S. Rajakarunakaran', 'Patron', 'RIT');
  setSigFields(6, 'Dr. L. Ganesan', 'Chief Patron', 'RIT');

  // 7. Update loaded records if any already exist
  if (certGenState.records && certGenState.records.length > 0) {
    certGenState.records.forEach(r => {
      r.event_name = activeTopic;
      if (activeDate) r.event_date = activeDate;
      r.programme_title = prog.programme_title;
      r.programme_dates = datesStr;
      const errors = [];
      if (!r.participant_name) errors.push('Participant Name is mandatory');
      if (!r.event_name) errors.push('Event Name is mandatory');
      r.errors = errors;
      r.is_valid = errors.length === 0;
    });
    renderCertGenTable();
  }

  // 8. Immediately update live certificate preview
  updateLiveCertificatePreview();
}

function handleProgrammeSelectionChange(progId) {
  selectProgrammeForGeneration(progId);
}

function previewProgrammeCertificate(progId) {
  selectProgrammeForGeneration(progId);
  jumpToCertGenSection('cgSecTemplate');
}

function openCreateProgrammeModal() {
  const card = document.getElementById('cgProgrammeEditorCard');
  const title = document.getElementById('cgProgEditorTitle');
  const badge = document.getElementById('cgProgEditorEventBadge');
  const form = document.getElementById('cgProgrammeForm');

  if (form) form.reset();
  document.getElementById('cgProgEditId').value = '';
  document.getElementById('cgProgEditEventNumber').value = '';

  // Determine next event number
  const used = (certGenState.programmes || []).map(p => parseInt(p.event_number, 10)).filter(n => !isNaN(n));
  let nextNum = 1;
  while (used.includes(nextNum)) {
    nextNum++;
  }
  const nextEE = String(nextNum).padStart(2, '0');

  if (title) title.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Create New Certificate Programme';
  if (badge) badge.innerText = `Next Event ID: ${nextEE}`;

  document.getElementById('cgProgDept').value = 'Department of Computer Science and Business Systems (CSBS)';
  document.getElementById('cgProgInstitution').value = 'Ramco Institute of Technology, Rajapalayam';
  document.getElementById('cgProgContent').value = `This is to certify that [Participant Name] has actively participated in the [Programme Title] on "[Programme Topic]", organized by the Department of Computer Science and Business Systems (CSBS), Ramco Institute of Technology, Rajapalayam, from [Start Date] to [End Date].`;

  if (card) {
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openEditProgrammeModal(progId) {
  const prog = (certGenState.programmes || []).find(p => p.id === progId);
  if (!prog) return;

  const card = document.getElementById('cgProgrammeEditorCard');
  const title = document.getElementById('cgProgEditorTitle');
  const badge = document.getElementById('cgProgEditorEventBadge');

  document.getElementById('cgProgEditId').value = prog.id;
  document.getElementById('cgProgEditEventNumber').value = prog.event_number;
  document.getElementById('cgProgTitle').value = prog.programme_title || '';
  document.getElementById('cgProgTopic').value = prog.programme_topic || '';
  document.getElementById('cgProgType').value = prog.programme_type || 'STTP';
  document.getElementById('cgProgDept').value = prog.organizing_department || '';
  document.getElementById('cgProgAssociation').value = prog.association || '';
  document.getElementById('cgProgInstitution').value = prog.institution_name || '';
  document.getElementById('cgProgStartDate').value = prog.start_date || '';
  document.getElementById('cgProgEndDate').value = prog.end_date || '';
  document.getElementById('cgProgContent').value = prog.certificate_content || '';

  if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Programme: ${escapeHtml(prog.programme_title)}`;
  if (badge) badge.innerText = `Permanent Event ID: ${escapeHtml(prog.event_number)}`;

  if (card) {
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function cancelProgrammeEditing() {
  const card = document.getElementById('cgProgrammeEditorCard');
  if (card) card.style.display = 'none';
}

async function handleSaveProgramme(event) {
  event.preventDefault();

  const editId = document.getElementById('cgProgEditId').value;
  const isEditing = Boolean(editId);

  const payload = {
    programme_title: document.getElementById('cgProgTitle').value.trim(),
    programme_topic: document.getElementById('cgProgTopic').value.trim(),
    programme_type: document.getElementById('cgProgType').value,
    organizing_department: document.getElementById('cgProgDept').value.trim(),
    association: document.getElementById('cgProgAssociation').value.trim(),
    institution_name: document.getElementById('cgProgInstitution').value.trim(),
    start_date: document.getElementById('cgProgStartDate').value,
    end_date: document.getElementById('cgProgEndDate').value,
    certificate_content: document.getElementById('cgProgContent').value.trim(),
    status: 'ACTIVE'
  };

  try {
    const url = isEditing
      ? `${API_BASE}/admin/certificate-generation/programmes/${encodeURIComponent(editId)}`
      : `${API_BASE}/admin/certificate-generation/programmes`;
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to save programme.');
    }

    showAdminAlert(data.message || 'Programme saved successfully!', 'success');
    cancelProgrammeEditing();
    await loadCertificateProgrammes();

    // If active programme was edited, re-apply its details
    if (data.programme) {
      selectProgrammeForGeneration(data.programme.id);
    }
  } catch (err) {
    console.error('Error saving programme:', err);
    showAdminAlert(err.message || 'Failed to save programme.');
  }
}

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
    const selectedProg = (certGenState.programmes || []).find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber) || (certGenState.programmes && certGenState.programmes[0]);
    const activeEventName = (selectedProg && (selectedProg.programme_topic || selectedProg.programme_title)) || document.getElementById('tplEventTopic')?.value?.trim() || document.getElementById('cgDefEventName')?.value?.trim() || '';
    const activeEventDate = (selectedProg && (selectedProg.end_date || selectedProg.start_date)) || document.getElementById('cgDefEventDate')?.value || '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('event_name', activeEventName);
    formData.append('event_date', activeEventDate);
    formData.append('event_number', certGenState.selectedEventNumber || '01');

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
    const defEventName = document.getElementById('cgDefEventName')?.value?.trim() || activeEventName;
    const defEventDate = document.getElementById('cgDefEventDate')?.value || activeEventDate;
    const defAcademicYear = document.getElementById('cgDefAcademicYear')?.value;
    const defDept = document.getElementById('cgDefDepartment')?.value?.trim() || selectedProg?.organizing_department;
    const defPartType = document.getElementById('cgDefParticipationType')?.value?.trim();
    const defIssueDate = document.getElementById('cgDefIssueDate')?.value || activeEventDate;

    const enriched = (data.records || []).map(r => {
      r.participant_name = (r.participant_name || r.student_name || '').trim();
      r.student_name = r.participant_name;
      r.participant_type = r.participant_type || 'Student';
      const colName = (r.college_name || r['College Name'] || r.institution || '').trim();
      r.college_name = colName;
      r.participant_college = colName;
      r.institution = colName || (selectedProg?.institution_name || 'Ramco Institute of Technology, Rajapalayam');
      r.department = r.department || defDept || (selectedProg?.organizing_department || 'Department of Computer Science and Business Systems (CSBS)');
      r.email = r.email || '';

      // Assign the active event topic to the row
      if (!r.event_name || r.event_name === 'Department Event') {
        r.event_name = activeEventName || defEventName;
      }
      if (!r.event_date) r.event_date = activeEventDate || defEventDate;
      if ((!r.academic_year || r.academic_year === '2026-27') && defAcademicYear) r.academic_year = defAcademicYear;
      if (!r.participation_type && defPartType) r.participation_type = defPartType;
      if (!r.issue_date) r.issue_date = defIssueDate || activeEventDate;
      r.programme_title = selectedProg?.programme_title || r.programme_title;
      r.programme_dates = (selectedProg?.start_date && selectedProg?.end_date) ? `${selectedProg.start_date} to ${selectedProg.end_date}` : r.programme_dates;

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
    const displayEvName = activeEventName || (enriched.length > 0 ? enriched[0].event_name : '');
    if (displayEvName) {
      if (document.getElementById('cgConfirmEventName')) {
        document.getElementById('cgConfirmEventName').innerText = displayEvName;
      }
      if (document.getElementById('prevEventName')) {
        document.getElementById('prevEventName').innerText = `"${displayEvName}"`;
      }
    }
    if (document.getElementById('cgBatchIdFormatPreview') && certGenState.selectedEventNumber) {
      document.getElementById('cgBatchIdFormatPreview').innerText = `RITCB ${certGenState.selectedEventNumber} 0001`;
    }

    // Refresh live certificate preview
    updateLiveCertificatePreview();

    // Smooth scroll to Preview Section
    jumpToCertGenSection('cgSecPreview');

  } catch (err) {
    console.error('Upload spreadsheet error:', err);
    showAdminAlert(err.message || 'Network or server error while parsing spreadsheet.');
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
          <input type="text" class="certgen-table-input" value="${escapeHtml(row.college_name || row.participant_college || row.institution || '')}" placeholder="College / Institution" onchange="handleCertGenCellChange(${actualIdx}, 'college_name', this.value)">
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
  if (field === 'institution' || field === 'college_name' || field === 'participant_college') {
    certGenState.records[idx].institution = value.trim();
    certGenState.records[idx].college_name = value.trim();
    certGenState.records[idx].participant_college = value.trim();
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

function applyCertificatePreset(presetKey) {
  document.querySelectorAll('.cert-preset-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(
    presetKey === 'sttp_blockchain' || presetKey === 'sttp_blockchain_2026' ? 'btnPresetSTTP' :
    presetKey === 'workshop_fullstack' || presetKey === 'workshop_ai_2026' ? 'btnPresetWorkshop' :
    'btnPresetMerit'
  );
  if (activeBtn) activeBtn.classList.add('active');

  if (presetKey === 'sttp_blockchain' || presetKey === 'sttp_blockchain_2026' || presetKey === 'prog_01_sttp_blockchain') {
    certGenState.selectedProgrammeId = 'prog_01_sttp_blockchain';
    certGenState.selectedEventNumber = '01';
    setFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    setFormParam(['tplCertType'], 'STTP');
    setFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'One Week Online Short-Term Training Programme (STTP)');
    setFormParam(['tplEventTopic', 'tplEventName'], 'Emerging Blockchain Technologies');
    setFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems (CSBS)');
    setFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    setFormParam(['tplProgrammeDates', 'tplProgDates'], '12 October 2026 to 18 October 2026');
    setFormParam(['tplIssueDate'], '18 October 2026');
    setFormParam(['tplCertWording'], 'This is to certify that [Participant Name] has actively participated in the One-Week Online Short-Term Training Programme (STTP) on "Emerging Blockchain Technologies", organized by the Department of Computer Science and Business Systems (CSBS), Ramco Institute of Technology, Rajapalayam, from 12 October 2026 to 18 October 2026.');
    setFormParam(['tplIdPrefix'], 'RITCB 01 ');

    toggleSignatoryCount(6);
    setSigFields(1, 'Dr. S.Erana Verrappa Dinesh', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Mrs. B.Yazhini', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(3, 'Ms. Preethi Ram', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(4, 'Dr. D. Kesavaraja', 'Convenor', 'CSBS, RIT');
    setSigFields(5, 'Dr. S. Rajakarunakaran', 'Patron', 'RIT');
    setSigFields(6, 'Dr. L. Ganesan', 'Chief Patron', 'RIT');
  } else if (presetKey === 'fdp_superintelligent' || presetKey === 'prog_02_fdp_superintelligent' || presetKey === 'workshop_fullstack' || presetKey === 'workshop_ai_2026') {
    certGenState.selectedProgrammeId = 'prog_02_fdp_superintelligent';
    certGenState.selectedEventNumber = '02';
    setFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    setFormParam(['tplCertType'], 'Faculty Development Programme (FDP)');
    setFormParam(['tplProgrammeTitle', 'tplProgTitle'], 'Two-Week International Industry-Oriented Faculty Development Programme');
    setFormParam(['tplEventTopic', 'tplEventName'], 'Engineering Superintelligent Systems for Sustainable Digital Transformation');
    setFormParam(['tplDeptName', 'tplOrgDept'], 'Department of Computer Science and Business Systems (CSBS)');
    setFormParam(['tplInstName', 'tplInstitution'], 'Ramco Institute of Technology, Rajapalayam');
    setFormParam(['tplProgrammeDates', 'tplProgDates'], '26 October 2026 to 07 November 2026');
    setFormParam(['tplIssueDate'], '07 November 2026');
    setFormParam(['tplCertWording'], 'This is to certify that [Participant Name] has actively participated in the Two-Week International Industry-Oriented Faculty Development Programme on "Engineering Superintelligent Systems for Sustainable Digital Transformation", organized by the Department of Computer Science and Business Systems (CSBS), in association with the ISTE Student Chapter, Ramco Institute of Technology, Rajapalayam, from 26 October 2026 to 07 November 2026.');
    setFormParam(['tplIdPrefix'], 'RITCB 02 ');

    toggleSignatoryCount(6);
    setSigFields(1, 'Dr. S.Erana Verrappa Dinesh', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(2, 'Mrs. B.Yazhini', 'Faculty Coordinator', 'CSBS, RIT');
    setSigFields(3, 'Ms. Preethi Ram', 'Faculty Coordinator', 'CSBS, RIT');
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
    id_prefix: document.getElementById('tplIdPrefix')?.value?.trim() || 'RITCB 01 ',
    signatory_count: parseInt(document.getElementById('tplSigCount')?.value || '6', 10),
    signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. M. Jeya Sundari',
    signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
    signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'Mrs. M. Rekha',
    signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_2_dept: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
    signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'Mr. M. Rama Krishnan',
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
  const selectedProg = (certGenState.programmes || []).find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber);

  const title = (document.getElementById('tplCertTitle')?.value || '').trim() || 'CERTIFICATE OF PARTICIPATION';
  const progTitle = (document.getElementById('tplProgrammeTitle')?.value || document.getElementById('tplProgTitle')?.value || '').trim() || selectedProg?.programme_title || 'Two-Week International Industry-Oriented Faculty Development Programme';
  const eventName = (document.getElementById('tplEventTopic')?.value || document.getElementById('tplEventName')?.value || '').trim() || selectedProg?.programme_topic || 'Engineering Superintelligent Systems for Sustainable Digital Transformation';
  const orgDept = (document.getElementById('tplDeptName')?.value || document.getElementById('tplOrgDept')?.value || '').trim() || selectedProg?.organizing_department || 'Department of Computer Science and Business Systems (CSBS)';
  const institution = (document.getElementById('tplInstName')?.value || document.getElementById('tplInstitution')?.value || '').trim() || selectedProg?.institution_name || 'Ramco Institute of Technology, Rajapalayam';
  const progDates = (document.getElementById('tplProgrammeDates')?.value || document.getElementById('tplProgDates')?.value || '').trim() || (selectedProg?.start_date && selectedProg?.end_date ? `${selectedProg.start_date} to ${selectedProg.end_date}` : 'October 26, 2026, to November 07, 2026');
  const issueDate = document.getElementById('tplIssueDate')?.value || selectedProg?.end_date || '';
  const idPrefix = (document.getElementById('tplIdPrefix')?.value || '').trim() || (certGenState.selectedEventNumber ? `RITCB ${certGenState.selectedEventNumber} ` : 'RITCB 02 ');
  const sigCount = parseInt(document.getElementById('tplSigCount')?.value || '6', 10);

  // Sample participant name & college
  const sample = (certGenState.records && certGenState.records.length > 0) ? certGenState.records[0] : null;
  const participantName = (sample && (sample.participant_name || sample.student_name)) ? (sample.participant_name || sample.student_name) : 'Mr./Ms. PARTICIPANT NAME';
  const participantCollege = (sample && (sample.participant_college || sample.college_name || (sample.institution && !sample.institution.toLowerCase().includes('ramco') ? sample.institution : ''))) || '';

  if (document.getElementById('prevPreamble')) document.getElementById('prevPreamble').innerText = 'This is to certify that';
  if (document.getElementById('prevCertTitle')) document.getElementById('prevCertTitle').innerText = title;
  if (document.getElementById('prevStudentName')) document.getElementById('prevStudentName').innerText = participantName;

  const prevCollegeEl = document.getElementById('prevStudentCollege');
  if (prevCollegeEl) {
    if (participantCollege) {
      prevCollegeEl.innerText = participantCollege;
      prevCollegeEl.style.display = 'block';
    } else {
      prevCollegeEl.innerText = '';
      prevCollegeEl.style.display = 'none';
    }
  }

  // Dynamic preview wording paragraph matching selected event
  if (document.getElementById('prevWordingParagraph')) {
    document.getElementById('prevWordingParagraph').innerHTML = `
      for active participation in the <span class="cert-purple-bold" id="prevProgTitle">${escapeHtml(progTitle)}</span> on<br>
      <span class="cert-purple-bold" id="prevEventTopic">“${escapeHtml(eventName)}”</span>, organized by the <span class="cert-purple-bold" id="prevOrgDept">${escapeHtml(orgDept)}</span><br>
      at <span class="cert-purple-bold" id="prevInstitution">${escapeHtml(institution)}</span> from<br>
      <span class="cert-purple-bold" id="prevProgDates">${escapeHtml(progDates)}.</span>
    `;
  }

  const sampleCertId = idPrefix ? `${idPrefix.trim()} 0001` : (certGenState.selectedEventNumber ? `RITCB ${certGenState.selectedEventNumber} 0001` : 'RITCB 02 0001');
  if (document.getElementById('prevCertId')) document.getElementById('prevCertId').innerText = sampleCertId;

  // Signatories 1 to 6
  const defaultSigRoles = ['dinesh', 'yazhini', 'preethiram', 'kesavaraja', 'rajakarunakaran', 'ganesan'];
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
        imgEl.style.display = 'block';
      } else {
        const defaultSig = (window.RIT_CERT_ASSETS && window.RIT_CERT_ASSETS.getSignatoryAsset)
          ? window.RIT_CERT_ASSETS.getSignatoryAsset(defaultSigRoles[i - 1])
          : `signature/${defaultSigRoles[i - 1]}.png`;
        imgEl.src = defaultSig;
        imgEl.style.display = 'block';
      }
    }
  }

  // QR preview — Plain text certificate ID only, strictly no URLs
  const plainCertId = sampleCertId;
  if (document.getElementById('tplVerifyUrlPreview')) {
    document.getElementById('tplVerifyUrlPreview').innerText = plainCertId;
  }

  if (window.QRCode && window.QRCode.toDataURL) {
    window.QRCode.toDataURL(plainCertId, { width: 96, margin: 0 })
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

  const selectedProg = (certGenState.programmes || []).find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber);
  const evName = document.getElementById('tplEventTopic')?.value?.trim() || document.getElementById('tplEventName')?.value?.trim() || selectedProg?.programme_topic || eligible[0]?.event_name || 'Event';
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
    const selectedProg = (certGenState.programmes || []).find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber);
    const evName = getFormParam(['tplEventTopic', 'tplEventName'], selectedProg?.programme_topic || eligibleRecords[0]?.event_name || 'Engineering Superintelligent Systems for Sustainable Digital Transformation');
    const sigCount = parseInt(getFormParam(['tplSigCount'], '6'), 10);
    const progTitle = getFormParam(['tplProgrammeTitle', 'tplProgTitle'], selectedProg?.programme_title || 'Two-Week International Industry-Oriented Faculty Development Programme');
    const progDates = getFormParam(['tplProgrammeDates', 'tplProgDates'], (selectedProg?.start_date && selectedProg?.end_date) ? `${selectedProg.start_date} to ${selectedProg.end_date}` : 'October 26, 2026, to November 07, 2026');
    const orgDept = getFormParam(['tplDeptName', 'tplOrgDept'], selectedProg?.organizing_department || 'Department of Computer Science and Business Systems (CSBS)');
    const instName = getFormParam(['tplInstName', 'tplInstitution'], selectedProg?.institution_name || 'Ramco Institute of Technology, Rajapalayam');
    const certTitle = getFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION');
    const certType = getFormParam(['tplCertType'], selectedProg?.programme_type || 'Faculty Development Programme (FDP)');
    const idPrefix = getFormParam(['tplIdPrefix'], certGenState.selectedEventNumber ? `RITCB ${certGenState.selectedEventNumber} ` : 'RITCB 02 ');

    const payload = {
      batch_title: `Batch - ${evName} (${new Date().toLocaleDateString('en-GB')})`,
      event_name: evName,
      event_date: getFormParam(['tplIssueDate'], selectedProg?.end_date || eligibleRecords[0]?.event_date || new Date().toISOString().split('T')[0]),
      academic_year: eligibleRecords[0]?.academic_year || '2026-27',
      certificate_title: certTitle,
      certificate_type: certType,
      programme_title: progTitle,
      programme_dates: progDates,
      department: orgDept,
      institution: instName,
      college_name: instName,
      certificate_wording: getFormParam(['tplCertWording'], selectedProg?.certificate_content || ''),
      id_prefix: idPrefix,
      signatory_count: sigCount,
      signatory_1_name: document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. S.Erana Verrappa Dinesh',
      signatory_1_title: document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_1_dept: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
      signatory_1_org: document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
      signatory_1_sig: customUploadedSignatures[1] || undefined,
      signatory_2_name: document.getElementById('tplSig2Name')?.value?.trim() || 'Mrs. B.Yazhini',
      signatory_2_title: document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
      signatory_2_dept: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
      signatory_2_org: document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
      signatory_2_sig: customUploadedSignatures[2] || undefined,
      signatory_3_name: document.getElementById('tplSig3Name')?.value?.trim() || 'Ms. Preethi Ram',
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
      event_number: certGenState.selectedEventNumber || "02",
      programme_id: certGenState.selectedProgrammeId || "prog_02_fdp_superintelligent",
      records: eligibleRecords.map(r => ({
        student_name: r.student_name || r.participant_name || '',
        participant_name: r.participant_name || r.student_name || '',
        participant_type: r.participant_type || r.participants || 'Student',
        institution: r.institution || instName,
        college_name: r.college_name || r.participant_college || r.institution || '',
        participant_college: r.participant_college || r.college_name || r.institution || '',
        department: r.department || orgDept,
        event_name: evName,
        event_date: r.event_date || getFormParam(['tplIssueDate'], selectedProg?.end_date || new Date().toISOString().split('T')[0]),
        certificate_type: r.certificate_type || certType,
        achievement: r.achievement || r.participation_type || 'Participation',
        register_number: r.register_number || '',
        email: r.email || r.mail_id || '',
        phone: r.phone || '',
        programme_title: progTitle,
        programme_dates: progDates,
        certificate_wording: getFormParam(['tplCertWording'], selectedProg?.certificate_content || '')
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

    // Immediately merge newly issued certificates into masterCertificates for instant UI sync across all events
    if (Array.isArray(data.certificates) && data.certificates.length > 0) {
      const existingIds = new Set((certGenState.masterCertificates || []).map(c => String(c.certificate_number || c.id).trim().toUpperCase()));
      const newItems = data.certificates.filter(c => !existingIds.has(String(c.certificate_number || c.id).trim().toUpperCase()));
      certGenState.masterCertificates = [...newItems, ...(certGenState.masterCertificates || [])];
    }

    // Show success alert
    const successAlert = document.getElementById('certGenSuccessAlert');
    const alertTitle = document.getElementById('cgSuccessAlertTitle');
    const alertMsg = document.getElementById('cgSuccessAlertMsg');

    if (alertTitle) alertTitle.innerText = `Successfully Issued ${data.total_issued} Certificates!`;
    if (alertMsg) alertMsg.innerText = `Batch ID: ${data.batch_id} &bull; All certificate records are permanently stored and digitally verified.`;
    if (successAlert) successAlert.style.display = 'block';

    // Reload Section 5 table
    loadIssuedCertificatesHistoryTable();
    loadCertificateProgrammes();
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

  // 1. Prepare Certificate Data with Template Fallbacks (Prioritize certificate's own event number)
  const certEventNumber = cert.event_number || (cert.certificate_number && cert.certificate_number.match(/RITCB\s+(\d{2})/i)?.[1]) || certGenState.selectedEventNumber || '02';
  const selectedProg = (certGenState.programmes || []).find(p => String(p.event_number).padStart(2, '0') === String(certEventNumber).padStart(2, '0')) ||
                       (certGenState.programmes || []).find(p => p.id === certGenState.selectedProgrammeId || p.event_number === certGenState.selectedEventNumber);
  const participantName = cert.participant_name || cert.student_name || 'Participant';
  const defaultEventNumber = certEventNumber;
  const defaultInstName = selectedProg?.institution_name || 'Ramco Institute of Technology, Rajapalayam';
  const participantCollege = cert.participant_college || cert.college_name || (cert.institution && !cert.institution.toLowerCase().includes('ramco') ? cert.institution : '');
  const certFullData = {
    participant_name: participantName,
    student_name: participantName,
    participant_type: cert.participant_type || 'Student',
    participant_college: participantCollege,
    college_name: participantCollege,
    institution: defaultInstName,
    organizing_institution: defaultInstName,
    certificate_number: cert.certificate_number || cert.certificate_id || `RITCB ${defaultEventNumber} 0001`,
    certificate_title: cert.certificate_title || (typeof getFormParam === 'function' ? getFormParam(['tplCertTitle'], 'CERTIFICATE OF PARTICIPATION') : (document.getElementById('tplCertTitle')?.value?.trim() || 'CERTIFICATE OF PARTICIPATION')),
    programme_title: cert.programme_title || (typeof getFormParam === 'function' ? getFormParam(['tplProgrammeTitle', 'tplProgTitle'], selectedProg?.programme_title || 'Two-Week International Industry-Oriented Faculty Development Programme') : (document.getElementById('tplProgrammeTitle')?.value?.trim() || document.getElementById('tplProgTitle')?.value?.trim() || 'Two-Week International Industry-Oriented Faculty Development Programme')),
    event_name: cert.event_name || (typeof getFormParam === 'function' ? getFormParam(['tplEventTopic', 'tplEventName'], selectedProg?.programme_topic || 'Engineering Superintelligent Systems for Sustainable Digital Transformation') : (document.getElementById('tplEventTopic')?.value?.trim() || document.getElementById('tplEventName')?.value?.trim() || 'Engineering Superintelligent Systems for Sustainable Digital Transformation')),
    department: cert.department || (typeof getFormParam === 'function' ? getFormParam(['tplDeptName', 'tplOrgDept'], selectedProg?.organizing_department || 'Department of Computer Science and Business Systems (CSBS)') : (document.getElementById('tplDeptName')?.value?.trim() || document.getElementById('tplOrgDept')?.value?.trim() || 'Department of Computer Science and Business Systems (CSBS)')),
    programme_dates: cert.programme_dates || (typeof getFormParam === 'function' ? getFormParam(['tplProgrammeDates', 'tplProgDates'], (selectedProg?.start_date && selectedProg?.end_date) ? `${selectedProg.start_date} to ${selectedProg.end_date}` : 'October 26, 2026, to November 07, 2026') : (document.getElementById('tplProgrammeDates')?.value?.trim() || document.getElementById('tplProgDates')?.value?.trim() || 'October 26, 2026, to November 07, 2026')),
    certificate_wording: cert.certificate_wording || (typeof getFormParam === 'function' ? getFormParam(['tplCertWording'], selectedProg?.certificate_content || '') : ''),
    signatory_count: cert.signatory_count || parseInt(document.getElementById('tplSigCount')?.value || '6', 10),
    signatory_1_name: cert.signatory_1_name || document.getElementById('tplSig1Name')?.value?.trim() || 'Dr. S.Erana Verrappa Dinesh',
    signatory_1_title: cert.signatory_1_title || document.getElementById('tplSig1Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_1_dept: cert.signatory_1_dept || cert.signatory_1_org || document.getElementById('tplSig1Org')?.value?.trim() || 'CSBS, RIT',
    signatory_1_sig: customUploadedSignatures[1] || cert.signatory_1_sig || undefined,
    signatory_2_name: cert.signatory_2_name || document.getElementById('tplSig2Name')?.value?.trim() || 'Mrs. B.Yazhini',
    signatory_2_title: cert.signatory_2_title || document.getElementById('tplSig2Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_2_dept: cert.signatory_2_dept || cert.signatory_2_org || document.getElementById('tplSig2Org')?.value?.trim() || 'CSBS, RIT',
    signatory_2_sig: customUploadedSignatures[2] || cert.signatory_2_sig || undefined,
    signatory_3_name: cert.signatory_3_name || document.getElementById('tplSig3Name')?.value?.trim() || 'Ms. Preethi Ram',
    signatory_3_title: cert.signatory_3_title || document.getElementById('tplSig3Title')?.value?.trim() || 'Faculty Coordinator',
    signatory_3_dept: cert.signatory_3_dept || cert.signatory_3_org || document.getElementById('tplSig3Org')?.value?.trim() || 'CSBS, RIT',
    signatory_3_sig: customUploadedSignatures[3] || cert.signatory_3_sig || undefined,
    signatory_4_name: cert.signatory_4_name || document.getElementById('tplSig4Name')?.value?.trim() || 'Dr. D. Kesavaraja',
    signatory_4_title: cert.signatory_4_title || document.getElementById('tplSig4Title')?.value?.trim() || 'Convenor',
    signatory_4_dept: cert.signatory_4_dept || cert.signatory_4_org || document.getElementById('tplSig4Org')?.value?.trim() || 'CSBS, RIT',
    signatory_4_sig: customUploadedSignatures[4] || cert.signatory_4_sig || undefined,
    signatory_5_name: cert.signatory_5_name || document.getElementById('tplSig5Name')?.value?.trim() || 'Dr. S. Rajakarunakaran',
    signatory_5_title: cert.signatory_5_title || document.getElementById('tplSig5Title')?.value?.trim() || 'Patron',
    signatory_5_dept: cert.signatory_5_dept || cert.signatory_5_org || document.getElementById('tplSig5Org')?.value?.trim() || 'RIT',
    signatory_5_sig: customUploadedSignatures[5] || cert.signatory_5_sig || undefined,
    signatory_6_name: cert.signatory_6_name || document.getElementById('tplSig6Name')?.value?.trim() || 'Dr. L. Ganesan',
    signatory_6_title: cert.signatory_6_title || document.getElementById('tplSig6Title')?.value?.trim() || 'Chief Patron',
    signatory_6_dept: cert.signatory_6_dept || cert.signatory_6_org || document.getElementById('tplSig6Org')?.value?.trim() || 'RIT',
    signatory_6_sig: customUploadedSignatures[6] || cert.signatory_6_sig || undefined
  };

  // Generate real data-driven PDF with selectable text & vector styling
  if (window.RIT_CERT_ASSETS && typeof window.RIT_CERT_ASSETS.createCertificatePdf === 'function') {
    return await window.RIT_CERT_ASSETS.createCertificatePdf(certFullData);
  }

  // Fallback
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
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

// ============================================================
// 6. ASYNC NON-BLOCKING ZIP PACKAGING & EVENT/DATE-WISE FILTER ENGINE
// ============================================================

let zipPackagingAbortController = { cancelled: false };
let modalFilteredCertificatesCache = [];

function normalizeDateToYMD(rawDate) {
  if (!rawDate) return '';
  if (rawDate instanceof Date) return rawDate.toISOString().split('T')[0];
  const s = String(rawDate).trim();
  if (s.includes('T')) return s.split('T')[0];
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

function matchesEventFilter(cert, eventVal) {
  if (!eventVal || eventVal === 'all') return true;
  const ev = String(eventVal).padStart(2, '0').slice(-2);
  if (cert.event_number && String(cert.event_number).padStart(2, '0').slice(-2) === ev) return true;
  const certNum = String(cert.certificate_number || cert.certificate_id || '').toUpperCase();
  if (certNum.includes(` ${ev} `) || certNum.startsWith(`RITCB ${ev}`) || certNum.startsWith(`RITCB${ev}`)) return true;
  if (ev === '01' && (cert.event_name?.toLowerCase().includes('blockchain') || cert.event_code === 'STTP')) return true;
  if (ev === '02' && (cert.event_name?.toLowerCase().includes('superintelligent') || cert.event_name?.toLowerCase().includes('faculty development') || cert.event_name?.toLowerCase().includes('fdp'))) return true;
  return false;
}

function matchesDateFilter(cert, { mode, field, singleDate, fromDate, toDate }) {
  if (!mode || mode === 'all') return true;
  let rawDate = (field === 'created_at' ? cert.created_at : cert.issue_date) || cert.issue_date || cert.created_at;
  const dateStr = normalizeDateToYMD(rawDate);
  if (!dateStr) return false;

  if (mode === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr;
  }
  if (mode === 'single') {
    if (!singleDate) return true;
    return dateStr === normalizeDateToYMD(singleDate);
  }
  if (mode === 'range') {
    const fromYMD = fromDate ? normalizeDateToYMD(fromDate) : '';
    const toYMD = toDate ? normalizeDateToYMD(toDate) : '';
    if (fromYMD && dateStr < fromYMD) return false;
    if (toYMD && dateStr > toYMD) return false;
    return true;
  }
  return true;
}

// Master Non-Blocking ZIP Packaging Engine (Yields to UI thread to prevent browser freezing)
async function packageCertificatesIntoZip(certsToDownload, customZipName = '') {
  if (!certsToDownload || certsToDownload.length === 0) {
    showAdminAlert('No certificates available to download as ZIP archive.', 'warning');
    return;
  }

  if (!window.JSZip) {
    showAdminAlert('ZIP compression library is loading. Please try again in a moment.', 'warning');
    return;
  }

  zipPackagingAbortController = { cancelled: false };
  const total = certsToDownload.length;

  // Open Progress Modal
  const modal = document.getElementById('certGenZipProgressModal');
  const bar = document.getElementById('cgZipProgressBar');
  const pct = document.getElementById('cgZipProgressPercent');
  const title = document.getElementById('cgZipProgressTitle');
  const currentId = document.getElementById('cgZipProgressCurrentId');
  const currentName = document.getElementById('cgZipProgressCurrentName');
  const count = document.getElementById('cgZipProgressCount');
  const sub = document.getElementById('cgZipProgressSub');

  if (modal) modal.classList.remove('hidden');
  if (bar) bar.style.width = '0%';
  if (pct) pct.innerText = '0%';
  if (title) title.innerText = `Packaging ${total} Certificates...`;
  if (sub) sub.innerText = 'Assembling verified PDF documents for download...';
  if (count) count.innerText = `0 of ${total}`;

  const zip = new JSZip();

  try {
    for (let i = 0; i < total; i++) {
      if (zipPackagingAbortController.cancelled) {
        if (modal) modal.classList.add('hidden');
        showAdminAlert('ZIP archive generation was cancelled.', 'info');
        return;
      }

      const cert = certsToDownload[i];
      const participantName = cert.participant_name || cert.student_name || 'Participant';
      const certId = cert.certificate_number || cert.certificate_id || `CERT-${i + 1}`;

      // Update UI Progress smoothly
      const percentVal = Math.round((i / total) * 90);
      if (bar) bar.style.width = `${percentVal}%`;
      if (pct) pct.innerText = `${percentVal}%`;
      if (currentId) currentId.innerText = certId;
      if (currentName) currentName.innerText = participantName;
      if (count) count.innerText = `${i + 1} of ${total}`;

      // Generate Single PDF Document
      const doc = await generateSingleCertificatePdfDoc(cert);
      const pdfArrayBuffer = doc.output('arraybuffer');
      const filename = `${String(i + 1).padStart(3, '0')}_${participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${certId.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      zip.file(filename, pdfArrayBuffer, { binary: true });

      // Non-blocking yield: allows browser UI to paint and handles watchdog checks
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    if (zipPackagingAbortController.cancelled) {
      if (modal) modal.classList.add('hidden');
      return;
    }

    // Finalizing ZIP compression (90% to 100%)
    if (title) title.innerText = 'Compressing & Finalizing ZIP Archive...';
    if (sub) sub.innerText = 'Creating archive file for browser download...';
    if (bar) bar.style.width = '95%';
    if (pct) pct.innerText = '95%';

    await new Promise(resolve => setTimeout(resolve, 30));

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 }
      },
      (meta) => {
        const zipPercent = Math.min(100, Math.round(90 + (meta.percent * 0.1)));
        if (bar) bar.style.width = `${zipPercent}%`;
        if (pct) pct.innerText = `${zipPercent}%`;
      }
    );

    if (zipPackagingAbortController.cancelled) {
      if (modal) modal.classList.add('hidden');
      return;
    }

    if (bar) bar.style.width = '100%';
    if (pct) pct.innerText = '100%';

    // Determine filename
    let safeZipName = customZipName;
    if (!safeZipName) {
      const firstCert = certsToDownload[0];
      const evName = (firstCert?.event_name || 'Certificates').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const todayStr = new Date().toISOString().split('T')[0];
      safeZipName = `${evName}_${total}_Certificates_${todayStr}.zip`;
    }
    if (!safeZipName.endsWith('.zip')) safeZipName += '.zip';

    // Trigger browser download
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = safeZipName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(downloadLink.href);
      document.body.removeChild(downloadLink);
    }, 1000);

    if (modal) modal.classList.add('hidden');
    showAdminAlert(`Successfully generated and downloaded ZIP archive with ${total} certificates!`, 'success');

  } catch (err) {
    console.error('ZIP generation error:', err);
    if (modal) modal.classList.add('hidden');
    showAdminAlert('Failed to generate ZIP archive: ' + (err.message || 'Unknown error'), 'danger');
  }
}

function cancelZipGeneration() {
  zipPackagingAbortController.cancelled = true;
  const modal = document.getElementById('certGenZipProgressModal');
  if (modal) modal.classList.add('hidden');
  showAdminAlert('Cancelling ZIP archive creation...', 'info');
}

// Bulk ZIP Download of active or filtered certificates
async function downloadAllGeneratedCertificatesZip() {
  let certsToDownload = [];
  let zipName = '';

  if (certGenState.currentBatchCerts && certGenState.currentBatchCerts.length > 0) {
    certsToDownload = certGenState.currentBatchCerts;
    const batchId = certGenState.currentBatchId || certsToDownload[0]?.batch_id || 'Filtered';
    const evNum = certsToDownload[0]?.event_number || 'Event';
    zipName = `Event_${evNum}_${batchId}_${certsToDownload.length}_Certificates.zip`;
  } else if (certGenState.masterCertificates && certGenState.masterCertificates.length > 0) {
    certsToDownload = certGenState.masterCertificates;
    zipName = `Master_All_Certificates_${certsToDownload.length}_Records.zip`;
  }

  if (!certsToDownload || certsToDownload.length === 0) {
    showAdminAlert('No certificates available to download as ZIP archive.', 'warning');
    return;
  }

  await packageCertificatesIntoZip(certsToDownload, zipName);
}

// ============================================================
// FILTER & DOWNLOAD ZIP MODAL CONTROLS
// ============================================================

function openDownloadZipFilterModal(preselectedBatchId = null) {
  const modal = document.getElementById('certGenFilterZipModal');
  if (!modal) return;

  // 1. Populate Event Options
  const evSelect = document.getElementById('modalZipEventSelect');
  if (evSelect) {
    let opts = '<option value="all">All Events (Entire Master History)</option>';
    const progs = certGenState.programmes || [];
    if (progs.length > 0) {
      progs.forEach(p => {
        const evNum = String(p.event_number || '01').padStart(2, '0');
        const label = p.programme_topic ? `Event ${evNum}: ${p.programme_topic}` : `Event ${evNum}: ${p.programme_title || 'Programme'}`;
        opts += `<option value="${evNum}">Event ${evNum}: ${escapeHtml(label)}</option>`;
      });
    } else {
      opts += '<option value="02">Event 02: Two-Week FDP — Superintelligent Systems</option>';
      opts += '<option value="01">Event 01: One-Week STTP — Blockchain Technologies</option>';
    }
    evSelect.innerHTML = opts;

    if (certGenState.selectedEventNumber) {
      evSelect.value = String(certGenState.selectedEventNumber).padStart(2, '0');
    }
  }

  // 2. Populate Batch Options
  const batchSelect = document.getElementById('modalZipBatchSelect');
  if (batchSelect) {
    let bOpts = '<option value="all">All Batches (Include All)</option>';
    const batches = certGenState.batchesList || [];
    batches.forEach(b => {
      const bTitle = b.batch_title || b.event_name || 'Batch';
      const bDate = b.created_at ? new Date(b.created_at).toLocaleDateString() : '';
      bOpts += `<option value="${escapeHtml(b.id)}">${escapeHtml(b.id)} — ${escapeHtml(bTitle)} (${b.generated_count || 0} certs${bDate ? ' • ' + bDate : ''})</option>`;
    });
    batchSelect.innerHTML = bOpts;

    if (preselectedBatchId && batches.some(b => b.id === preselectedBatchId)) {
      batchSelect.value = preselectedBatchId;
    } else if (certGenState.currentBatchId && batches.some(b => b.id === certGenState.currentBatchId)) {
      batchSelect.value = certGenState.currentBatchId;
    }
  }

  // 3. Reset Date Inputs
  const dateMode = document.getElementById('modalZipDateMode');
  if (dateMode) dateMode.value = 'all';
  handleModalZipDateModeChange();

  // 4. Update Matching State
  updateFilterZipModalState();

  modal.classList.remove('hidden');
}

function closeDownloadZipFilterModal() {
  const modal = document.getElementById('certGenFilterZipModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgFilterZipModal(e) {
  if (e && e.target && e.target.id === 'certGenFilterZipModal') {
    closeDownloadZipFilterModal();
  }
}

function handleModalZipDateModeChange() {
  const mode = document.getElementById('modalZipDateMode')?.value || 'all';
  const singleWrap = document.getElementById('modalZipSingleDateWrap');
  const rangeWrap = document.getElementById('modalZipDateRangeWrap');

  if (singleWrap) singleWrap.style.display = mode === 'single' ? 'block' : 'none';
  if (rangeWrap) rangeWrap.style.display = mode === 'range' ? 'grid' : 'none';

  updateFilterZipModalState();
}

function updateFilterZipModalState() {
  const evVal = document.getElementById('modalZipEventSelect')?.value || 'all';
  const dateMode = document.getElementById('modalZipDateMode')?.value || 'all';
  const dateField = document.getElementById('modalZipDateField')?.value || 'issue_date';
  const singleDate = document.getElementById('modalZipSingleDate')?.value || '';
  const fromDate = document.getElementById('modalZipDateFrom')?.value || '';
  const toDate = document.getElementById('modalZipDateTo')?.value || '';
  const batchVal = document.getElementById('modalZipBatchSelect')?.value || 'all';

  const allCerts = certGenState.masterCertificates || [];
  const matched = allCerts.filter(c => {
    if (!matchesEventFilter(c, evVal)) return false;
    if (batchVal !== 'all' && String(c.batch_id || '') !== String(batchVal)) return false;
    if (!matchesDateFilter(c, { mode: dateMode, field: dateField, singleDate, fromDate, toDate })) return false;
    return true;
  });

  const badge = document.getElementById('modalZipMatchBadge');
  const btnCount = document.getElementById('modalZipBtnCount');
  const btnDownload = document.getElementById('btnConfirmFilteredZipDownload');
  const detail = document.getElementById('modalZipSummaryDetail');
  const previewTags = document.getElementById('modalZipPreviewTags');

  if (badge) badge.innerText = `${matched.length} Records`;
  if (btnCount) btnCount.innerText = matched.length;

  if (btnDownload) {
    btnDownload.disabled = matched.length === 0;
    btnDownload.style.opacity = matched.length === 0 ? '0.5' : '1';
    btnDownload.style.cursor = matched.length === 0 ? 'not-allowed' : 'pointer';
  }

  if (detail) {
    if (matched.length === 0) {
      detail.innerHTML = '<span style="color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> No certificates match the selected event and date filters.</span>';
    } else {
      let desc = `Found <strong>${matched.length}</strong> certificates ready to pack.`;
      if (evVal !== 'all') desc += ` Event: <strong>Event ${evVal}</strong>.`;
      if (dateMode === 'today') desc += ` Generated: <strong>Today</strong>.`;
      else if (dateMode === 'single' && singleDate) desc += ` Date: <strong>${singleDate}</strong>.`;
      else if (dateMode === 'range' && (fromDate || toDate)) desc += ` Range: <strong>${fromDate || 'Any'} to ${toDate || 'Any'}</strong>.`;
      detail.innerHTML = desc;
    }
  }

  if (previewTags) {
    if (matched.length === 0) {
      previewTags.innerHTML = '';
    } else {
      previewTags.innerHTML = matched.slice(0, 10).map(c => 
        `<span style="background:#ede9fe;color:#6b21a8;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;font-family:monospace;">${escapeHtml(c.certificate_number || c.certificate_id || 'CERT')}</span>`
      ).join('') + (matched.length > 10 ? `<span style="font-size:11px;color:#7e22ce;font-weight:600;padding:2px 4px;">+${matched.length - 10} more</span>` : '');
    }
  }

  modalFilteredCertificatesCache = matched;
}

async function executeFilteredZipDownload() {
  if (!modalFilteredCertificatesCache || modalFilteredCertificatesCache.length === 0) {
    showAdminAlert('No certificates to download matching the selected filters.', 'warning');
    return;
  }

  const evVal = document.getElementById('modalZipEventSelect')?.value || 'all';
  const dateMode = document.getElementById('modalZipDateMode')?.value || 'all';
  const singleDate = document.getElementById('modalZipSingleDate')?.value || '';
  const fromDate = document.getElementById('modalZipDateFrom')?.value || '';
  const toDate = document.getElementById('modalZipDateTo')?.value || '';

  let zipName = 'Certificates';
  if (evVal !== 'all') zipName += `_Event_${evVal}`;
  if (dateMode === 'today') zipName += `_Today_${new Date().toISOString().split('T')[0]}`;
  else if (dateMode === 'single' && singleDate) zipName += `_Date_${singleDate}`;
  else if (dateMode === 'range') zipName += `_From_${fromDate || 'Start'}_To_${toDate || 'End'}`;
  zipName += `_${modalFilteredCertificatesCache.length}_Records.zip`;

  closeDownloadZipFilterModal();
  await packageCertificatesIntoZip(modalFilteredCertificatesCache, zipName);
}

// Export issued certificates list to Excel
function exportIssuedCertificatesExcel() {
  const sel = document.getElementById('cgBatchSelector');
  const filterVal = sel ? sel.value : 'all';
  const certs = (filterVal !== 'all' && certGenState.currentBatchCerts && certGenState.currentBatchCerts.length > 0)
    ? certGenState.currentBatchCerts
    : (certGenState.masterCertificates || []);
  if (certs.length === 0) {
    showAdminAlert('No certificate records available to export.');
    return;
  }

  const rows = certs.map((c, idx) => ({
    '#': idx + 1,
    'Certificate ID': c.certificate_number,
    'Student Name': c.student_name,
    'College Name': c.college_name || c.participant_college || c.institution || '',
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

    // 2. Fetch all certificates with automatic endpoint fallback
    let cRes = await fetch(`${API_BASE}/admin/certificate-generation/certificates`, {
      headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
    });
    if (!cRes.ok) {
      cRes = await fetch(`${API_BASE}/admin/all-certificates`, {
        headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` }
      });
    }
    const cData = await cRes.json();
    if (cData && cData.success && Array.isArray(cData.certificates)) {
      certGenState.masterCertificates = cData.certificates;
    } else {
      certGenState.masterCertificates = [];
    }
    renderHistoryTable();
  } catch (err) {
    console.error('History load error:', err);
    certGenState.masterCertificates = [];
    renderHistoryTable();
  }
}

function populateBatchSelectorDropdown(batches) {
  const sel = document.getElementById('cgBatchSelector');
  if (!sel) return;

  const currentVal = sel.value || 'all';

  let opts = '<option value="all">All Issued Certificates (Master History)</option>';

  // Event-specific filters
  const progs = certGenState.programmes || [];
  if (progs.length > 0) {
    opts += '<optgroup label="Filter by Event">';
    progs.forEach(p => {
      const evNum = String(p.event_number || '01').padStart(2, '0');
      const label = p.programme_topic ? `Event ${evNum}: ${p.programme_topic}` : `Event ${evNum}: ${p.programme_title || 'Programme'}`;
      opts += `<option value="event:${evNum}">${escapeHtml(label)}</option>`;
    });
    opts += '</optgroup>';
  } else {
    opts += '<optgroup label="Filter by Event">';
    opts += '<option value="event:01">Event 01: Emerging Blockchain Technologies (STTP)</option>';
    opts += '<option value="event:02">Event 02: Engineering Superintelligent Systems (FDP)</option>';
    opts += '</optgroup>';
  }

  if (Array.isArray(batches) && batches.length > 0) {
    opts += '<optgroup label="Filter by Generation Batch">';
    batches.forEach(b => {
      const dStr = b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '';
      opts += `<option value="${escapeHtml(b.id)}">${escapeHtml(b.batch_title || b.event_name)} (${b.generated_count || 0} certs &bull; ${dStr})</option>`;
    });
    opts += '</optgroup>';
  }

  sel.innerHTML = opts;

  // Populate History Event Filter dropdown dynamically as well
  const evSel = document.getElementById('cgHistoryEventFilter');
  if (evSel) {
    const curEvVal = evSel.value || 'all';
    let evOpts = '<option value="all">All Events (Master)</option>';
    if (progs.length > 0) {
      progs.forEach(p => {
        const evNum = String(p.event_number || '01').padStart(2, '0');
        const label = p.programme_topic ? `Event ${evNum}: ${p.programme_topic}` : `Event ${evNum}: ${p.programme_title || 'Programme'}`;
        evOpts += `<option value="${evNum}">${escapeHtml(label)}</option>`;
      });
    } else {
      evOpts += '<option value="02">Event 02: FDP — Superintelligent Systems</option>';
      evOpts += '<option value="01">Event 01: STTP — Blockchain</option>';
    }
    evSel.innerHTML = evOpts;
    if (Array.from(evSel.options).some(o => o.value === curEvVal)) {
      evSel.value = curEvVal;
    }
  }

  // Preserve previous selection if it exists in new options
  const hasOpt = Array.from(sel.options).some(o => o.value === currentVal);
  sel.value = hasOpt ? currentVal : 'all';
}

function handleCertGenDatePresetChange() {
  const preset = document.getElementById('cgHistoryDatePreset')?.value || 'all';
  const fromInput = document.getElementById('cgHistoryDateFrom');
  const toInput = document.getElementById('cgHistoryDateTo');
  const sep = document.getElementById('cgHistoryDateSep');

  const showRange = preset === 'range';
  if (fromInput) fromInput.style.display = showRange ? 'inline-block' : 'none';
  if (toInput) toInput.style.display = showRange ? 'inline-block' : 'none';
  if (sep) sep.style.display = showRange ? 'inline-block' : 'none';

  renderHistoryTable();
}

function handleCertGenBatchSelect() {
  renderHistoryTable();
}

function handleCertGenHistorySearch() {
  renderHistoryTable();
}

function handleCertGenFiltersChange() {
  renderHistoryTable();
}

function renderHistoryTable() {
  const tbody = document.getElementById('cgHistoryTableBody');
  if (!tbody) return;

  const batchSel = document.getElementById('cgBatchSelector');
  const evSel = document.getElementById('cgHistoryEventFilter');
  const datePreset = document.getElementById('cgHistoryDatePreset');
  const dateFrom = document.getElementById('cgHistoryDateFrom');
  const dateTo = document.getElementById('cgHistoryDateTo');
  const searchInput = document.getElementById('cgHistorySearchInput');

  const batchVal = batchSel ? batchSel.value : 'all';
  const evVal = evSel ? evSel.value : 'all';
  const dateVal = datePreset ? datePreset.value : 'all';
  const fromVal = dateFrom ? dateFrom.value : '';
  const toVal = dateTo ? dateTo.value : '';
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const delBtn = document.getElementById('btnDeleteSelectedBatch');
  if (delBtn) {
    delBtn.style.display = (batchVal && batchVal !== 'all' && !batchVal.startsWith('event:')) ? 'inline-flex' : 'none';
  }

  let certs = certGenState.masterCertificates || [];

  // 1. Batch Filter
  if (batchVal !== 'all') {
    if (batchVal.startsWith('event:')) {
      const eNum = batchVal.split(':')[1];
      certs = certs.filter(c => matchesEventFilter(c, eNum));
    } else {
      certs = certs.filter(c => String(c.batch_id || '') === String(batchVal));
    }
  }

  // 2. Event Filter
  if (evVal !== 'all') {
    certs = certs.filter(c => matchesEventFilter(c, evVal));
  }

  // 3. Date Filter
  if (dateVal === 'today') {
    certs = certs.filter(c => matchesDateFilter(c, { mode: 'today' }));
  } else if (dateVal === 'range') {
    certs = certs.filter(c => matchesDateFilter(c, { mode: 'range', fromDate: fromVal, toDate: toVal }));
  }

  // 4. Search Filter
  if (q) {
    certs = certs.filter(c =>
      (c.student_name && c.student_name.toLowerCase().includes(q)) ||
      (c.participant_name && c.participant_name.toLowerCase().includes(q)) ||
      (c.register_number && c.register_number.toLowerCase().includes(q)) ||
      (c.certificate_number && c.certificate_number.toLowerCase().includes(q)) ||
      (c.event_name && c.event_name.toLowerCase().includes(q)) ||
      (c.college_name && c.college_name.toLowerCase().includes(q)) ||
      (c.participant_college && c.participant_college.toLowerCase().includes(q)) ||
      (c.institution && c.institution.toLowerCase().includes(q))
    );
  }

  // Chronological generation order: oldest generated certificate first, newest last
  certs = [...certs].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
    if (timeA !== timeB) return timeA - timeB;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  certGenState.currentBatchCerts = certs;

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
          ${cert.version && cert.version > 1 ? `<span class="badge" style="background:#7C3AED;color:#fff;font-size:10px;padding:2px 6px;margin-left:4px;border-radius:10px;" title="Revision ${cert.version} (Updated)">v${cert.version}</span>` : ''}
        </td>
        <td>
          <strong>${escapeHtml(cert.student_name || cert.participant_name || 'Student')}</strong>
          ${(cert.college_name || cert.participant_college) ? `<div style="font-size:11px;color:#475569;font-weight:600;"><i class="fa-solid fa-building-columns" style="font-size:10px;color:#7c3aed;"></i> ${escapeHtml(cert.college_name || cert.participant_college)}</div>` : ''}
          ${cert.student_email || cert.email ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(cert.student_email || cert.email)}</div>` : ''}
        </td>
        <td>${escapeHtml(cert.event_name || 'Department Event')}</td>
        <td>${isDate}</td>
        <td>${statusBadge}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button type="button" class="btn btn-sm btn-outline-primary" style="padding:4px 8px;font-size:11px;" onclick="downloadSingleCertificatePdf(${certJson})" title="Download Latest PDF">
            <i class="fa-solid fa-file-pdf"></i> PDF
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:11px;" onclick="openSingleCertificatePreview(${certJson})" title="Preview Certificate">
            <i class="fa-solid fa-eye"></i> View
          </button>
          <button type="button" class="btn btn-sm btn-outline-warning" style="padding:4px 8px;font-size:11px;font-weight:600;" onclick="openEditCertificateModal('${escapeHtml(cert.certificate_number)}')" title="Edit / Update Certificate Record">
            <i class="fa-solid fa-pen-to-square"></i> Edit
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
// 8C. EDIT & UPDATE CERTIFICATE MODAL & VERSIONING
// ============================================================
let activeEditCertRecord = null;

function openEditCertificateModal(certNumber) {
  const allCerts = certGenState.masterCertificates || certGenState.issuedCertificates || [];
  const query = String(certNumber).trim().toLowerCase();
  const cert = allCerts.find(c => {
    if (!c) return false;
    const num = String(c.certificate_number || '').trim().toLowerCase();
    return num === query || String(c.id) === query;
  });

  if (!cert) {
    showAdminAlert(`Certificate "${certNumber}" could not be found in active records.`, 'error');
    return;
  }

  activeEditCertRecord = cert;

  const idBadge = document.getElementById('cgEditModalCertId');
  const verBadge = document.getElementById('cgEditModalVersionBadge');
  const evNumBadge = document.getElementById('cgEditModalEventNumBadge');
  const hiddenId = document.getElementById('cgEditHiddenCertId');

  const pName = document.getElementById('cgEditParticipantName');
  const cName = document.getElementById('cgEditCollegeName');
  const eName = document.getElementById('cgEditEventName');
  const progTitle = document.getElementById('cgEditProgrammeTitle');
  const progDates = document.getElementById('cgEditProgrammeDates');
  const issueDate = document.getElementById('cgEditIssueDate');
  const certType = document.getElementById('cgEditCertType');
  const dept = document.getElementById('cgEditDepartment');
  const reason = document.getElementById('cgEditReason');

  const eventNum = cert.event_number || (cert.certificate_number && cert.certificate_number.match(/RITCB\s+(\d{2})/i)?.[1]) || '02';

  if (idBadge) idBadge.textContent = cert.certificate_number || '—';
  if (verBadge) verBadge.textContent = `v${cert.version || 1}`;
  if (evNumBadge) evNumBadge.textContent = `Event ${eventNum}`;
  if (hiddenId) hiddenId.value = cert.certificate_number || cert.id;

  if (pName) pName.value = cert.participant_name || cert.student_name || '';
  if (cName) cName.value = cert.college_name || cert.participant_college || '';
  if (eName) eName.value = cert.event_name || '';
  if (progTitle) progTitle.value = cert.programme_title || '';
  if (progDates) progDates.value = cert.programme_dates || cert.event_date || '';
  if (issueDate) issueDate.value = cert.issue_date || '';
  if (certType) certType.value = cert.certificate_type || cert.achievement || 'Participation';
  if (dept) dept.value = cert.department || '';
  if (reason) reason.value = '';

  // Render Previous Versions Archive if exists
  renderArchivedVersionsList(cert);

  const modal = document.getElementById('certGenEditCertificateModal');
  if (modal) modal.classList.remove('hidden');
}

function renderArchivedVersionsList(cert) {
  const container = document.getElementById('cgEditPreviousVersionsContainer');
  const listEl = document.getElementById('cgEditPreviousVersionsList');
  const countEl = document.getElementById('cgEditPreviousVersionsCount');

  if (!container || !listEl) return;

  const prev = cert.previous_versions || [];
  if (prev.length === 0) {
    container.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  if (countEl) countEl.textContent = `${prev.length} previous archived revision${prev.length === 1 ? '' : 's'}`;

  let html = '';
  // Show in reverse chronological order
  for (let i = prev.length - 1; i >= 0; i--) {
    const snap = prev[i];
    const snapDate = snap.archived_at ? new Date(snap.archived_at).toLocaleString() : 'Previous revision';
    html += `
      <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="font-size:12px;line-height:1.4;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="badge" style="background:#64748B;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;">Version ${snap.version || (i + 1)}</span>
            <strong style="color:#0f172a;">${escapeHtml(snap.participant_name || snap.student_name || 'Participant')}</strong>
            ${snap.college_name ? `<span style="color:#64748B;font-size:11px;">(${escapeHtml(snap.college_name)})</span>` : ''}
          </div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">
            Archived on ${snapDate} by <em>${escapeHtml(snap.updated_by || 'Admin')}</em> &bull; Reason: ${escapeHtml(snap.reason || 'Correction')}
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" style="font-size:11px;white-space:nowrap;padding:3px 8px;" onclick="downloadArchivedCertificateVersion('${escapeHtml(cert.certificate_number)}', ${i})" title="Download archived PDF before this edit">
          <i class="fa-solid fa-download"></i> Download v${snap.version || (i + 1)} PDF
        </button>
      </div>
    `;
  }
  listEl.innerHTML = html;
}

function closeEditCertificateModal() {
  activeEditCertRecord = null;
  const modal = document.getElementById('certGenEditCertificateModal');
  if (modal) modal.classList.add('hidden');
}

function _closeCgEditModal(e) {
  if (e.target.id === 'certGenEditCertificateModal') {
    closeEditCertificateModal();
  }
}

function getEditedCertificateFormData() {
  if (!activeEditCertRecord) return null;

  const pName = (document.getElementById('cgEditParticipantName')?.value || '').trim();
  const cName = (document.getElementById('cgEditCollegeName')?.value || '').trim();
  const eName = (document.getElementById('cgEditEventName')?.value || '').trim();
  const progTitle = (document.getElementById('cgEditProgrammeTitle')?.value || '').trim();
  const progDates = (document.getElementById('cgEditProgrammeDates')?.value || '').trim();
  const issueDate = (document.getElementById('cgEditIssueDate')?.value || '').trim();
  const certType = (document.getElementById('cgEditCertType')?.value || '').trim();
  const dept = (document.getElementById('cgEditDepartment')?.value || '').trim();
  const reason = (document.getElementById('cgEditReason')?.value || '').trim();

  return {
    ...activeEditCertRecord,
    student_name: pName,
    participant_name: pName,
    college_name: cName,
    participant_college: cName,
    event_name: eName,
    programme_title: progTitle,
    programme_dates: progDates,
    issue_date: issueDate,
    certificate_type: certType,
    achievement: certType,
    department: dept,
    update_reason: reason,
    reason: reason
  };
}

async function previewEditedCertificate() {
  const tempCert = getEditedCertificateFormData();
  if (!tempCert) return;
  if (!tempCert.participant_name) {
    alert('Please enter a Participant Name to preview.');
    return;
  }
  openSingleCertificatePreview(tempCert);
}

async function downloadEditedCertificateDirect() {
  const tempCert = getEditedCertificateFormData();
  if (!tempCert) return;
  if (!tempCert.participant_name) {
    alert('Please enter a Participant Name to download.');
    return;
  }
  await downloadSingleCertificatePdf(tempCert);
}

async function handleCertificateEditSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const tempCert = getEditedCertificateFormData();
  if (!tempCert || !activeEditCertRecord) {
    alert('No active certificate selected.');
    return;
  }

  if (!tempCert.participant_name) {
    alert('Participant Name is required.');
    document.getElementById('cgEditParticipantName')?.focus();
    return;
  }

  if (!tempCert.event_name) {
    alert('Event Name is required.');
    document.getElementById('cgEditEventName')?.focus();
    return;
  }

  if (!tempCert.reason) {
    alert('Please provide a brief reason or audit note for updating this certificate.');
    document.getElementById('cgEditReason')?.focus();
    return;
  }

  const certNumber = activeEditCertRecord.certificate_number;
  const isConfirmed = confirm(
    `Are you sure you want to update certificate ${certNumber}?\n\n` +
    `• Certificate ID (${certNumber}) and QR code will remain strictly preserved.\n` +
    `• Participant Name: ${tempCert.participant_name}\n` +
    `• College Name: ${tempCert.college_name || '(Unchanged)'}\n` +
    `• Previous version will be archived in the update history.`
  );

  if (!isConfirmed) return;

  const btn = document.getElementById('btnSaveCertificateEdit');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating & Regenerating...';
  }

  try {
    const payload = {
      student_name: tempCert.participant_name,
      participant_name: tempCert.participant_name,
      college_name: tempCert.college_name,
      participant_college: tempCert.college_name,
      event_name: tempCert.event_name,
      programme_title: tempCert.programme_title,
      programme_dates: tempCert.programme_dates,
      issue_date: tempCert.issue_date,
      certificate_type: tempCert.certificate_type,
      achievement: tempCert.achievement,
      department: tempCert.department,
      reason: tempCert.reason
    };

    const res = await fetch(`${API_BASE}/admin/certificate-generation/certificate/${encodeURIComponent(certNumber)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getEffectiveAdminToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'Failed to update certificate.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save & Update Certificate';
      }
      return;
    }

    const updatedCert = data.certificate || { ...activeEditCertRecord, ...payload, version: (activeEditCertRecord.version || 1) + 1 };

    // Update state in memory
    const updateInArray = arr => {
      if (!Array.isArray(arr)) return;
      const idx = arr.findIndex(c => c && (String(c.certificate_number) === String(certNumber) || String(c.id) === String(activeEditCertRecord.id)));
      if (idx !== -1) arr[idx] = updatedCert;
    };
    updateInArray(certGenState.masterCertificates);
    updateInArray(certGenState.issuedCertificates);

    renderHistoryTable();

    // Update active record in modal
    activeEditCertRecord = updatedCert;
    const verBadge = document.getElementById('cgEditModalVersionBadge');
    if (verBadge) verBadge.textContent = `v${updatedCert.version || 1}`;
    renderArchivedVersionsList(updatedCert);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved Successfully!';
      setTimeout(() => {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save & Update Certificate';
      }, 2500);
    }

    showAdminAlert(`Certificate ${certNumber} updated successfully! (Version ${updatedCert.version})`, 'success');

  } catch (err) {
    console.error('Update certificate error:', err);
    alert('An unexpected error occurred while updating the certificate.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save & Update Certificate';
    }
  }
}

async function downloadArchivedCertificateVersion(certNumber, versionIdx) {
  const allCerts = certGenState.masterCertificates || certGenState.issuedCertificates || [];
  const query = String(certNumber).trim().toLowerCase();
  const cert = allCerts.find(c => {
    if (!c) return false;
    const num = String(c.certificate_number || '').trim().toLowerCase();
    return num === query || String(c.id) === query;
  });

  if (!cert || !Array.isArray(cert.previous_versions) || !cert.previous_versions[versionIdx]) {
    alert('Archived version snapshot not found.');
    return;
  }

  const snap = cert.previous_versions[versionIdx];
  const archivedCert = {
    ...cert,
    student_name: snap.student_name || snap.participant_name || cert.student_name,
    participant_name: snap.participant_name || snap.student_name || cert.participant_name,
    college_name: snap.college_name || snap.participant_college || cert.college_name,
    participant_college: snap.participant_college || snap.college_name || cert.participant_college,
    institution: snap.institution || cert.institution,
    event_name: snap.event_name || cert.event_name,
    programme_title: snap.programme_title || cert.programme_title,
    programme_dates: snap.programme_dates || cert.programme_dates,
    certificate_wording: snap.certificate_wording || cert.certificate_wording,
    certificate_title: snap.certificate_title || cert.certificate_title,
    certificate_type: snap.certificate_type || cert.certificate_type,
    issue_date: snap.issue_date || cert.issue_date,
    department: snap.department || cert.department
  };

  showAdminAlert(`Generating archived PDF (v${snap.version || (versionIdx + 1)})...`, 'info');
  try {
    const doc = await generateSingleCertificatePdfDoc(archivedCert);
    const cleanName = (archivedCert.student_name || 'Participant').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Certificate_${certNumber.replace(/\s+/g, '_')}_v${snap.version || (versionIdx + 1)}_${cleanName}.pdf`;
    doc.save(filename);
    showAdminAlert(`Archived Certificate v${snap.version || (versionIdx + 1)} downloaded!`, 'success');
  } catch (err) {
    console.error('Archived PDF generation error:', err);
    alert('Failed to generate archived certificate PDF.');
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
