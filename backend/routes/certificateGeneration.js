const express = require("express");
const router = express.Router();
const multer = require("../multerConfig");
const xlsx = require("xlsx");
const path = require("path");
const jwt = require("jsonwebtoken");
const feedbackCertificateStorage = require("../feedbackCertificateStorage");

const JWT_SECRET = process.env.JWT_SECRET || "csbs_rit_placement_secret_key_2026";

// Multer memory storage configuration (Max 10MB, strictly spreadsheet/CSV files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedExtensions = [".xlsx", ".xls", ".csv"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file format. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed."));
        }
    }
});

// Authentication & Permission helpers matching existing admin routes
function getEffectiveRole(user) {
    if (!user) return "unknown";
    const role = (user.role || "").toLowerCase().trim();
    const designation = (user.designation || "").toLowerCase().trim();

    if (role === "admin" || role === "administrator") return "admin";
    if (role === "hod" || designation.includes("head of department") || designation.includes("hod")) return "hod";
    if (role === "faculty_coordinator" || designation.includes("coordinator")) return "faculty_coordinator";
    if (role === "ja_faculty" || role === "ja" || designation.includes("ja") || designation.includes("junior assistant")) return "ja_faculty";
    if (role === "faculty") return "faculty";
    return role;
}

function checkFacultyOrAdminPermission(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.placement_access === false) {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied: Your account does not have permission to access the Placement Portal."
                });
            }
            req.user = decoded;
        } catch (e) {}
    }
    next();
}

function requireFacultyOrCoordinatorWrite(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Authorization token is required." });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.placement_access === false) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your account does not have permission to access the Placement Portal."
            });
        }
        req.user = decoded;

        const effectiveRole = getEffectiveRole(req.user);
        // Both Administrator and authorized Faculty Coordinator have permission to generate and manage certificates
        const allowedRoles = ["admin", "administrator", "faculty_coordinator", "coordinator", "hod"];
        if (!allowedRoles.includes(effectiveRole)) {
            if (effectiveRole === "ja_faculty") {
                return res.status(403).json({
                    success: false,
                    message: "Permission Denied: JA Faculty has verification-only access. Certificate generation and revocation are restricted to Administrators and Faculty Coordinators."
                });
            }
            return res.status(403).json({
                success: false,
                message: "Permission Denied: Certificate generation and revocation are restricted to Administrators and authorized Faculty Coordinators."
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired or invalid token. Please log in again." });
    }
}

function requireStrictAdminRole(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Authorization token is required." });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.placement_access === false) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your account does not have permission to access the Placement Portal."
            });
        }
        req.user = decoded;

        const effectiveRole = getEffectiveRole(req.user);
        if (effectiveRole !== "admin" && effectiveRole !== "administrator") {
            return res.status(403).json({
                success: false,
                message: "Permission Denied: Deleting certificate records and test batches is restricted strictly to Administrators."
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired or invalid token. Please log in again." });
    }
}

// Helper: Sanitize cell against CSV / Formula Injection
function sanitizeCellValue(val) {
    if (val === null || val === undefined) return "";
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str; // Prefix apostrophe to prevent execution in spreadsheet software
    }
    return str;
}

