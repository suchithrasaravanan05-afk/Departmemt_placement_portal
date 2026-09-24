const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabase, supabaseAdmin } = require("./supabase");

const DATA_FILE = path.join(__dirname, "event_feedbacks_certificates.json");
const STORAGE_BUCKET = "certificate_storage";
const STORAGE_FILE_NAME = "certificates_db.json";

// Default structure
const DEFAULT_DATA = {
    event_feedbacks: [],
    feedback_submissions: [],
    certificates: [],
    notifications: []
};

// In-memory cache
let inMemoryData = null;
let isBucketReady = false;

function getClient() {
    return supabaseAdmin || supabase;
}

// Ensure the storage bucket exists in Supabase
async function ensureStorageBucket() {
    if (isBucketReady) return true;
    const client = getClient();
    if (!client || !client.storage) return false;
    try {
        const { data: buckets } = await client.storage.listBuckets();
        const exists = (buckets || []).some(b => b.name === STORAGE_BUCKET);
        if (!exists) {
            await client.storage.createBucket(STORAGE_BUCKET, { public: false });
        }
        isBucketReady = true;
        return true;
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Ensure bucket notice:", e.message);
        return false;
    }
}

// Read local JSON file
function readLocalData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.certificates)) {
                if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Read local file warning:", e.message);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

// Write local JSON file
function writeLocalData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Write local file warning:", e.message);
    }
}

// Download data from Supabase Storage
async function loadFromSupabaseStorage() {
    const client = getClient();
    if (!client || !client.storage) return null;
    try {
        await ensureStorageBucket();
        const { data, error } = await client.storage.from(STORAGE_BUCKET).download(STORAGE_FILE_NAME);
        if (!error && data) {
            const text = await data.text();
            const parsed = JSON.parse(text);
            if (parsed && Array.isArray(parsed.certificates)) {
                if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
                return parsed;
            }
        }
    } catch (e) {
        // Fall through silently if not yet saved in storage
    }
    return null;
}

// Persist entire database state to Supabase Cloud Storage
async function persistToSupabaseStorage(data) {
    const client = getClient();
    if (!client || !client.storage) return;
    try {
        await ensureStorageBucket();
        const payload = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
        await client.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE_NAME, payload, {
            upsert: true,
            contentType: "application/json"
        });
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Supabase storage upload warning:", e.message);
    }
}

// Merge Supabase PostgreSQL tables if they exist
async function syncFromSupabaseTables(merged) {
    const client = getClient();
    if (!client) return merged;

    try {
        const { data: dbCerts, error: certErr } = await client.from("certificates").select("*");
        if (!certErr && Array.isArray(dbCerts) && dbCerts.length > 0) {
            const certMap = new Map((merged.certificates || []).map(c => [String(c.certificate_number || c.id), c]));
            dbCerts.forEach(c => certMap.set(String(c.certificate_number || c.id), c));
            merged.certificates = Array.from(certMap.values());
        }
    } catch (e) {}

    try {
        const { data: dbEvents, error: evErr } = await client.from("event_feedbacks").select("*");
        if (!evErr && Array.isArray(dbEvents) && dbEvents.length > 0) {
            const evMap = new Map((merged.event_feedbacks || []).map(ev => [String(ev.id), ev]));
            dbEvents.forEach(ev => evMap.set(String(ev.id), ev));
            merged.event_feedbacks = Array.from(evMap.values());
        }
    } catch (e) {}

    return merged;
}

// Master state getter: merges Supabase Cloud Storage + Supabase Tables + Local File
async function getAllData() {
    let base = readLocalData();

    // Check Supabase Cloud Storage
    const cloudData = await loadFromSupabaseStorage();
    if (cloudData && Array.isArray(cloudData.certificates)) {
        // Merge records (cloud + local)
        const certMap = new Map((base.certificates || []).map(c => [String(c.certificate_number || c.id), c]));
        (cloudData.certificates || []).forEach(c => certMap.set(String(c.certificate_number || c.id), c));

        const evMap = new Map((base.event_feedbacks || []).map(e => [String(e.id), e]));
        (cloudData.event_feedbacks || []).forEach(e => evMap.set(String(e.id), e));

        const subMap = new Map((base.feedback_submissions || []).map(s => [String(s.id), s]));
        (cloudData.feedback_submissions || []).forEach(s => subMap.set(String(s.id), s));

        const notifMap = new Map((base.notifications || []).map(n => [String(n.id), n]));
        (cloudData.notifications || []).forEach(n => notifMap.set(String(n.id), n));

        base = {
            event_feedbacks: Array.from(evMap.values()),
            feedback_submissions: Array.from(subMap.values()),
            certificates: Array.from(certMap.values()),
            notifications: Array.from(notifMap.values())
        };
    }

    // Merge Supabase PostgreSQL tables if accessible
    base = await syncFromSupabaseTables(base);

    inMemoryData = base;
    return inMemoryData;
}

// Master state saver: saves to memory, local file, Supabase Cloud Storage, and Supabase Tables
async function commitData(data) {
    inMemoryData = data;
    writeLocalData(data);

    // Save to Supabase Storage
    await persistToSupabaseStorage(data);

    // Attempt insert/upsert into Supabase tables if they exist
    const client = getClient();
    if (client) {
        try {
            if (data.certificates && data.certificates.length > 0) {
                await client.from("certificates").upsert(data.certificates, { onConflict: "certificate_number" });
            }
        } catch (e) {}
        try {
            if (data.event_feedbacks && data.event_feedbacks.length > 0) {
                await client.from("event_feedbacks").upsert(data.event_feedbacks, { onConflict: "id" });
            }
        } catch (e) {}
        try {
            if (data.notifications && data.notifications.length > 0) {
                await client.from("notifications").upsert(data.notifications, { onConflict: "id" });
            }
        } catch (e) {}
    }
}

// Generate standardized, institutional Certificate ID:
// Format: RIT-[EVENT_CODE]-[YEAR]-[SEQUENCE] e.g. RIT-JAVA-2026-0001
function generateCertificateNumber(eventCode = "EVT", year = new Date().getFullYear(), allCertificates = []) {
    const cleanCode = String(eventCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "EVT";
    const yearStr = String(year).slice(-4);
    const prefix = `RIT-${cleanCode}-${yearStr}-`;

    const existingSeqNumbers = (allCertificates || [])
        .filter(c => c && c.certificate_number && c.certificate_number.startsWith(prefix))
        .map(c => {
            const parts = c.certificate_number.split("-");
            const last = parseInt(parts[parts.length - 1], 10);
            return isNaN(last) ? 0 : last;
        });

    const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers) : 0;
    const nextSeq = maxSeq + 1;
    const seqStr = String(nextSeq).padStart(4, "0");

    return `${prefix}${seqStr}`;
}