// Helper: Header alias normalizer
function normalizeHeaderName(header) {
    return String(header || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// Map spreadsheet row using flexible case-insensitive header aliases
function mapSpreadsheetRow(rawRow, headerMap) {
    const studentNameVal = rawRow[headerMap.participant_name] || rawRow[headerMap.student_name] || "";
    const regNoVal = rawRow[headerMap.register_number] || "";
    const emailVal = rawRow[headerMap.email] || "";
    const partTypeVal = rawRow[headerMap.participant_type] || rawRow[headerMap.participation_type] || "";
    const deptVal = rawRow[headerMap.department] || "";
    const instVal = rawRow[headerMap.institution] || "";
    const yearVal = rawRow[headerMap.academic_year] || "";
    const eventNameVal = rawRow[headerMap.event_name] || "";
    const eventDateVal = rawRow[headerMap.event_date] || "";
    const issueDateVal = rawRow[headerMap.issue_date] || "";

    const nameSanitized = sanitizeCellValue(studentNameVal);
    const eventSanitized = sanitizeCellValue(eventNameVal);

    return {
        participant_name: nameSanitized,
        student_name: nameSanitized,
        full_name_with_initial: nameSanitized,
        fullNameWithInitial: nameSanitized,
        participant_type: sanitizeCellValue(partTypeVal),
        participants: sanitizeCellValue(partTypeVal),
        institution: sanitizeCellValue(instVal),
        college_name: sanitizeCellValue(instVal),
        collegeName: sanitizeCellValue(instVal),
        department: sanitizeCellValue(deptVal),
        email: sanitizeCellValue(emailVal),
        mail_id: sanitizeCellValue(emailVal),
        mailId: sanitizeCellValue(emailVal),
        register_number: sanitizeCellValue(regNoVal),
        academic_year: sanitizeCellValue(yearVal) || "2026-27",
        event_name: eventSanitized,
        event_date: sanitizeCellValue(eventDateVal),
        participation_type: sanitizeCellValue(partTypeVal) || "Participation",
        achievement: sanitizeCellValue(partTypeVal) || "Participation",
        issue_date: sanitizeCellValue(issueDateVal)
    };
}

// Parse uploaded workbook buffer into array of normalized records
function parseUploadedSpreadsheet(buffer) {
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true, dateNF: "yyyy-mm-dd" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Uploaded workbook contains no readable sheets.");
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });

    if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error("Uploaded spreadsheet contains no data rows.");
    }

    // Determine header aliases from the first row keys
    const sampleKeys = Object.keys(rawData[0]);
    const headerMap = {
        participant_name: null,
        student_name: null,
        register_number: null,
        email: null,
        participant_type: null,
        institution: null,
        department: null,
        academic_year: null,
        event_name: null,
        event_date: null,
        participation_type: null,
        issue_date: null
    };

    const exactAliases = {
        participant_name: ["fullnamewithinitial", "fullnamewithinitials", "fullname", "participantname", "studentname", "candidatename", "studentfullname", "attendeename", "participant", "student", "name"],
        register_number: ["registernumber", "registerno", "regno", "rollno", "rollnumber", "registrationnumber", "registrationno", "register", "reg"],
        email: ["mailid", "email", "emailid", "emailaddress", "mail", "mailaddress"],
        department: ["department", "dept", "branch", "discipline", "deptname"],
        institution: ["collegename", "institutionname", "institution", "college", "organization", "org", "university", "school"],
        event_name: ["eventname", "eventtitle", "titleoftheevent", "eventtopic", "topic", "workshop", "seminar", "programme", "program", "course", "training", "event"],
        event_date: ["eventdate", "date", "conducteddate", "heldon", "eventconducteddate", "dates"],
        participant_type: ["participanttype", "participationtype", "category", "designation", "role", "type", "participantcategory", "participants", "achievement"],
        academic_year: ["academicyear", "year", "batch", "class", "studyyear"],
        issue_date: ["certificateissuedate", "issuedate", "dateofissue", "certissuedate"]
    };

    const normKeys = sampleKeys.map(k => ({ original: k, norm: normalizeHeaderName(k) }));
    const usedKeys = new Set();

    // Pass 1: Exact matches first
    for (const [field, aliases] of Object.entries(exactAliases)) {
        for (const item of normKeys) {
            if (!usedKeys.has(item.original) && !headerMap[field] && aliases.includes(item.norm)) {
                headerMap[field] = item.original;
                usedKeys.add(item.original);
                break;
            }
        }
    }

    // Pass 2: Fuzzy/substring matches for remaining unmapped fields
    for (const item of normKeys) {
        if (usedKeys.has(item.original)) continue;
        const n = item.norm;

        if (!headerMap.event_date && n.includes("date") && !n.includes("issue")) {
            headerMap.event_date = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.issue_date && n.includes("issue") && n.includes("date")) {
            headerMap.issue_date = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.event_name && !n.includes("date") && (n.includes("event") || n.includes("topic") || n.includes("workshop") || n.includes("seminar") || n.includes("programme") || n.includes("title"))) {
            headerMap.event_name = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.participant_name && !n.includes("college") && !n.includes("inst") && !n.includes("dept") && !n.includes("event") && !n.includes("date") && (n.includes("name") || n.includes("student") || n.includes("participant"))) {
            headerMap.participant_name = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.register_number && (n.includes("reg") || n.includes("roll"))) {
            headerMap.register_number = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.email && (n.includes("mail") || n.includes("email"))) {
            headerMap.email = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.department && (n.includes("dept") || n.includes("department") || n.includes("branch"))) {
            headerMap.department = item.original;
            usedKeys.add(item.original);
        } else if (!headerMap.institution && (n.includes("college") || n.includes("inst") || n.includes("univ") || n.includes("org"))) {
            headerMap.institution = item.original;
            usedKeys.add(item.original);
        }
    }

    // Fallbacks if not detected
    if (!headerMap.participant_name && !headerMap.student_name) headerMap.participant_name = sampleKeys[0];
    headerMap.student_name = headerMap.participant_name;

    const mapped = rawData.map(r => mapSpreadsheetRow(r, headerMap));
    return mapped;
}