// ============================================================
// EVENT FEEDBACKS & QUIZ (ADMIN / FACULTY)
// ============================================================

// Helper: Query all student users from Supabase users table
async function getAllStudentUsers() {
    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client
                .from("users")
                .select("id, full_name, register_number, email, role, year, department")
                .eq("role", "student");
            if (!error && Array.isArray(data) && data.length > 0) {
                return data;
            }
        } catch (e) {
            console.warn("[getAllStudentUsers] Supabase query warning:", e.message);
        }
    }
    return [];
}

// Helper: Filter students who are eligible for an event
function filterEligibleStudents(allStudents, event) {
    if (!Array.isArray(allStudents) || allStudents.length === 0) return [];
    const targetType = (event.target_type || "all").toLowerCase();

    if (targetType === "student" && event.student_id) {
        return allStudents.filter(s => String(s.id) === String(event.student_id));
    }
    if (targetType === "year_3" || targetType === "3") {
        return allStudents.filter(s => parseInt(s.year, 10) === 3);
    }
    if (targetType === "year_4" || targetType === "4") {
        return allStudents.filter(s => parseInt(s.year, 10) === 4);
    }
    // "all" students
    return allStudents;
}

async function createEventFeedback({
    event_name,
    event_code,
    event_date,
    event_venue,
    coordinator,
    academic_year,
    target_type = "all",
    student_id = null,
    message = "",
    signatory_title = "Head of Department - CSBS",
    quiz = [],
    feedback_config = null,
    min_quiz_score_pct = 50,
    created_by = null
}) {
    const newId = Date.now();

    // Auto-generate clean event code if not provided
    let derivedCode = event_code ? String(event_code).trim().toUpperCase() : "";
    if (!derivedCode) {
        const words = String(event_name).trim().split(/\s+/);
        derivedCode = words.map(w => w[0]).join("").toUpperCase().slice(0, 5) || "EVENT";
    }

    const validatedQuiz = (Array.isArray(quiz) ? quiz : []).map((q, idx) => ({
        id: q.id || idx + 1,
        question: String(q.question || "").trim(),
        option_a: String(q.option_a || "").trim(),
        option_b: String(q.option_b || "").trim(),
        option_c: String(q.option_c || "").trim(),
        option_d: String(q.option_d || "").trim(),
        correct_option: String(q.correct_option || "A").trim().toUpperCase()
    }));

    const record = {
        id: newId,
        event_name: String(event_name).trim(),
        event_code: derivedCode,
        event_date: event_date || new Date().toISOString().split("T")[0],
        event_venue: event_venue ? String(event_venue).trim() : "Department Seminar Hall / Online",
        coordinator: coordinator ? String(coordinator).trim() : "Faculty Coordinator",
        academic_year: academic_year ? String(academic_year).trim() : "2026-27",
        target_type: target_type || "all",
        student_id: student_id ? parseInt(student_id, 10) : null,
        message: message ? String(message).trim() : "",
        signatory_title: signatory_title || "Head of Department - CSBS",
        status: "ACTIVE",
        min_quiz_score_pct: parseInt(min_quiz_score_pct, 10) || 50,
        quiz: validatedQuiz,
        feedback_config: feedback_config || {
            include_rating: true,
            include_usefulness: true,
            include_learnings: true,
            include_suggestions: true
        },
        created_by: created_by || "Placement Admin",
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        closed_at: null
    };

    const data = await getAllData();
    data.event_feedbacks.unshift(record);

    // Dynamic Notifications: Query all eligible students and create notification records
    const allStudents = await getAllStudentUsers();
    const eligibleStudents = filterEligibleStudents(allStudents, record);
    if (!Array.isArray(data.notifications)) data.notifications = [];

    eligibleStudents.forEach((st, idx) => {
        data.notifications.unshift({
            id: Date.now() + idx + Math.floor(Math.random() * 1000),
            student_id: st.id,
            event_id: newId,
            title: `New Event Feedback & Quiz: ${record.event_name}`,
            message: message || `A feedback and quiz form is now available for "${record.event_name}". Event Date: ${record.event_date}. Please complete the quiz and feedback to fulfill your participation requirements and earn your verified certificate.`,
            event_name: record.event_name,
            event_date: record.event_date,
            coordinator: record.coordinator,
            notification_type: "event_feedback",
            created_at: new Date().toISOString(),
            read_at: null,
            status: "unread",
            action_link: `#event-feedback-${newId}`
        });
    });

    await commitData(data);
    return {
        feedback: record,
        eligible_count: eligibleStudents.length,
        notifications_sent: eligibleStudents.length
    };
}

async function getAllEventFeedbacks() {
    const data = await getAllData();
    return data.event_feedbacks || [];
}

// Master function to compute real statistics for every event
async function getEventFeedbacksWithStats() {
    const data = await getAllData();
    const allStudents = await getAllStudentUsers();
    const allEvents = data.event_feedbacks || [];
    const allSubs = data.feedback_submissions || [];
    const allCerts = data.certificates || [];

    const subMap = new Map();
    allSubs.forEach(s => {
        const id = parseInt(s.feedback_id, 10);
        subMap.set(id, (subMap.get(id) || 0) + 1);
    });

    const certMap = new Map();
    allCerts.forEach(c => {
        const id = parseInt(c.feedback_id, 10);
        certMap.set(id, (certMap.get(id) || 0) + 1);
    });

    const enriched = allEvents.map(ev => {
        const eligible = filterEligibleStudents(allStudents, ev);
        const totalEligible = eligible.length > 0 ? eligible.length : (allStudents.length > 0 ? allStudents.length : 14);
        const submitted = subMap.get(parseInt(ev.id, 10)) || 0;
        const pending = Math.max(0, totalEligible - submitted);
        const completionRate = totalEligible > 0 ? Number(((submitted / totalEligible) * 100).toFixed(1)) : 0;
        const certCount = certMap.get(parseInt(ev.id, 10)) || 0;

        return {
            ...ev,
            status: (ev.status || "ACTIVE").toUpperCase(),
            total_eligible: totalEligible,
            submitted_count: submitted,
            pending_count: pending,
            completion_rate: completionRate,
            certificates_issued_count: certCount
        };
    });

    const activeEvents = enriched.filter(e => (e.status || "ACTIVE").toUpperCase() === "ACTIVE");
    const archivedEvents = enriched.filter(e => {
        const st = (e.status || "").toUpperCase();
        return st === "ARCHIVED" || st === "CLOSED";
    });

    return {
        all: enriched,
        active: activeEvents,
        archived: archivedEvents
    };
}