// ============================================================
// 1. UPLOAD & VALIDATE SPREADSHEET FILE (.XLSX, .XLS, .CSV)
// ============================================================
router.post("/validate", checkFacultyOrAdminPermission, (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message || "File upload error" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please select an Excel (.xlsx, .xls) or CSV (.csv) file to upload." });
        }

        try {
            const rawRecords = parseUploadedSpreadsheet(req.file.buffer);
            const reqEventName = (req.body && (req.body.event_name || req.body.eventName)) || "";
            const reqEventDate = (req.body && (req.body.event_date || req.body.eventDate)) || "";
            const validation = await feedbackCertificateStorage.validateBatchRecords(rawRecords, null, {
                event_name: reqEventName,
                event_date: reqEventDate
            });

            res.json({
                success: true,
                filename: req.file.originalname,
                file_size_bytes: req.file.size,
                ...validation
            });
        } catch (parseErr) {
            console.error("Spreadsheet parse error:", parseErr);
            res.status(400).json({
                success: false,
                message: parseErr.message || "Failed to parse spreadsheet file. Please check column format and structure."
            });
        }
    });
});

// ============================================================
// 2. VALIDATE EDITED / RAW RECORDS (BEFORE GENERATION)
// ============================================================
router.post("/validate-raw", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, message: "Invalid records payload: expected an array." });
        }

        const validation = await feedbackCertificateStorage.validateBatchRecords(records);
        res.json({
            success: true,
            ...validation
        });
    } catch (e) {
        console.error("Validate raw error:", e);
        res.status(500).json({ success: false, message: e.message || "Failed to validate records." });
    }
});