// Toggle / update event status: ACTIVE, CLOSED, ARCHIVED
async function updateEventFeedbackStatus(id, newStatus) {
    const numId = parseInt(id, 10);
    const data = await getAllData();
    const ev = (data.event_feedbacks || []).find(e => parseInt(e.id, 10) === numId);
    if (!ev) {
        throw new Error("Event feedback form not found");
    }
    const cleanStatus = String(newStatus).trim().toUpperCase();
    ev.status = cleanStatus;
    if (cleanStatus === "CLOSED" || cleanStatus === "ARCHIVED") {
        ev.closed_at = new Date().toISOString();
    } else if (cleanStatus === "ACTIVE") {
        ev.closed_at = null;
    }
    await commitData(data);
    return ev;
}

async function deleteEventFeedback(id) {
    const numId = parseInt(id, 10);
    const data = await getAllData();
    data.event_feedbacks = (data.event_feedbacks || []).filter(item => parseInt(item.id, 10) !== numId);
    data.feedback_submissions = (data.feedback_submissions || []).filter(item => parseInt(item.feedback_id, 10) !== numId);
    data.certificates = (data.certificates || []).filter(item => parseInt(item.feedback_id, 10) !== numId);
    if (Array.isArray(data.notifications)) {
        data.notifications = data.notifications.filter(n => parseInt(n.event_id, 10) !== numId);
    }
    await commitData(data);
    return true;
}

// ============================================================
// CERTIFICATES & SUBMISSIONS
// ============================================================

async function getAllSubmissions() {
    const data = await getAllData();
    return data.feedback_submissions || [];
}

async function getAllCertificates() {
    const data = await getAllData();
    return data.certificates || [];
}

// Get all certificates for a student (checks by user_id OR register_number)
async function getStudentCertificates(userId) {
    const allCerts = await getAllCertificates();
    const strUserId = String(userId).trim();
    const client = getClient();

    // Find student details to support register_number matching
    let studentRegNo = "";
    if (client) {
        try {
            const { data: uData } = await client.from("users").select("register_number").eq("id", userId).maybeSingle();
            if (uData && uData.register_number) {
                studentRegNo = String(uData.register_number).trim().toLowerCase();
            }
        } catch (e) {}
    }

    return (allCerts || []).filter(c => {
        if (!c) return false;
        if (String(c.user_id) === strUserId || String(c.student_id) === strUserId) {
            return true;
        }
        if (studentRegNo && c.register_number) {
            const cReg = String(c.register_number).trim().toLowerCase();
            if (cReg === studentRegNo) return true;
        }
        return false;
    });
}

// Student feedback forms & completion list
async function getStudentEventFeedbacks(userId) {
    const numUserId = parseInt(userId, 10);
    const strUserId = String(userId);
    const allEvents = await getAllEventFeedbacks();
    const allSubmissions = await getAllSubmissions();
    const allCerts = await getAllCertificates();
    const allStudents = await getAllStudentUsers();
    const studentUser = allStudents.find(s => parseInt(s.id, 10) === numUserId);

    const subMap = new Map();
    (allSubmissions || []).forEach(sub => {
        if (String(sub.user_id) === strUserId || parseInt(sub.user_id, 10) === numUserId) {
            subMap.set(parseInt(sub.feedback_id, 10), sub);
        }
    });

    const certMap = new Map();
    (allCerts || []).forEach(cert => {
        if (String(cert.user_id) === strUserId || parseInt(cert.user_id, 10) === numUserId) {
            certMap.set(parseInt(cert.feedback_id, 10), cert);
        }
    });

    // Filter events targeted to this student OR events already submitted by this student
    const relevantEvents = allEvents.filter(ev => {
        const evId = parseInt(ev.id, 10);
        if (subMap.has(evId)) return true; // Always show if student already completed it

        // Target audience check
        const targetType = (ev.target_type || "all").toLowerCase();
        if (targetType === "student") {
            return parseInt(ev.student_id, 10) === numUserId;
        }
        if (targetType === "year_3" || targetType === "3") {
            return studentUser ? parseInt(studentUser.year, 10) === 3 : true;
        }
        if (targetType === "year_4" || targetType === "4") {
            return studentUser ? parseInt(studentUser.year, 10) === 4 : true;
        }
        return true;
    });

    return relevantEvents.map(ev => {
        const evId = parseInt(ev.id, 10);
        const submission = subMap.get(evId) || null;
        const cert = certMap.get(evId) || null;
        const isClosed = (ev.status || "ACTIVE").toUpperCase() === "CLOSED" || (ev.status || "").toUpperCase() === "ARCHIVED";
        return {
            ...ev,
            status: (ev.status || "ACTIVE").toUpperCase(),
            is_closed: isClosed,
            is_submitted: !!submission,
            submission_details: submission,
            certificate: cert
        };
    });
}

// Student submits feedback & receives certificate
async function submitFeedbackAndGenerateCertificate({
    feedback_id,
    user_id,
    rating = 5,
    learnings = "",
    comments = "",
    quiz_answers = {},
    feedback_answers = {},
    student_info = {}
}) {
    const numFeedbackId = parseInt(feedback_id, 10);
    const numUserId = parseInt(user_id, 10);

    const data = await getAllData();
    const allEvents = data.event_feedbacks || [];
    const event = allEvents.find(e => parseInt(e.id, 10) === numFeedbackId);
    if (!event) {
        throw new Error("Event feedback form not found.");
    }

    // Check if event is closed / archived
    const eventStatus = (event.status || "ACTIVE").toUpperCase();
    if (eventStatus === "CLOSED" || eventStatus === "ARCHIVED") {
        throw new Error("This event feedback form has been closed by the coordinator and is no longer accepting submissions.");
    }

    // Server-side duplicate submission check
    const allSubs = data.feedback_submissions || [];
    const existingSub = allSubs.find(s => parseInt(s.feedback_id, 10) === numFeedbackId && parseInt(s.user_id, 10) === numUserId);
    if (existingSub) {
        const existingCert = (data.certificates || []).find(c => parseInt(c.feedback_id, 10) === numFeedbackId && parseInt(c.user_id, 10) === numUserId);
        return {
            success: false,
            alreadySubmitted: true,
            message: `You have already submitted feedback for this event on ${existingSub.submitted_at ? new Date(existingSub.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'an earlier date'}.`,
            submission: existingSub,
            certificate: existingCert
        };
    }

    // Grade Quiz questions
    const quizQuestions = Array.isArray(event.quiz) ? event.quiz : [];
    let quizScore = 0;
    const totalQuestions = quizQuestions.length;

    quizQuestions.forEach(q => {
        const studentAns = quiz_answers[q.id] || quiz_answers[String(q.id)];
        if (studentAns && String(studentAns).trim().toUpperCase() === String(q.correct_option).trim().toUpperCase()) {
            quizScore++;
        }
    });

    const minPassPct = event.min_quiz_score_pct != null ? parseInt(event.min_quiz_score_pct, 10) : 50;
    const quizPct = totalQuestions > 0 ? Math.round((quizScore / totalQuestions) * 100) : 100;
    const quizPassed = totalQuestions === 0 || quizPct >= minPassPct;
    const certificateEligible = quizPassed;

    const subId = Date.now();
    const submissionRecord = {
        id: subId,
        feedback_id: numFeedbackId,
        user_id: numUserId,
        student_name: student_info.full_name || "Student",
        register_number: student_info.register_number || "---",
        department: student_info.department || "Computer Science and Business Systems",
        academic_year: student_info.batch || (student_info.year ? `Year ${student_info.year}` : event.academic_year || "2023-2027"),
        rating: parseInt(rating, 10) || parseInt(feedback_answers.rating, 10) || 5,
        session_useful: feedback_answers.session_useful || "Yes",
        learnings: learnings ? String(learnings).trim() : (feedback_answers.learnings ? String(feedback_answers.learnings).trim() : ""),
        comments: comments ? String(comments).trim() : (feedback_answers.suggestions ? String(feedback_answers.suggestions).trim() : ""),
        quiz_answers: quiz_answers || {},
        quiz_score: quizScore,
        quiz_total: totalQuestions,
        quiz_pct: quizPct,
        quiz_passed: quizPassed,
        certificate_eligible: certificateEligible,
        feedback_answers: feedback_answers || {},
        submitted_at: new Date().toISOString()
    };

    let certificateRecord = null;

    // Issue certificate if eligible
    if (certificateEligible) {
        const allCerts = data.certificates || [];
        const certId = Date.now() + 1;
        const certYear = event.event_date ? new Date(event.event_date).getFullYear() : new Date().getFullYear();
        const certNumber = generateCertificateNumber(event.event_code || "EVT", certYear, allCerts);
        const issueDate = new Date().toISOString().split("T")[0];
        const qrToken = crypto.randomBytes(16).toString("hex");

        certificateRecord = {
            id: certId,
            user_id: numUserId,
            feedback_id: numFeedbackId,
            certificate_number: certNumber,
            certificate_title: "CERTIFICATE OF PARTICIPATION",
            certificate_type: "Participation",
            college_name: "RAMCO INSTITUTE OF TECHNOLOGY",
            department: student_info.department || "Computer Science and Business Systems",
            student_name: student_info.full_name || "Student",
            register_number: student_info.register_number || "---",
            student_id: student_info.user_id || numUserId,
            student_year: student_info.year || 4,
            student_email: student_info.email || "---",
            event_name: event.event_name,
            event_code: event.event_code || "EVT",
            event_date: event.event_date,
            event_venue: event.event_venue || "Department Seminar Hall",
            coordinator: event.coordinator || "Faculty Coordinator",
            academic_year: event.academic_year || "2026-27",
            issue_date: issueDate,
            signatory_title: event.signatory_title || "Head of Department - CSBS",
            status: "Digitally Verified",
            qr_token: qrToken,
            created_at: new Date().toISOString()
        };
        data.certificates.unshift(certificateRecord);
    }

    data.feedback_submissions.unshift(submissionRecord);

    // Mark persistent notification as read for this student and event
    if (Array.isArray(data.notifications)) {
        data.notifications.forEach(n => {
            if (parseInt(n.event_id, 10) === numFeedbackId && String(n.student_id) === String(numUserId)) {
                n.status = "read";
                n.read_at = new Date().toISOString();
            }
        });
    }

    await commitData(data);

    return {
        success: true,
        submission: submissionRecord,
        certificate: certificateRecord,
        certificate_eligible: certificateEligible,
        quiz_score: quizScore,
        quiz_total: totalQuestions,
        quiz_pct: quizPct,
        alreadySubmitted: false
    };
}

// ============================================================
// ADMIN DIRECT CERTIFICATE ISSUANCE
// ============================================================