// ============================================================
// 3. GENERATE BULK CERTIFICATES (RESTRICTED TO FACULTY / FACULTY COORDINATORS)
// ============================================================
router.post("/issue-batch", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const {
            batch_title,
            event_name,
            event_date,
            category,
            academic_year,
            signatory_count,
            signatory_1_name,
            signatory_1_title,
            signatory_1_org,
            signatory_2_name,
            signatory_2_title,
            signatory_2_org,
            signatory_3_name,
            signatory_3_title,
            signatory_3_org,
            signatory_4_name,
            signatory_4_title,
            signatory_4_org,
            signatory_5_name,
            signatory_5_title,
            signatory_5_org,
            signatory_6_name,
            signatory_6_title,
            signatory_6_org,
            programme_title,
            programme_dates,
            department,
            institution,
            certificate_wording,
            template_style,
            id_prefix,
            certificate_title,
            certificate_type,
            allow_duplicates,
            event_number,
            programme_id,
            records
        } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: "No student records provided for generation." });
        }
        if (records.length > 500) {
            return res.status(400).json({ success: false, message: "Batch exceeds maximum permitted limit of 500 records per operation. Please split into smaller batches." });
        }

        const result = await feedbackCertificateStorage.issueBulkCertificates({
            batch_title: batch_title || `Batch - ${event_name || 'Event'}`,
            event_name: event_name || (records[0] ? records[0].event_name : "Department Event"),
            event_date,
            category: category || "Placement Training",
            academic_year: academic_year || "2026-27",
            signatory_count: signatory_count ? Number(signatory_count) : 6,
            signatory_1_name: signatory_1_name || "Dr. S.Erana Verrappa Dinesh",
            signatory_1_title: signatory_1_title || "Faculty Coordinator",
            signatory_1_org: signatory_1_org || "CSBS, RIT",
            signatory_2_name: signatory_2_name || "Mrs. B.Yazhini",
            signatory_2_title: signatory_2_title || "Faculty Coordinator",
            signatory_2_org: signatory_2_org || "CSBS, RIT",
            signatory_3_name: signatory_3_name || "Ms. Preethi Ram",
            signatory_3_title: signatory_3_title || "Faculty Coordinator",
            signatory_3_org: signatory_3_org || "CSBS, RIT",
            signatory_4_name: signatory_4_name || "Dr. D. Kesavaraja",
            signatory_4_title: signatory_4_title || "Convenor",
            signatory_4_org: signatory_4_org || "CSBS, RIT",
            signatory_5_name: signatory_5_name || "Dr. S. Rajakarunakaran",
            signatory_5_title: signatory_5_title || "Patron",
            signatory_5_org: signatory_5_org || "RIT",
            signatory_6_name: signatory_6_name || "Dr. L. Ganesan",
            signatory_6_title: signatory_6_title || "Chief Patron",
            signatory_6_org: signatory_6_org || "RIT",
            programme_title: programme_title || "One Week Short-Term Training Programme (STTP)",
            programme_dates: programme_dates || "October 12, 2026, to October 18, 2026",
            department: department || "Department of Computer Science and Business Systems",
            institution: institution || "Ramco Institute of Technology, Rajapalayam",
            college_name: institution || "Ramco Institute of Technology, Rajapalayam",
            certificate_wording: certificate_wording || "",
            template_style: template_style || "rit_purple_gold",
            id_prefix: id_prefix || "RITCB 01 ",
            certificate_title: certificate_title || "CERTIFICATE OF PARTICIPATION",
            certificate_type: certificate_type || "Participation",
            allow_duplicates: !!allow_duplicates,
            event_number: event_number || undefined,
            programme_id: programme_id || undefined,
            records: records,
            issuer: req.user || { id: 1, full_name: "Faculty Coordinator", role: "faculty_coordinator" }
        });

        res.json({
            success: true,
            message: `Successfully issued ${result.total_issued} certificates for batch "${result.batch.batch_title}".`,
            ...result
        });
    } catch (e) {
        console.error("Batch certificate issue error:", e);
        res.status(500).json({ success: false, message: e.message || "Failed to generate certificate batch." });
    }
});

// ============================================================
// 4. REVOKE AN ISSUED CERTIFICATE (RESTRICTED TO FACULTY)
// ============================================================
router.post("/revoke/:certId", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const certId = req.params.certId;
        const { reason } = req.body;

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({ success: false, message: "A clear revocation reason is required for audit logs." });
        }

        const revoked = await feedbackCertificateStorage.revokeCertificate({
            certId,
            reason: reason.trim(),
            issuer: req.user || { id: 1, full_name: "Faculty Authority", role: "faculty_coordinator" }
        });

        res.json({
            success: true,
            message: `Certificate ${revoked.certificate_number} has been revoked successfully.`,
            certificate: revoked
        });
    } catch (e) {
        console.error("Revoke certificate error:", e);
        res.status(500).json({ success: false, message: e.message || "Failed to revoke certificate." });
    }
});

// ============================================================
// 5. GET BATCHES HISTORY
// ============================================================

// ============================================================
// CERTIFICATE PROGRAMME MANAGEMENT (ADMIN & FACULTY EDITABLE)
// ============================================================
router.get("/programmes", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const programmes = await feedbackCertificateStorage.getAllCertificateProgrammes();
        res.json({ success: true, programmes });
    } catch (err) {
        console.error("Failed to load certificate programmes:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to load programmes." });
    }
});

router.post("/programmes", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const created = await feedbackCertificateStorage.createCertificateProgramme(req.body);
        res.status(201).json({
            success: true,
            programme: created,
            message: `Successfully created programme "${created.programme_title}" (Event ID: ${created.event_number}).`
        });
    } catch (err) {
        console.error("Failed to create certificate programme:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to create programme." });
    }
});

router.put("/programmes/:id", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const updated = await feedbackCertificateStorage.updateCertificateProgramme(req.params.id, req.body);
        res.json({
            success: true,
            programme: updated,
            message: `Successfully updated programme "${updated.programme_title}" (Event ID: ${updated.event_number}).`
        });
    } catch (err) {
        console.error("Failed to update certificate programme:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to update programme." });
    }
});

router.delete("/programmes/:id", requireStrictAdminRole, async (req, res) => {
    try {
        const deleted = await feedbackCertificateStorage.deleteCertificateProgramme(req.params.id);
        res.json({
            success: true,
            programme: deleted,
            message: `Successfully deleted programme "${deleted.programme_title}" (Event ID: ${deleted.event_number} archived).`
        });
    } catch (err) {
        console.error("Failed to delete certificate programme:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to delete programme." });
    }
});

router.get("/batches", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const batches = await feedbackCertificateStorage.getCertificateBatches();
        res.json({ success: true, count: batches.length, batches });
    } catch (e) {
        console.error("Get batches error:", e);
        res.status(500).json({ success: false, message: "Failed to load certificate batches." });
    }
});

router.get("/certificates", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const certs = await feedbackCertificateStorage.getAllCertificates();
        res.json({ success: true, count: certs.length, certificates: certs });
    } catch (e) {
        console.error("Get certificates error:", e);
        res.status(500).json({ success: false, message: "Failed to load certificates." });
    }
});

router.get("/all-certificates", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const certs = await feedbackCertificateStorage.getAllCertificates();
        res.json({ success: true, count: certs.length, certificates: certs });
    } catch (e) {
        console.error("Get all-certificates error:", e);
        res.status(500).json({ success: false, message: "Failed to load certificates." });
    }
});

// ============================================================
// 6. GET CERTIFICATES BY BATCH ID
// ============================================================
router.get("/batch/:batchId/certificates", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const batchId = req.params.batchId;
        const certs = await feedbackCertificateStorage.getBatchCertificates(batchId);
        res.json({ success: true, count: certs.length, certificates: certs });
    } catch (e) {
        console.error("Get batch certificates error:", e);
        res.status(500).json({ success: false, message: "Failed to load batch certificates." });
    }
});

// ============================================================
// 6B. PERMANENTLY DELETE A TEST BATCH & ASSOCIATED FILES (ADMIN ONLY)
// ============================================================
router.delete("/batch/:batchId", requireStrictAdminRole, async (req, res) => {
    try {
        const batchId = req.params.batchId;
        const confirmBatchId = req.body.confirm_batch_id || req.query.confirm_batch_id;

        if (!confirmBatchId) {
            return res.status(400).json({
                success: false,
                message: "Explicit confirmation required: Please provide confirm_batch_id matching the batch ID to proceed with deletion."
            });
        }

        const result = await feedbackCertificateStorage.deleteCertificateBatch({
            batchId,
            confirmBatchId,
            actor: req.user
        });

        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error("Delete batch error:", e);
        res.status(e.message && e.message.includes("not found") ? 404 : 400).json({
            success: false,
            message: e.message || "Failed to delete certificate batch."
        });
    }
});

// ============================================================
// 6C. PERMANENTLY DELETE A SINGLE CERTIFICATE RECORD (ADMIN ONLY)
// ============================================================
router.delete("/record/:certNumber", requireStrictAdminRole, async (req, res) => {
    try {
        const certificateNumber = req.params.certNumber;
        const confirmCertificateNumber = req.body.confirm_cert_number || req.query.confirm_cert_number;

        if (!confirmCertificateNumber) {
            return res.status(400).json({
                success: false,
                message: "Explicit confirmation required: Please provide confirm_cert_number matching the certificate ID."
            });
        }

        const result = await feedbackCertificateStorage.deleteSingleCertificateRecord({
            certificateNumber,
            confirmCertificateNumber,
            actor: req.user
        });

        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error("Delete single certificate record error:", e);
        res.status(e.message && e.message.includes("not found") ? 404 : 400).json({
            success: false,
            message: e.message || "Failed to delete certificate record."
        });
    }
});