async function issueCertificateToStudent({
    student_identifier,
    event_id = null,
    event_name,
    event_code,
    event_date,
    event_venue,
    coordinator,
    signatory_title,
    academic_year,
    issue_date,
    status = "Digitally Verified"
}) {
    if (!student_identifier) {
        throw new Error("Student Identifier (ID, Register Number or Email) is required.");
    }
    if (!event_name && !event_id) {
        throw new Error("Event name or Event ID is required.");
    }

    const client = getClient();
    let studentUser = null;
    let studentProfile = null;

    // 1. Look up student in Supabase users
    if (client) {
        try {
            const rawId = String(student_identifier).trim();
            const { data: users } = await client
                .from("users")
                .select("*")
                .or(`id.eq.${isNaN(rawId) ? 0 : rawId},register_number.eq.${rawId},email.eq.${rawId}`);

            if (users && users.length > 0) {
                studentUser = users[0];
            }

            if (studentUser) {
                const { data: pData } = await client.from("student_profiles").select("*").eq("user_id", studentUser.id).maybeSingle();
                studentProfile = pData || null;
            }
        } catch (e) {
            console.warn("[issueCertificateToStudent] User lookup warning:", e.message);
        }
    }

    // If not found in users, check existing certificate records for student info
    const data = await getAllData();
    if (!studentUser) {
        const existingWithStudent = (data.certificates || []).find(c =>
            String(c.student_id) === String(student_identifier) ||
            String(c.register_number).toLowerCase() === String(student_identifier).toLowerCase() ||
            String(c.student_email).toLowerCase() === String(student_identifier).toLowerCase()
        );
        if (existingWithStudent) {
            studentUser = {
                id: existingWithStudent.user_id || existingWithStudent.student_id || Date.now(),
                full_name: existingWithStudent.student_name,
                register_number: existingWithStudent.register_number,
                email: existingWithStudent.student_email,
                department: existingWithStudent.department,
                year: existingWithStudent.student_year || 4
            };
        }
    }

    if (!studentUser) {
        throw new Error(`Student with identifier "${student_identifier}" was not found in institutional records.`);
    }

    // 2. Validate or find/create event
    let targetEvent = null;
    if (event_id) {
        targetEvent = (data.event_feedbacks || []).find(e => parseInt(e.id, 10) === parseInt(event_id, 10));
    }
    if (!targetEvent && event_name) {
        targetEvent = (data.event_feedbacks || []).find(e => (e.event_name || "").toLowerCase() === event_name.toLowerCase());
    }

    if (!targetEvent) {
        // Create an event record dynamically
        const newEvId = Date.now();
        let derivedCode = event_code ? String(event_code).trim().toUpperCase() : "";
        if (!derivedCode) {
            const words = String(event_name || "EVENT").trim().split(/\s+/);
            derivedCode = words.map(w => w[0]).join("").toUpperCase().slice(0, 5) || "EVT";
        }
        targetEvent = {
            id: newEvId,
            event_name: String(event_name).trim(),
            event_code: derivedCode,
            event_date: event_date || new Date().toISOString().split("T")[0],
            event_venue: event_venue || "Department Placement Lab",
            coordinator: coordinator || "Faculty Coordinator",
            academic_year: academic_year || "2026-27",
            target_type: "all",
            student_id: null,
            message: "Official Department Placement & Training Event",
            signatory_title: signatory_title || "Head of Department - CSBS",
            quiz: [],
            created_at: new Date().toISOString()
        };
        data.event_feedbacks.unshift(targetEvent);
    }

    // Check if certificate already exists for this student & event
    const existingCert = (data.certificates || []).find(c =>
        parseInt(c.feedback_id, 10) === parseInt(targetEvent.id, 10) &&
        (parseInt(c.user_id, 10) === parseInt(studentUser.id, 10) || String(c.register_number).toLowerCase() === String(studentUser.register_number).toLowerCase())
    );

    if (existingCert) {
        return {
            isNew: false,
            message: `Certificate ${existingCert.certificate_number} is already issued for this student & event.`,
            certificate: existingCert
        };
    }

    // 3. Generate unique certificate number
    const certYear = targetEvent.event_date ? new Date(targetEvent.event_date).getFullYear() : new Date().getFullYear();
    const certNumber = generateCertificateNumber(targetEvent.event_code || "EVT", certYear, data.certificates || []);
    const resolvedIssueDate = issue_date || new Date().toISOString().split("T")[0];
    const qrToken = crypto.randomBytes(16).toString("hex");

    const newCert = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        user_id: studentUser.id,
        feedback_id: targetEvent.id,
        certificate_number: certNumber,
        certificate_title: "CERTIFICATE OF PARTICIPATION",
        certificate_type: "Participation",
        college_name: "RAMCO INSTITUTE OF TECHNOLOGY",
        department: studentUser.department || (studentProfile && studentProfile.department) || "Computer Science and Business Systems",
        student_name: studentUser.full_name,
        register_number: studentUser.register_number || "---",
        student_id: studentUser.id,
        student_year: studentUser.year || 4,
        student_email: studentUser.email || "---",
        event_name: targetEvent.event_name,
        event_code: targetEvent.event_code || "EVT",
        event_date: targetEvent.event_date,
        event_venue: targetEvent.event_venue || "Department Seminar Hall",
        coordinator: targetEvent.coordinator || "Faculty Coordinator",
        academic_year: targetEvent.academic_year || "2026-27",
        issue_date: resolvedIssueDate,
        signatory_title: targetEvent.signatory_title || signatory_title || "Head of Department - CSBS",
        status: status || "Digitally Verified",
        qr_token: qrToken,
        created_at: new Date().toISOString()
    };

    // Also add a synthetic submission so completion status shows 100%
    const subRecord = {
        id: Date.now() + 2,
        feedback_id: targetEvent.id,
        user_id: studentUser.id,
        rating: 5,
        session_useful: "Yes",
        learnings: "Department training and practical completion",
        comments: "Direct institutional issuance",
        quiz_answers: {},
        quiz_score: 1,
        quiz_total: 1,
        quiz_passed: true,
        submitted_at: new Date().toISOString()
    };

    data.certificates.unshift(newCert);
    data.feedback_submissions.unshift(subRecord);
    await commitData(data);

    return {
        isNew: true,
        message: `Certificate ${certNumber} successfully issued to ${studentUser.full_name}!`,
        certificate: newCert
    };
}

async function getFeedbackSubmissionsForAdmin(feedbackId) {
    const numFeedbackId = parseInt(feedbackId, 10);
    const data = await getAllData();
    const allSubs = data.feedback_submissions || [];
    const allCerts = data.certificates || [];
    const allStudents = await getAllStudentUsers();
    const studentMap = new Map();
    allStudents.forEach(s => studentMap.set(String(s.id), s));

    const targetSubs = allSubs.filter(s => parseInt(s.feedback_id, 10) === numFeedbackId);
    const certMap = new Map();
    allCerts.forEach(c => {
        if (parseInt(c.feedback_id, 10) === numFeedbackId) {
            certMap.set(String(c.user_id), c);
        }
    });

    return targetSubs.map(s => {
        const c = certMap.get(String(s.user_id)) || {};
        const u = studentMap.get(String(s.user_id)) || {};
        const totalQ = s.quiz_total != null ? s.quiz_total : 0;
        const score = s.quiz_score != null ? s.quiz_score : 0;
        const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : (s.quiz_pct || 100);
        const hasCert = !!c.certificate_number;
        const isEligible = hasCert || s.certificate_eligible !== false;

        return {
            ...s,
            student_name: s.student_name || c.student_name || u.full_name || "Student",
            register_number: s.register_number || c.register_number || u.register_number || "---",
            department: s.department || c.department || u.department || "Computer Science and Business Systems",
            academic_year: s.academic_year || (u.year ? `Year ${u.year}` : "2023-2027"),
            submission_date: s.submitted_at,
            quiz_score_display: `${score} / ${totalQ}`,
            quiz_pct: pct,
            quiz_passed: s.quiz_passed !== false,
            feedback_status: "Completed",
            certificate_eligibility: isEligible ? "Eligible" : "Not Eligible",
            certificate_number: c.certificate_number || null,
            certificate: hasCert ? c : null
        };
    });
}