// ============================================================
// 7. REUSABLE CERTIFICATE TEMPLATES CRUD
// ============================================================
router.get("/templates", checkFacultyOrAdminPermission, async (req, res) => {
    try {
        const templates = await feedbackCertificateStorage.getCertificateTemplates();
        res.json({ success: true, count: templates.length, templates });
    } catch (e) {
        console.error("Get templates error:", e);
        res.status(500).json({ success: false, message: "Failed to load certificate templates." });
    }
});

router.post("/templates", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const saved = await feedbackCertificateStorage.saveCertificateTemplate(req.body);
        res.json({ success: true, message: "Template saved successfully.", template: saved });
    } catch (e) {
        console.error("Save template error:", e);
        res.status(500).json({ success: false, message: e.message || "Failed to save template." });
    }
});

router.delete("/templates/:templateId", requireFacultyOrCoordinatorWrite, async (req, res) => {
    try {
        const ok = await feedbackCertificateStorage.deleteCertificateTemplate(req.params.templateId);
        res.json({ success: ok, message: ok ? "Template removed." : "Template not found." });
    } catch (e) {
        console.error("Delete template error:", e);
        res.status(500).json({ success: false, message: "Failed to delete template." });
    }
});

// ============================================================
// 8. DOWNLOAD EXCEL TEMPLATE (.XLSX) - 5 REQUIRED COLUMNS
// ============================================================
router.get("/template-download", (req, res) => {
    try {
        const headers = [
            "Full Name with Initial",
            "Participants",
            "Department",
            "College Name",
            "Mail Id"
        ];

        const sampleRows = [
            [
                "SIVARANJANI S",
                "Student",
                "Computer Science and Business Systems",
                "Ramco Institute of Technology, Rajapalayam",
                "sivaranjani.csbs@ritrjpm.ac.in"
            ],
            [
                "ARUN KUMAR M",
                "Student",
                "Computer Science and Business Systems",
                "Ramco Institute of Technology, Rajapalayam",
                "arunkumar.csbs@ritrjpm.ac.in"
            ],
            [
                "Dr. K. SURESH KUMAR",
                "Professor",
                "Computer Science and Engineering",
                "Ramco Institute of Technology, Rajapalayam",
                "sureshkumar@ritrjpm.ac.in"
            ]
        ];

        const wsData = [headers, ...sampleRows];
        const ws = xlsx.utils.aoa_to_sheet(wsData);

        // Column widths
        ws["!cols"] = [
            { wch: 30 }, // Full Name with Initial
            { wch: 20 }, // Participants
            { wch: 40 }, // Department
            { wch: 45 }, // College Name
            { wch: 35 }  // Mail Id
        ];

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Participants Template");

        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", 'attachment; filename="RIT_CSBS_Certificate_Template.xlsx"');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);
    } catch (e) {
        console.error("Template generation error:", e);
        res.status(500).json({ success: false, message: "Failed to generate Excel template." });
    }
});

// ============================================================
// 8. QUICK CERTIFICATE VERIFICATION (ADMIN / IN-TAB USE)
// ============================================================
router.get("/verify-quick/:certId", async (req, res) => {
    try {
        const certId = req.params.certId;
        const result = await feedbackCertificateStorage.getPublicCertificateDetails(certId);
        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error("Quick verify error:", e);
        res.status(500).json({ success: false, message: "Verification lookup error." });
    }
});

// ============================================================
// 9. PUBLIC CERTIFICATE VERIFICATION ENDPOINT (UNAUTHENTICATED)
// Exposes ONLY approved public verification attributes
// ============================================================
router.get("/verify-public/:certId", async (req, res) => {
    try {
        const certId = req.params.certId;
        const result = await feedbackCertificateStorage.getPublicCertificateDetails(certId);
        if (!result.found) {
            return res.status(404).json({
                success: false,
                found: false,
                status: "NOT_FOUND",
                message: result.message || "Certificate not found. Please check the certificate ID."
            });
        }
        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error("Public verify error:", e);
        res.status(500).json({ success: false, message: "Internal server error during certificate verification." });
    }
});

module.exports = router;