// ============================================================
// DYNAMIC CERTIFICATE / STUDENT VERIFICATION LOOKUP
// Search by Certificate Number, Register Number, or Student Name
// ============================================================

async function verifyAndGetCertificateDetails(searchInput) {
    if (!searchInput || !String(searchInput).trim()) {
        return { found: false, message: "Please enter a Certificate ID, Register Number, or Student Name." };
    }

    const rawInput = String(searchInput).trim();
    const query = rawInput.toLowerCase();
    const queryClean = query.replace(/[^a-z0-9]/g, "");

    const data = await getAllData();
    const allCerts = data.certificates || [];
    const allEvents = data.event_feedbacks || [];
    const allSubs = data.feedback_submissions || [];
    const client = getClient();

    // --------------------------------------------------------
    // CASE A: Search by Certificate Number or QR Token or Internal ID
    // --------------------------------------------------------
    const matchedCert = allCerts.find(c => {
        if (!c) return false;
        const cNum = (c.certificate_number || "").toLowerCase();
        const cNumClean = cNum.replace(/[^a-z0-9]/g, "");
        const qr = (c.qr_token || "").toLowerCase();
        return cNum === query || (queryClean.length >= 5 && cNumClean === queryClean) || qr === query || String(c.id) === query;
    });

    if (matchedCert) {
        // Retrieve full student details for this certificate
        const studentDetails = await resolveStudentDetails(matchedCert.user_id, matchedCert, client);
        const eventDetails = resolveEventDetails(matchedCert.feedback_id, matchedCert, allEvents);
        const history = buildStudentCertificateHistory(matchedCert.user_id, matchedCert.register_number, allCerts, allEvents, allSubs);

        return {
            found: true,
            search_type: "certificate",
            certificate: formatCertificateResponse(matchedCert),
            student: studentDetails,
            event: eventDetails,
            completion_status: {
                feedback_submitted: true,
                quiz_completed: true,
                quiz_score: "Completed",
                certificate_generated: true,
                status: matchedCert.status || "Digitally Verified"
            },
            history: history,
            certificates: [formatCertificateResponse(matchedCert)]
        };
    }

    // --------------------------------------------------------
    // CASE B: Search by Student Register Number
    // Must return ALL certificates issued to that student!
    // --------------------------------------------------------
    let matchedStudentUser = null;
    if (client) {
        try {
            const { data: users } = await client
                .from("users")
                .select("*")
                .eq("register_number", rawInput);
            if (users && users.length > 0) {
                matchedStudentUser = users[0];
            }
        } catch (e) {}
    }

    // Also find all certificates matching this register number
    const matchingCertsByReg = allCerts.filter(c => {
        if (!c || !c.register_number) return false;
        const reg = String(c.register_number).toLowerCase().replace(/[^a-z0-9]/g, "");
        return reg === queryClean;
    });

    if (matchedStudentUser || matchingCertsByReg.length > 0) {
        const studentUserId = matchedStudentUser ? matchedStudentUser.id : (matchingCertsByReg[0] ? matchingCertsByReg[0].user_id : null);
        const studentDetails = await resolveStudentDetails(studentUserId, matchingCertsByReg[0] || matchedStudentUser, client);
        if (matchedStudentUser) {
            studentDetails.name = matchedStudentUser.full_name || studentDetails.name;
            studentDetails.register_number = matchedStudentUser.register_number || studentDetails.register_number;
            studentDetails.email = matchedStudentUser.email || studentDetails.email;
        }

        // Gather all certificates for this student (both by user_id and register_number)
        const studentCerts = allCerts.filter(c => {
            if (!c) return false;
            if (studentUserId && String(c.user_id) === String(studentUserId)) return true;
            const reg = String(c.register_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return reg === queryClean;
        });

        const history = buildStudentCertificateHistory(studentUserId, studentDetails.register_number, allCerts, allEvents, allSubs);
        const primaryCert = studentCerts[0] || null;
        const primaryEvent = primaryCert ? resolveEventDetails(primaryCert.feedback_id, primaryCert, allEvents) : null;

        return {
            found: true,
            search_type: "student",
            total_certificates: studentCerts.length,
            student: studentDetails,
            certificates: studentCerts.map(formatCertificateResponse),
            certificate: primaryCert ? formatCertificateResponse(primaryCert) : null,
            event: primaryEvent,
            completion_status: {
                feedback_submitted: studentCerts.length > 0,
                quiz_completed: studentCerts.length > 0,
                quiz_score: "Completed",
                certificate_generated: studentCerts.length > 0,
                status: primaryCert ? (primaryCert.status || "Digitally Verified") : "No Certificates"
            },
            history: history
        };
    }

    // --------------------------------------------------------
    // CASE C: Search by Student Name or Email
    // --------------------------------------------------------
    let matchedUsersByName = [];
    if (client) {
        try {
            const { data: users } = await client
                .from("users")
                .select("*")
                .ilike("full_name", `%${rawInput}%`);
            if (users && users.length > 0) {
                matchedUsersByName = users;
            }
        } catch (e) {}
    }

    // Also search certificates matching student name
    const certsByName = allCerts.filter(c => {
        if (!c) return false;
        const name = (c.student_name || "").toLowerCase();
        const email = (c.student_email || "").toLowerCase();
        return name.includes(query) || (email && email === query);
    });

    // If matches found
    if (matchedUsersByName.length > 0 || certsByName.length > 0) {
        // Collect distinct students
        const studentMap = new Map();

        matchedUsersByName.forEach(u => {
            studentMap.set(String(u.id), {
                id: u.id,
                name: u.full_name,
                register_number: u.register_number || "---",
                email: u.email || "---",
                department: u.department || "Computer Science and Business Systems"
            });
        });

        certsByName.forEach(c => {
            const key = String(c.user_id || c.register_number);
            if (!studentMap.has(key)) {
                studentMap.set(key, {
                    id: c.user_id,
                    name: c.student_name,
                    register_number: c.register_number || "---",
                    email: c.student_email || "---",
                    department: c.department || "Computer Science and Business Systems"
                });
            }
        });

        const studentsList = Array.from(studentMap.values()).map(st => {
            const certs = allCerts.filter(c =>
                (c.user_id && String(c.user_id) === String(st.id)) ||
                (c.register_number && st.register_number && String(c.register_number).toLowerCase() === String(st.register_number).toLowerCase())
            );
            return {
                ...st,
                total_certificates: certs.length,
                certificates: certs.map(formatCertificateResponse)
            };
        });

        if (studentsList.length === 1) {
            // Single student matched
            const single = studentsList[0];
            const studentDetails = await resolveStudentDetails(single.id, single, client);
            const history = buildStudentCertificateHistory(single.id, single.register_number, allCerts, allEvents, allSubs);
            const primaryCert = single.certificates[0] || null;

            return {
                found: true,
                search_type: "student",
                total_certificates: single.certificates.length,
                student: studentDetails,
                certificates: single.certificates,
                certificate: primaryCert,
                event: primaryCert ? resolveEventDetails(primaryCert.feedback_id, primaryCert.raw, allEvents) : null,
                completion_status: {
                    feedback_submitted: single.certificates.length > 0,
                    quiz_completed: single.certificates.length > 0,
                    quiz_score: "Completed",
                    certificate_generated: single.certificates.length > 0,
                    status: primaryCert ? (primaryCert.status || "Digitally Verified") : "No Certificates"
                },
                history: history
            };
        } else {
            // Multiple students matched
            return {
                found: true,
                search_type: "student_list",
                query: rawInput,
                students: studentsList
            };
        }
    }

    // --------------------------------------------------------
    // CASE D: Not found
    // --------------------------------------------------------
    return {
        found: false,
        message: `No certificate or student record registered matching: "${rawInput}".`
    };
}

// Helper: resolve rich student and profile information from database
async function resolveStudentDetails(userId, fallbackSource = {}, client) {
    let studentDetails = {
        name: fallbackSource.student_name || fallbackSource.name || fallbackSource.full_name || "Student",
        register_number: fallbackSource.register_number || "---",
        student_id: userId || fallbackSource.student_id || fallbackSource.user_id || "---",
        department: fallbackSource.department || "Computer Science and Business Systems",
        year: fallbackSource.student_year || fallbackSource.year || 4,
        email: fallbackSource.student_email || fallbackSource.email || "---",
        cgpa: null,
        degree: "B.Tech",
        phone_number: null,
        profile_photo: null
    };

    if (client && userId) {
        try {
            const { data: uData } = await client.from("users").select("*").eq("id", userId).maybeSingle();
            if (uData) {
                studentDetails.name = uData.full_name || studentDetails.name;
                studentDetails.register_number = uData.register_number || studentDetails.register_number;
                studentDetails.student_id = uData.id;
                studentDetails.department = uData.department || studentDetails.department;
                studentDetails.year = uData.year || studentDetails.year;
                studentDetails.email = uData.email || studentDetails.email;
            }

            const { data: pData } = await client.from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
            if (pData) {
                studentDetails.cgpa = pData.cgpa !== null && pData.cgpa !== undefined ? pData.cgpa : null;
                studentDetails.degree = pData.degree || "B.Tech";
                studentDetails.phone_number = pData.phone_number || pData.whatsapp_number || null;
                studentDetails.profile_photo = pData.profile_photo || null;
            }
        } catch (e) {}
    }

    return studentDetails;
}

// Helper: resolve event details
function resolveEventDetails(feedbackId, certRecord = {}, allEvents = []) {
    const ev = (allEvents || []).find(e => parseInt(e.id, 10) === parseInt(feedbackId, 10)) || {};
    return {
        event_name: certRecord.event_name || ev.event_name || "Technical Workshop",
        event_code: certRecord.event_code || ev.event_code || "EVT",
        event_description: ev.message || "Institutional Placement & Technical Event",
        event_date: certRecord.event_date || ev.event_date || "---",
        event_venue: certRecord.event_venue || ev.event_venue || "Department Seminar Hall",
        coordinator: certRecord.coordinator || ev.coordinator || "Faculty Coordinator",
        academic_year: certRecord.academic_year || ev.academic_year || "2026-27"
    };
}

// Helper: build full event certificate history for student
function buildStudentCertificateHistory(userId, registerNumber, allCerts = [], allEvents = [], allSubs = []) {
    const studentCerts = allCerts.filter(c => {
        if (!c) return false;
        if (userId && String(c.user_id) === String(userId)) return true;
        if (registerNumber && c.register_number && String(c.register_number).toLowerCase() === String(registerNumber).toLowerCase()) return true;
        return false;
    });

    const subMap = new Map();
    (allSubs || []).forEach(s => {
        if (userId && String(s.user_id) === String(userId)) {
            subMap.set(parseInt(s.feedback_id, 10), s);
        }
    });

    return studentCerts.map(c => {
        const ev = allEvents.find(e => parseInt(e.id, 10) === parseInt(c.feedback_id, 10)) || {};
        const sub = subMap.get(parseInt(c.feedback_id, 10)) || {};
        return {
            event_name: c.event_name || ev.event_name || "Event",
            event_date: c.event_date || ev.event_date || "---",
            feedback_status: "Completed",
            quiz_status: sub.quiz_total > 0 ? `Completed (${sub.quiz_score}/${sub.quiz_total})` : "Completed",
            certificate_id: c.certificate_number,
            certificate: c
        };
    });
}

// Helper: format certificate response object
function formatCertificateResponse(cert) {
    if (!cert) return null;
    return {
        certificate_id: cert.certificate_number,
        certificate_number: cert.certificate_number,
        certificate_title: cert.certificate_title || "CERTIFICATE OF PARTICIPATION",
        certificate_type: cert.certificate_type || "Participation",
        event_name: cert.event_name,
        event_date: cert.event_date,
        issue_date: cert.issue_date,
        generated_date: cert.created_at || cert.issue_date,
        student_name: cert.student_name,
        register_number: cert.register_number,
        department: cert.department || "Computer Science and Business Systems",
        status: cert.status || "Digitally Verified",
        signatory_title: cert.signatory_title || "Head of Department - CSBS",
        college_name: cert.college_name || "RAMCO INSTITUTE OF TECHNOLOGY",
        raw: cert
    };
}

// ============================================================
// STUDENT NOTIFICATIONS (PERSISTENT & ROLE-BASED)
// ============================================================

async function getStudentNotifications(userId) {
    const data = await getAllData();
    const strUserId = String(userId).trim();
    const notifs = (data.notifications || []).filter(n => String(n.student_id).trim() === strUserId);
    notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const unreadCount = notifs.filter(n => n.status === "unread" || !n.read_at).length;
    return {
        notifications: notifs,
        unread_count: unreadCount
    };
}

async function markNotificationAsRead(notifId, userId) {
    const data = await getAllData();
    const strNotifId = String(notifId);
    const strUserId = String(userId);
    const notif = (data.notifications || []).find(n => String(n.id) === strNotifId && String(n.student_id) === strUserId);
    if (notif) {
        notif.status = "read";
        notif.read_at = new Date().toISOString();
        await commitData(data);
    }
    return true;
}

async function markAllNotificationsAsRead(userId) {
    const data = await getAllData();
    const strUserId = String(userId);
    let updated = false;
    (data.notifications || []).forEach(n => {
        if (String(n.student_id) === strUserId && (n.status === "unread" || !n.read_at)) {
            n.status = "read";
            n.read_at = new Date().toISOString();
            updated = true;
        }
    });
    if (updated) {
        await commitData(data);
    }
    return true;
}

// ============================================================
// YEAR-WISE & EVENT-WISE ANALYTICS
// ============================================================

async function getEventAnalyticsData() {
    const data = await getAllData();
    const allStudents = await getAllStudentUsers();
    const allEvents = data.event_feedbacks || [];
    const allSubs = data.feedback_submissions || [];
    const allCerts = data.certificates || [];

    // Group by academic year
    const yearStatsMap = new Map();
    const standardYears = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
    standardYears.forEach(y => {
        yearStatsMap.set(y, {
            academic_year: y,
            published_events: 0,
            submissions: 0,
            completed_forms: 0,
            certificates_issued: 0
        });
    });

    allEvents.forEach(ev => {
        const yr = ev.academic_year || "2026-27";
        if (!yearStatsMap.has(yr)) {
            yearStatsMap.set(yr, {
                academic_year: yr,
                published_events: 0,
                submissions: 0,
                completed_forms: 0,
                certificates_issued: 0
            });
        }
        const stat = yearStatsMap.get(yr);
        stat.published_events++;
    });

    allSubs.forEach(sub => {
        const ev = allEvents.find(e => parseInt(e.id, 10) === parseInt(sub.feedback_id, 10));
        const yr = (ev && ev.academic_year) || sub.academic_year || "2026-27";
        if (!yearStatsMap.has(yr)) {
            yearStatsMap.set(yr, {
                academic_year: yr,
                published_events: 0,
                submissions: 0,
                completed_forms: 0,
                certificates_issued: 0
            });
        }
        const stat = yearStatsMap.get(yr);
        stat.submissions++;
        stat.completed_forms++;
    });

    allCerts.forEach(cert => {
        const yr = cert.academic_year || "2026-27";
        if (yearStatsMap.has(yr)) {
            const stat = yearStatsMap.get(yr);
            stat.certificates_issued++;
        }
    });

    // Per-event enriched breakdown
    const eventBreakdown = allEvents.map(ev => {
        const eligible = filterEligibleStudents(allStudents, ev);
        const eligibleCount = eligible.length > 0 ? eligible.length : (allStudents.length > 0 ? allStudents.length : 14);
        const subs = allSubs.filter(s => parseInt(s.feedback_id, 10) === parseInt(ev.id, 10));
        const certs = allCerts.filter(c => parseInt(c.feedback_id, 10) === parseInt(ev.id, 10));
        const submittedCount = subs.length;
        const pendingCount = Math.max(0, eligibleCount - submittedCount);
        const completionRate = eligibleCount > 0 ? Number(((submittedCount / eligibleCount) * 100).toFixed(1)) : 0;

        let avgScore = 0;
        if (subs.length > 0) {
            const sumPct = subs.reduce((acc, s) => {
                const total = s.quiz_total || 1;
                const score = s.quiz_score || 0;
                return acc + ((score / total) * 100);
            }, 0);
            avgScore = Math.round(sumPct / subs.length);
        }

        return {
            id: ev.id,
            event_name: ev.event_name,
            event_code: ev.event_code,
            event_date: ev.event_date,
            academic_year: ev.academic_year,
            status: (ev.status || "ACTIVE").toUpperCase(),
            total_eligible: eligibleCount,
            submitted: submittedCount,
            pending: pendingCount,
            completion_rate: completionRate,
            avg_quiz_score: avgScore,
            certificates_eligible: certs.length,
            certificates_issued: certs.length
        };
    });

    return {
        yearly_trends: Array.from(yearStatsMap.values()),
        event_breakdown: eventBreakdown,
        total_events: allEvents.length,
        total_submissions: allSubs.length,
        total_certificates: allCerts.length
    };
}

// ============================================================
// STUDENT NOTIFICATIONS (PERSISTENT IN DB / STORAGE)
// ============================================================

async function getStudentNotifications(userId) {
    const numUserId = parseInt(userId, 10);
    const data = await getAllData();
    const notifs = data.notifications || [];
    return notifs.filter(n => parseInt(n.student_id, 10) === numUserId);
}

async function markNotificationAsRead(notifId, userId) {
    const data = await getAllData();
    const notifs = data.notifications || [];
    let updated = false;
    notifs.forEach(n => {
        if (String(n.id) === String(notifId) && String(n.student_id) === String(userId)) {
            n.read_at = new Date().toISOString();
            n.status = "READ";
            updated = true;
        }
    });
    if (updated) {
        await commitData(data);
    }
    return { success: true };
}

async function markAllNotificationsAsRead(userId) {
    const numUserId = parseInt(userId, 10);
    const data = await getAllData();
    const notifs = data.notifications || [];
    let updated = false;
    notifs.forEach(n => {
        if (parseInt(n.student_id, 10) === numUserId && !n.read_at) {
            n.read_at = new Date().toISOString();
            n.status = "READ";
            updated = true;
        }
    });
    if (updated) {
        await commitData(data);
    }
    return { success: true };
}

module.exports = {
    createEventFeedback,
    getAllEventFeedbacks,
    getAllSubmissions,
    deleteEventFeedback,
    updateEventFeedbackStatus,
    getEventFeedbacksWithStats,
    getStudentNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getEventAnalyticsData,
    getStudentEventFeedbacks,
    getStudentCertificates,
    submitFeedbackAndGenerateCertificate,
    issueCertificateToStudent,
    getFeedbackSubmissionsForAdmin,
    generateCertificateNumber,
    verifyAndGetCertificateDetails,
    getAllCertificates,
    getAllStudentUsers,
    filterEligibleStudents
};
