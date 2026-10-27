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
    notifications: [],
    deleted_event_ids: [],
    deleted_certificate_numbers: [],
    deleted_batch_ids: [],
    certificate_batches: [],
    certificate_audit_logs: [],
    certificate_templates: []
};

// Initial verified RIT STTP & Workshop templates
const INITIAL_TEMPLATES = [
    {
        id: "tpl_sttp_blockchain_2026",
        is_default: true,
        template_title: "STTP — Emerging Blockchain Technologies (Reference Standard)",
        certificate_title: "CERTIFICATE OF PARTICIPATION",
        certificate_type: "Participation",
        programme_title: "One Week Short-Term Training Programme (STTP)",
        event_name: "Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives",
        department: "Department of Computer Science and Business Systems",
        college_name: "Ramco Institute of Technology, Rajapalayam",
        programme_dates: "October 12, 2026, to October 18, 2026",
        issue_date: "18 October 2026",
        certificate_wording: "for active and enthusiastic participation in the One Week Short-Term Training Programme (STTP) on “Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives”, organized by the Department of Computer Science and Business Systems at Ramco Institute of Technology, Rajapalayam from October 12, 2026, to October 18, 2026.",
        signatory_count: 6,
        signatory_1_name: "Dr. M. Jeya Sundari",
        signatory_1_title: "Faculty Coordinator",
        signatory_1_org: "CSBS, RIT",
        signatory_2_name: "M. Rekha",
        signatory_2_title: "Faculty Coordinator",
        signatory_2_org: "CSBS, RIT",
        signatory_3_name: "M. Ramakrishnan",
        signatory_3_title: "Faculty Coordinator",
        signatory_3_org: "CSBS, RIT",
        signatory_4_name: "Dr. D. Kesavaraja",
        signatory_4_title: "Convenor",
        signatory_4_org: "CSBS, RIT",
        signatory_5_name: "Dr. S. Rajakarunakaran",
        signatory_5_title: "Patron",
        signatory_5_org: "RIT",
        signatory_6_name: "Dr. L. Ganesan",
        signatory_6_title: "Chief Patron",
        signatory_6_org: "RIT",
        template_style: "rit_purple_gold",
        id_prefix: "RIT-STTP-2026-"
    },
    {
        id: "tpl_workshop_fullstack",
        is_default: false,
        template_title: "Workshop — Full Stack Cloud Architecture Masterclass",
        certificate_title: "CERTIFICATE OF PARTICIPATION",
        certificate_type: "Participation",
        programme_title: "Value Added Training Programme",
        event_name: "Full Stack Cloud Architecture & Scalability Masterclass",
        department: "Department of Computer Science and Business Systems (CSBS)",
        college_name: "Ramco Institute of Technology",
        programme_dates: "22 October 2026",
        issue_date: "22 October 2026",
        certificate_wording: "This certificate is proudly presented to [STUDENT NAME] in recognition of active participation in the Full Stack Cloud Architecture & Scalability Masterclass, organized by the Department of Computer Science and Business Systems, Ramco Institute of Technology.",
        signatory_count: 3,
        signatory_1_name: "Dr. D. Kesavaraja",
        signatory_1_title: "Head of Department (HOD)",
        signatory_1_org: "CSBS, RIT",
        signatory_2_name: "Dr. S. Rajakarunakarun",
        signatory_2_title: "Vice Principal / Patron",
        signatory_2_org: "RIT",
        signatory_3_name: "Dr. L. Ganesan",
        signatory_3_title: "Principal / Chief Patron",
        signatory_3_org: "RIT",
        template_style: "rit_purple_gold",
        id_prefix: "RIT-CSBS-2026-"
    }
];

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
                if (!Array.isArray(parsed.deleted_event_ids)) parsed.deleted_event_ids = [];
                if (!Array.isArray(parsed.deleted_certificate_numbers)) parsed.deleted_certificate_numbers = [];
                if (!Array.isArray(parsed.deleted_batch_ids)) parsed.deleted_batch_ids = [];
                if (!Array.isArray(parsed.certificate_batches)) parsed.certificate_batches = [];
                if (!Array.isArray(parsed.certificate_audit_logs)) parsed.certificate_audit_logs = [];
                if (!Array.isArray(parsed.certificate_templates)) parsed.certificate_templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
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
                if (!Array.isArray(parsed.deleted_event_ids)) parsed.deleted_event_ids = [];
                if (!Array.isArray(parsed.deleted_certificate_numbers)) parsed.deleted_certificate_numbers = [];
                if (!Array.isArray(parsed.deleted_batch_ids)) parsed.deleted_batch_ids = [];
                if (!Array.isArray(parsed.certificate_batches)) parsed.certificate_batches = [];
                if (!Array.isArray(parsed.certificate_audit_logs)) parsed.certificate_audit_logs = [];
                if (!Array.isArray(parsed.certificate_templates)) parsed.certificate_templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
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
async function syncFromSupabaseTables(merged, deletedIdsSet = new Set()) {
    const client = getClient();
    if (!client) return merged;

    try {
        const { data: dbCerts, error: certErr } = await client.from("certificates").select("*");
        if (!certErr && Array.isArray(dbCerts) && dbCerts.length > 0) {
            const certMap = new Map((merged.certificates || []).map(c => [String(c.certificate_number || c.id), c]));
            dbCerts.forEach(c => {
                if (!deletedIdsSet.has(String(c.feedback_id))) {
                    certMap.set(String(c.certificate_number || c.id), c);
                }
            });
            merged.certificates = Array.from(certMap.values());
        }
    } catch (e) {}

    try {
        const { data: dbEvents, error: evErr } = await client.from("event_feedbacks").select("*");
        if (!evErr && Array.isArray(dbEvents) && dbEvents.length > 0) {
            const evMap = new Map((merged.event_feedbacks || []).map(ev => [String(ev.id), ev]));
            dbEvents.forEach(ev => {
                if (!deletedIdsSet.has(String(ev.id))) {
                    evMap.set(String(ev.id), ev);
                }
            });
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

    // Collect all deleted IDs across sources to permanently prevent resurrected events, certificates, and batches
    const deletedIdsSet = new Set([
        ...(base.deleted_event_ids || []),
        ...(cloudData?.deleted_event_ids || [])
    ].map(String));

    const deletedCertNumbersSet = new Set([
        ...(base.deleted_certificate_numbers || []),
        ...(cloudData?.deleted_certificate_numbers || [])
    ].map(s => String(s).trim().toUpperCase()));

    const deletedBatchIdsSet = new Set([
        ...(base.deleted_batch_ids || []),
        ...(cloudData?.deleted_batch_ids || [])
    ].map(s => String(s).trim()));

    if (cloudData && Array.isArray(cloudData.certificates)) {
        // Merge records (cloud + local) while respecting deletions
        const certMap = new Map((base.certificates || []).map(c => [String(c.certificate_number || c.id), c]));
        (cloudData.certificates || []).forEach(c => certMap.set(String(c.certificate_number || c.id), c));

        const evMap = new Map((base.event_feedbacks || []).map(e => [String(e.id), e]));
        (cloudData.event_feedbacks || []).forEach(e => evMap.set(String(e.id), e));

        const subMap = new Map((base.feedback_submissions || []).map(s => [String(s.id), s]));
        (cloudData.feedback_submissions || []).forEach(s => subMap.set(String(s.id), s));

        const notifMap = new Map((base.notifications || []).map(n => [String(n.id), n]));
        (cloudData.notifications || []).forEach(n => notifMap.set(String(n.id), n));

        const batchMap = new Map((base.certificate_batches || []).map(b => [String(b.id), b]));
        (cloudData.certificate_batches || []).forEach(b => batchMap.set(String(b.id), b));

        const auditMap = new Map((base.certificate_audit_logs || []).map(a => [String(a.id || (a.created_at + a.certificate_number)), a]));
        (cloudData.certificate_audit_logs || []).forEach(a => auditMap.set(String(a.id || (a.created_at + a.certificate_number)), a));

        base = {
            event_feedbacks: Array.from(evMap.values()).filter(e => !deletedIdsSet.has(String(e.id))),
            feedback_submissions: Array.from(subMap.values()).filter(s => !deletedIdsSet.has(String(s.feedback_id))),
            certificates: Array.from(certMap.values()).filter(c => {
                if (c.feedback_id && deletedIdsSet.has(String(c.feedback_id))) return false;
                if (c.certificate_number && deletedCertNumbersSet.has(String(c.certificate_number).trim().toUpperCase())) return false;
                if (c.batch_id && deletedBatchIdsSet.has(String(c.batch_id).trim())) return false;
                return true;
            }),
            notifications: Array.from(notifMap.values()).filter(n => !deletedIdsSet.has(String(n.event_id))),
            deleted_event_ids: Array.from(deletedIdsSet),
            deleted_certificate_numbers: Array.from(deletedCertNumbersSet),
            deleted_batch_ids: Array.from(deletedBatchIdsSet),
            certificate_batches: Array.from(batchMap.values()).filter(b => !deletedBatchIdsSet.has(String(b.id).trim())),
            certificate_audit_logs: Array.from(auditMap.values())
        };
    } else {
        base.event_feedbacks = (base.event_feedbacks || []).filter(e => !deletedIdsSet.has(String(e.id)));
        base.feedback_submissions = (base.feedback_submissions || []).filter(s => !deletedIdsSet.has(String(s.feedback_id)));
        base.certificates = (base.certificates || []).filter(c => {
            if (c.feedback_id && deletedIdsSet.has(String(c.feedback_id))) return false;
            if (c.certificate_number && deletedCertNumbersSet.has(String(c.certificate_number).trim().toUpperCase())) return false;
            if (c.batch_id && deletedBatchIdsSet.has(String(c.batch_id).trim())) return false;
            return true;
        });
        base.notifications = (base.notifications || []).filter(n => !deletedIdsSet.has(String(n.event_id)));
        base.deleted_event_ids = Array.from(deletedIdsSet);
        base.deleted_certificate_numbers = Array.from(deletedCertNumbersSet);
        base.deleted_batch_ids = Array.from(deletedBatchIdsSet);
        base.certificate_batches = (base.certificate_batches || []).filter(b => !deletedBatchIdsSet.has(String(b.id).trim()));
        if (!Array.isArray(base.certificate_audit_logs)) base.certificate_audit_logs = [];
    }

    // Merge Supabase PostgreSQL tables if accessible
    base = await syncFromSupabaseTables(base, deletedIdsSet);

    // Final scrub to guarantee no deleted items slipped in
    base.certificates = (base.certificates || []).filter(c => {
        if (c.feedback_id && deletedIdsSet.has(String(c.feedback_id))) return false;
        if (c.certificate_number && deletedCertNumbersSet.has(String(c.certificate_number).trim().toUpperCase())) return false;
        if (c.batch_id && deletedBatchIdsSet.has(String(c.batch_id).trim())) return false;
        return true;
    });
    base.certificate_batches = (base.certificate_batches || []).filter(b => !deletedBatchIdsSet.has(String(b.id).trim()));
    if (deletedIdsSet.size > 0) {
        base.event_feedbacks = (base.event_feedbacks || []).filter(e => !deletedIdsSet.has(String(e.id)));
        base.feedback_submissions = (base.feedback_submissions || []).filter(s => !deletedIdsSet.has(String(s.feedback_id)));
        base.notifications = (base.notifications || []).filter(n => !deletedIdsSet.has(String(n.event_id)));
    }

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
            if (data.certificate_batches && data.certificate_batches.length > 0) {
                await client.from("certificate_batches").upsert(data.certificate_batches, { onConflict: "id" });
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
    if (Array.isArray(data.deleted_event_ids)) {
        data.deleted_event_ids = data.deleted_event_ids.filter(d => String(d) !== String(newId));
    }
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
    const strId = String(id).trim();
    const numId = parseInt(id, 10);
    const client = getClient();

    // 1. Permanently delete from Supabase PostgreSQL tables if they exist
    if (client) {
        try {
            await client.from("feedback_submissions").delete().or(`feedback_id.eq.${numId},feedback_id.eq.${strId}`);
        } catch (e) {}
        try {
            await client.from("certificates").delete().or(`feedback_id.eq.${numId},feedback_id.eq.${strId}`);
        } catch (e) {}
        try {
            await client.from("notifications").delete().or(`event_id.eq.${numId},event_id.eq.${strId}`);
        } catch (e) {}
        try {
            await client.from("event_feedbacks").delete().or(`id.eq.${numId},id.eq.${strId}`);
        } catch (e) {}
    }

    // 2. Load latest master state
    const data = await getAllData();

    // 3. Register in permanent deleted list to avoid any resurrecting from cache or cloud
    if (!Array.isArray(data.deleted_event_ids)) {
        data.deleted_event_ids = [];
    }
    if (!data.deleted_event_ids.includes(strId)) {
        data.deleted_event_ids.push(strId);
    }
    if (!isNaN(numId) && !data.deleted_event_ids.includes(numId)) {
        data.deleted_event_ids.push(numId);
    }

    // 4. Filter memory/local state
    data.event_feedbacks = (data.event_feedbacks || []).filter(item => 
        String(item.id) !== strId && (!isNaN(numId) ? parseInt(item.id, 10) !== numId : true)
    );
    data.feedback_submissions = (data.feedback_submissions || []).filter(item => 
        String(item.feedback_id) !== strId && (!isNaN(numId) ? parseInt(item.feedback_id, 10) !== numId : true)
    );
    data.certificates = (data.certificates || []).filter(item => 
        String(item.feedback_id) !== strId && (!isNaN(numId) ? parseInt(item.feedback_id, 10) !== numId : true)
    );
    if (Array.isArray(data.notifications)) {
        data.notifications = data.notifications.filter(n => 
            String(n.event_id) !== strId && (!isNaN(numId) ? parseInt(n.event_id, 10) !== numId : true)
        );
    }

    inMemoryData = data;
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

// ============================================================
// ROLE-BASED STUDENT CERTIFICATE RECORDS & TRACKING
// ============================================================

function inferEventCategory(eventName, message) {
    const text = `${eventName || ""} ${message || ""}`.toLowerCase();
    if (text.match(/placement|interview|aptitude|coding|drives|tcs|training/)) return "Placement Training";
    if (text.match(/workshop|hands-on|cloud|aws|devops|ai|ml|data science|iot|cyber/)) return "Technical Workshop";
    if (text.match(/symposium|quiz|hackathon|contest|competition|challenge/)) return "Symposium & Quiz";
    if (text.match(/webinar|guest lecture|seminar|keynote|talk/)) return "Webinar / Guest Lecture";
    if (text.match(/cert|nptel|coursera|oracle|cisco|industrial/)) return "Industrial Certification";
    return "Placement Training";
}

async function getStudentCertificateRecords({ category, academic_year, event_id, event_name, search, status, coordinator } = {}) {
    const data = await getAllData();
    const allStudents = await getAllStudentUsers();
    const allEvents = data.event_feedbacks || [];
    const allCerts = data.certificates || [];
    const allSubs = data.feedback_submissions || [];

    const yearLabelMap = {
        1: "1st Year (2026-2030)",
        2: "2nd Year (2025-2029)",
        3: "3rd Year (2024-2028)",
        4: "4th Year (2023-2027)",
        5: "Passed Out (2022-2026)"
    };

    const records = [];
    const recordKeySet = new Set();

    // 1. Cross-reference events and students
    allEvents.forEach(ev => {
        const evCat = ev.category || inferEventCategory(ev.event_name, ev.message);
        const evYear = ev.academic_year || "2026-27";

        const eligible = filterEligibleStudents(allStudents, ev);
        const targetStudents = (eligible && eligible.length > 0) ? eligible : allStudents;

        targetStudents.forEach(stu => {
            const key = `ev_${ev.id}_stu_${stu.id}`;
            recordKeySet.add(key);

            // Check feedback submission
            const sub = allSubs.find(s => 
                (parseInt(s.feedback_id, 10) === parseInt(ev.id, 10)) &&
                (String(s.user_id) === String(stu.id) || (stu.register_number && String(s.register_number).trim() === String(stu.register_number).trim()))
            );

            // Check certificate
            const cert = allCerts.find(c => 
                (parseInt(c.feedback_id, 10) === parseInt(ev.id, 10) || (c.event_name && c.event_name.toLowerCase() === ev.event_name.toLowerCase())) &&
                (String(c.user_id) === String(stu.id) || (stu.register_number && String(c.register_number).trim() === String(stu.register_number).trim()))
            );

            const stuYearLabel = yearLabelMap[stu.year] || evYear;

            records.push({
                id: key,
                student: {
                    id: stu.id,
                    name: stu.full_name || stu.name || "Student",
                    register_number: stu.register_number || "—",
                    department: stu.department || "Computer Science and Business Systems",
                    year: stu.year || 4,
                    academic_year: stuYearLabel,
                    year_label: stuYearLabel,
                    email: stu.email || ""
                },
                event: {
                    id: ev.id,
                    event_name: ev.event_name,
                    event_code: ev.event_code || "EVT",
                    event_date: ev.event_date || "—",
                    event_venue: ev.event_venue || "Department Placement Lab / Online",
                    category: evCat,
                    academic_year: evYear,
                    coordinator: ev.coordinator || "Faculty Coordinator",
                    signatory_title: ev.signatory_title || "Head of Department - CSBS"
                },
                feedback: {
                    submitted: !!sub,
                    has_submission: !!sub,
                    submission_status: sub ? "Submitted" : "No feedback submission was recorded",
                    submitted_at: sub ? sub.submitted_at : null,
                    quiz_score: sub ? `${sub.quiz_score || 0}/${sub.quiz_total || 0}` : null,
                    quiz_pct: sub ? sub.quiz_pct : null,
                    quiz_passed: sub ? !!sub.quiz_passed : false,
                    rating: sub ? sub.rating : null
                },
                certificate: {
                    generated: !!cert,
                    is_generated: !!cert,
                    generation_status: cert ? "Generated" : "Not Generated",
                    certificate_number: cert ? (cert.certificate_number || `RIT-${cert.id}`) : null,
                    certificate_id: cert ? cert.id : null,
                    issue_date: cert ? (cert.issue_date || cert.created_at) : null,
                    status: cert ? (cert.status || "Digitally Verified") : "Pending",
                    certificate_details: cert ? formatCertificateResponse(cert) : null
                }
            });
        });
    });

    // 2. Standalone direct certificates
    allCerts.forEach(cert => {
        const certStuId = cert.user_id || cert.student_id;
        const certReg = cert.register_number;
        const certEvId = cert.feedback_id || 0;
        const key = `ev_${certEvId}_stu_${certStuId}`;

        if (!recordKeySet.has(key)) {
            recordKeySet.add(key);
            const stuObj = allStudents.find(s => String(s.id) === String(certStuId) || (certReg && s.register_number === certReg)) || {};
            const evYear = cert.academic_year || "2026-27";
            const stuYearLabel = yearLabelMap[stuObj.year] || evYear;

            records.push({
                id: `cert_standalone_${cert.id}`,
                student: {
                    id: certStuId || 0,
                    name: cert.student_name || stuObj.full_name || "Student",
                    register_number: cert.register_number || stuObj.register_number || "—",
                    department: cert.department || stuObj.department || "Computer Science and Business Systems",
                    year: cert.student_year || stuObj.year || 4,
                    academic_year: stuYearLabel,
                    year_label: stuYearLabel,
                    email: cert.student_email || stuObj.email || ""
                },
                event: {
                    id: cert.feedback_id || `direct_${cert.id}`,
                    event_name: cert.event_name || "Direct Certification",
                    event_code: cert.event_code || "DIR",
                    event_date: cert.event_date || cert.issue_date || "—",
                    event_venue: cert.event_venue || "Department Placement Lab / Online",
                    category: cert.category || inferEventCategory(cert.event_name, ""),
                    academic_year: evYear,
                    coordinator: cert.coordinator || "Faculty Coordinator",
                    signatory_title: cert.signatory_title || "Head of Department - CSBS"
                },
                feedback: {
                    submitted: true,
                    has_submission: true,
                    submission_status: "Direct Issuance / Certified",
                    submitted_at: cert.issue_date || cert.created_at,
                    quiz_score: "Exempted / Direct",
                    quiz_pct: 100,
                    quiz_passed: true,
                    rating: 5
                },
                certificate: {
                    generated: true,
                    is_generated: true,
                    generation_status: "Generated",
                    certificate_number: cert.certificate_number || `RIT-${cert.id}`,
                    certificate_id: cert.id,
                    issue_date: cert.issue_date || cert.created_at,
                    status: cert.status || "Digitally Verified",
                    certificate_details: formatCertificateResponse(cert)
                }
            });
        }
    });

    // 3. Filters
    let filtered = records;

    if (event_id && event_id !== "all") {
        const eidStr = String(event_id).trim().toLowerCase();
        filtered = filtered.filter(r => 
            String(r.event.id).toLowerCase().trim() === eidStr ||
            (r.event.event_name && r.event.event_name.toLowerCase().trim() === eidStr)
        );
    }

    if (event_name && event_name !== "all") {
        const enStr = event_name.trim().toLowerCase();
        filtered = filtered.filter(r => r.event.event_name && r.event.event_name.toLowerCase().trim() === enStr);
    }

    if (category && category !== "all") {
        const catNorm = category.toLowerCase().trim();
        filtered = filtered.filter(r => r.event.category.toLowerCase().trim() === catNorm);
    }

    if (academic_year && academic_year !== "all") {
        const yrNorm = academic_year.toLowerCase().trim();
        filtered = filtered.filter(r => 
            r.event.academic_year.toLowerCase().includes(yrNorm) || 
            r.student.year_label.toLowerCase().includes(yrNorm) ||
            String(r.student.year) === yrNorm
        );
    }

    if (status && status !== "all") {
        if (status === "generated") {
            filtered = filtered.filter(r => r.certificate.generated === true);
        } else if (status === "not_generated") {
            filtered = filtered.filter(r => r.certificate.generated === false);
        } else if (status === "submitted") {
            filtered = filtered.filter(r => r.feedback.submitted === true);
        } else if (status === "no_feedback") {
            filtered = filtered.filter(r => r.feedback.submitted === false);
        }
    }

    if (coordinator && coordinator !== "all") {
        const coordNorm = coordinator.toLowerCase().trim();
        filtered = filtered.filter(r => r.event.coordinator && r.event.coordinator.toLowerCase().includes(coordNorm));
    }

    if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(r => 
            (r.student.name && r.student.name.toLowerCase().includes(q)) ||
            (r.student.register_number && r.student.register_number.toLowerCase().includes(q)) ||
            (r.event.event_name && r.event.event_name.toLowerCase().includes(q)) ||
            (r.certificate.certificate_number && r.certificate.certificate_number.toLowerCase().includes(q)) ||
            (r.event.category && r.event.category.toLowerCase().includes(q))
        );
    }

    // 4. Summary metrics
    const totalRecords = filtered.length;
    const certsGenerated = filtered.filter(r => r.certificate.generated).length;
    const certsPending = totalRecords - certsGenerated;
    const feedbackSubmitted = filtered.filter(r => r.feedback.submitted).length;
    const noFeedbackRecorded = totalRecords - feedbackSubmitted;

    const distinctCategories = Array.from(new Set(records.map(r => r.event.category))).filter(Boolean);
    const distinctYears = Array.from(new Set(records.map(r => r.student.year_label))).filter(Boolean);

    // Extract all distinct events for filter dropdown
    const distinctEventsMap = new Map();
    records.forEach(r => {
        const ev = r.event;
        if (ev && (ev.id || ev.event_name)) {
            const k = String(ev.id || ev.event_name);
            if (!distinctEventsMap.has(k)) {
                distinctEventsMap.set(k, {
                    id: ev.id,
                    event_name: ev.event_name,
                    event_code: ev.event_code || "EVT",
                    event_date: ev.event_date || "—",
                    event_venue: ev.event_venue || "Department Placement Lab / Online",
                    category: ev.category || "General",
                    academic_year: ev.academic_year || "2026-27",
                    coordinator: ev.coordinator || "Faculty Coordinator"
                });
            }
        }
    });
    const distinctEvents = Array.from(distinctEventsMap.values());

    // 5. Group by Academic Year
    const groupedByYear = {};
    filtered.forEach(r => {
        const yr = r.student.year_label || r.event.academic_year || "General";
        if (!groupedByYear[yr]) {
            groupedByYear[yr] = {
                group_type: "year",
                academic_year: yr,
                total_records: 0,
                certificates_generated: 0,
                certificates_pending: 0,
                feedback_submitted: 0,
                no_feedback_recorded: 0,
                students: new Set(),
                records: []
            };
        }
        groupedByYear[yr].total_records++;
        if (r.certificate.generated) groupedByYear[yr].certificates_generated++;
        else groupedByYear[yr].certificates_pending++;
        if (r.feedback.submitted) groupedByYear[yr].feedback_submitted++;
        else groupedByYear[yr].no_feedback_recorded++;
        groupedByYear[yr].students.add(r.student.register_number || r.student.id);
        groupedByYear[yr].records.push(r);
    });

    Object.keys(groupedByYear).forEach(k => {
        groupedByYear[k].students_count = groupedByYear[k].students.size;
        delete groupedByYear[k].students;
    });

    // 6. Group by Event (Event-wise)
    const groupedByEvent = {};
    filtered.forEach(r => {
        const evKey = String(r.event.id || r.event.event_name || "general");
        if (!groupedByEvent[evKey]) {
            groupedByEvent[evKey] = {
                group_type: "event",
                event_id: r.event.id,
                event_name: r.event.event_name,
                event_code: r.event.event_code,
                event_date: r.event.event_date,
                event_venue: r.event.event_venue,
                category: r.event.category,
                coordinator: r.event.coordinator,
                academic_year: r.event.academic_year,
                signatory_title: r.event.signatory_title,
                total_records: 0,
                certificates_generated: 0,
                certificates_pending: 0,
                feedback_submitted: 0,
                no_feedback_recorded: 0,
                students: new Set(),
                records: []
            };
        }
        groupedByEvent[evKey].total_records++;
        if (r.certificate.generated) groupedByEvent[evKey].certificates_generated++;
        else groupedByEvent[evKey].certificates_pending++;
        if (r.feedback.submitted) groupedByEvent[evKey].feedback_submitted++;
        else groupedByEvent[evKey].no_feedback_recorded++;
        groupedByEvent[evKey].students.add(r.student.register_number || r.student.id);
        groupedByEvent[evKey].records.push(r);
    });

    Object.keys(groupedByEvent).forEach(k => {
        groupedByEvent[k].students_count = groupedByEvent[k].students.size;
        delete groupedByEvent[k].students;
    });

    return {
        summary: {
            total_records: totalRecords,
            certificates_generated: certsGenerated,
            certificates_pending: certsPending,
            feedback_submitted: feedbackSubmitted,
            no_feedback_recorded: noFeedbackRecorded,
            categories: distinctCategories,
            academic_years: distinctYears,
            events: distinctEvents
        },
        records: filtered,
        grouped_by_year: groupedByYear,
        grouped_by_event: groupedByEvent
    };
}

async function updateCertificateDetails(certId, updateData) {
    const data = await getAllData();
    const certs = data.certificates || [];
    const cert = certs.find(c => String(c.id) === String(certId) || String(c.certificate_number) === String(certId));
    if (!cert) {
        throw new Error("Certificate record not found.");
    }

    if (updateData.student_name) cert.student_name = updateData.student_name.trim();
    if (updateData.register_number) cert.register_number = updateData.register_number.trim();
    if (updateData.event_name) cert.event_name = updateData.event_name.trim();
    if (updateData.certificate_title) cert.certificate_title = updateData.certificate_title.trim();
    if (updateData.certificate_type) cert.certificate_type = updateData.certificate_type.trim();
    if (updateData.signatory_title) cert.signatory_title = updateData.signatory_title.trim();
    if (updateData.coordinator) cert.coordinator = updateData.coordinator.trim();
    if (updateData.issue_date) cert.issue_date = updateData.issue_date;
    if (updateData.status) cert.status = updateData.status;
    if (updateData.academic_year) cert.academic_year = updateData.academic_year;

    cert.updated_at = new Date().toISOString();
    await commitData(data);

    const client = getClient();
    if (client) {
        try {
            await client.from("certificates").update({
                student_name: cert.student_name,
                register_number: cert.register_number,
                event_name: cert.event_name,
                certificate_title: cert.certificate_title,
                issue_date: cert.issue_date,
                status: cert.status,
                updated_at: cert.updated_at
            }).or(`id.eq.${cert.id},certificate_number.eq.${cert.certificate_number}`);
        } catch (e) {}
    }

    return cert;
}

async function updateEventFeedbackDetails(eventId, updateData) {
    const data = await getAllData();
    const events = data.event_feedbacks || [];
    const ev = events.find(e => String(e.id) === String(eventId));
    if (!ev) {
        throw new Error("Event feedback not found.");
    }

    if (updateData.event_name) ev.event_name = updateData.event_name.trim();
    if (updateData.event_code) ev.event_code = updateData.event_code.trim().toUpperCase();
    if (updateData.event_date) ev.event_date = updateData.event_date;
    if (updateData.event_venue) ev.event_venue = updateData.event_venue.trim();
    if (updateData.coordinator) ev.coordinator = updateData.coordinator.trim();
    if (updateData.academic_year) ev.academic_year = updateData.academic_year;
    if (updateData.category) ev.category = updateData.category;
    if (updateData.signatory_title) ev.signatory_title = updateData.signatory_title.trim();
    if (updateData.message) ev.message = updateData.message.trim();
    if (updateData.quiz && Array.isArray(updateData.quiz)) ev.quiz = updateData.quiz;
    if (updateData.min_quiz_score_pct !== undefined) ev.min_quiz_score_pct = updateData.min_quiz_score_pct;

    ev.updated_at = new Date().toISOString();
    await commitData(data);

    return ev;
}

// ============================================================
// UNIQUE CERTIFICATE ID GENERATOR (CRYPTOGRAPHIC & COLLISION RESISTANT)
// Format: RIT-[DEPT]-[YEAR]-[TOKEN] e.g. RIT-CSBS-2026-A83F192C
// ============================================================
function generateUniqueCertificateId(year, departmentCode = "CSBS", existingCerts = []) {
    const y = year || new Date().getFullYear();
    const dept = (departmentCode || "CSBS").toUpperCase().replace(/[^A-Z0-9]/g, "") || "CSBS";
    const prefix = `RIT-${dept}-${y}-`;
    const existingIds = new Set((existingCerts || []).map(c => (c && c.certificate_number ? c.certificate_number.toUpperCase() : "")));

    for (let attempt = 0; attempt < 100; attempt++) {
        const token = crypto.randomBytes(4).toString("hex").toUpperCase();
        const candidate = `${prefix}${token}`;
        if (!existingIds.has(candidate)) {
            existingIds.add(candidate);
            return candidate;
        }
    }
    return `${prefix}${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function parseDateString(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split("T")[0];
    }
    const str = String(val).trim();
    if (!str) return null;
    
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        const d = new Date(year, month, day);
        if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    // Try standard ISO
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
    }
    return null;
}

// ============================================================
// SPREADSHEET BATCH RECORD VALIDATOR & DUPLICATE DETECTOR
// ============================================================
// Helper: Student identity normalizer for collision-free duplicate detection
function normalizeStudentIdentity(name, regNo, dept) {
    const cleanReg = String(regNo || "").trim().toLowerCase();
    const cleanDept = String(dept || "").trim().toLowerCase();
    if (cleanReg && cleanReg.length >= 3 && cleanReg !== cleanDept && cleanReg !== "undefined" && cleanReg !== "null") {
        return cleanReg;
    }
    return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

async function validateBatchRecords(records, customExisting = null, defaultOptions = {}) {
    const data = await getAllData();
    const allCerts = customExisting || data.certificates || [];

    // Map existing non-revoked certs: studentIdent::event -> cert
    const existingMap = new Map();
    allCerts.forEach(c => {
        if (!c || c.status === "Revoked") return;
        const ev = (c.event_name || "").trim().toLowerCase();
        if (!ev) return;
        const studentIdent = normalizeStudentIdentity(c.student_name, c.register_number, c.department);
        if (studentIdent) {
            existingMap.set(`${studentIdent}::${ev}`, c);
        }
    });

    const intraBatchMap = new Map();
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    function sanitizeCellValue(val) {
        if (val === null || val === undefined) return "";
        let str = String(val).trim();
        if (/^[=+\-@\t\r]/.test(str)) {
            str = "'" + str; // Prefix apostrophe to prevent execution in spreadsheet software
        }
        return str;
    }

    const validated = (records || []).map((row, idx) => {
        const rowNum = idx + 1;
        const errors = [];
        const warnings = [];

        let studentName = sanitizeCellValue(
            row.full_name_with_initial || row['Full Name with Initial'] || row['Full Name with Initials'] || row.fullNameWithInitial || row.fullname_with_initial ||
            row.participant_name || row['Participant Name'] || row.participantName || row.Participant_Name ||
            row.student_name || row['Student Name'] || row.studentName || row.Student_Name || row.name || row.Name || ""
        );
        let registerNumber = sanitizeCellValue(
            row.register_number || row['Register Number'] || row.registerNumber || row['Register No'] || row.reg_no || row['Reg No'] || row.Reg_No || ""
        ).toUpperCase();
        let participantType = sanitizeCellValue(
            row.participants || row['Participants'] || row.participant || row['Participant'] ||
            row.participant_type || row['Participant Type'] || row.participantType || row.Participant_Type ||
            row.participation_type || row['Participation Type'] || row.participationType || row.achievement || row.Achievement || ""
        );
        let institution = sanitizeCellValue(
            row.college_name || row['College Name'] || row.collegename || row.college || row.College ||
            row.institution || row['Institution'] || row.institution_name || row['Institution Name'] || ""
        );
        let email = sanitizeCellValue(
            row.mail_id || row['Mail Id'] || row['Mail ID'] || row['Mail id'] || row.mailId || row.mail || row.Mail ||
            row.email || row.Email || row['Email'] || row['Email Address'] || row['Email Id'] || ""
        );
        let department = sanitizeCellValue(
            row.department || row.Department || row['Department'] || row.dept || row.Dept || ""
        );
        let academicYear = sanitizeCellValue(
            row.academic_year || row['Academic Year'] || row.academicYear || row.Academic_Year || "2026-27"
        );
        let eventName = sanitizeCellValue(
            row.event_name || row['Event Name'] || row.eventName || row.Event_Name || row.event || row.Event || (defaultOptions && defaultOptions.event_name) || "Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives"
        );
        let rawEventDate = sanitizeCellValue(
            row.event_date || row['Event Date'] || row.eventDate || row.Event_Date || row.date || row.Date || (defaultOptions && defaultOptions.event_date) || ""
        );
        let participationType = sanitizeCellValue(
            row.participation_type || row['Participation Type'] || row.participationType || row.achievement || row.Achievement || row.Participation_Type || participantType || "Participation"
        );
        let rawIssueDate = sanitizeCellValue(
            row.issue_date || row['Certificate Issue Date'] || row.certificate_issue_date || row['Issue Date'] || row.issueDate || row.Certificate_Issue_Date || ""
        );

        // 1. Mandatory checks
        if (!studentName) {
            errors.push("Full Name with Initial is required");
        }
        if (!participantType) {
            participantType = "Student";
        }
        if (!department) {
            department = (defaultOptions && defaultOptions.department) || "Department of Computer Science and Business Systems";
        }
        if (!institution) {
            institution = (defaultOptions && (defaultOptions.institution || defaultOptions.college_name)) || "Ramco Institute of Technology, Rajapalayam";
        }
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                warnings.push(`Notice: Invalid email format: "${email}". Participant will be skipped during email dispatch.`);
            }
        }

        // 2. Date checks
        let eventDate = "";
        if (rawEventDate) {
            const parsed = parseDateString(rawEventDate);
            if (!parsed) {
                errors.push(`Invalid Event Date: "${rawEventDate}". Please use YYYY-MM-DD or DD/MM/YYYY`);
            } else {
                eventDate = parsed;
            }
        } else {
            eventDate = new Date().toISOString().split("T")[0];
        }

        let issueDate = "";
        if (rawIssueDate) {
            const parsed = parseDateString(rawIssueDate);
            if (!parsed) {
                errors.push(`Invalid Issue Date: "${rawIssueDate}". Please use YYYY-MM-DD or DD/MM/YYYY`);
            } else {
                issueDate = parsed;
            }
        } else {
            issueDate = eventDate || new Date().toISOString().split("T")[0];
        }

        // 3. Duplicate checks
        let isDuplicate = false;
        let duplicateType = null;
        let duplicateMessage = "";
        const studentIdent = normalizeStudentIdentity(studentName, registerNumber, department);
        const evLower = eventName.toLowerCase();
        const dupKey = (studentIdent && evLower) ? `${studentIdent}::${evLower}` : "";

        if (dupKey) {
            if (intraBatchMap.has(dupKey)) {
                isDuplicate = true;
                duplicateType = 'file';
                const priorRow = intraBatchMap.get(dupKey);
                duplicateMessage = `Duplicate in file: Participant already listed on Row ${priorRow} for this event`;
                warnings.push(duplicateMessage);
            } else {
                intraBatchMap.set(dupKey, rowNum);
            }

            if (!isDuplicate && existingMap.has(dupKey)) {
                const priorCert = existingMap.get(dupKey);
                isDuplicate = true;
                duplicateType = 'database';
                duplicateMessage = `Duplicate: Certificate #${priorCert.certificate_number} already issued on ${priorCert.issue_date}`;
                warnings.push(duplicateMessage);
            }
        }

        const isValid = errors.length === 0;
        if (isValid && !isDuplicate) {
            validCount++;
        }
        if (!isValid) {
            invalidCount++;
        }
        if (isDuplicate) {
            duplicateCount++;
        }

        return {
            row_index: rowNum,
            rowNumber: rowNum,
            participant_name: studentName,
            participantName: studentName,
            student_name: studentName,
            studentName: studentName,
            full_name_with_initial: studentName,
            fullNameWithInitial: studentName,
            participant_type: participantType,
            participantType: participantType,
            participants: participantType,
            institution: institution,
            college_name: institution,
            collegeName: institution,
            email: email,
            mail_id: email,
            mailId: email,
            register_number: registerNumber,
            registerNumber: registerNumber,
            department: department,
            academic_year: academicYear,
            academicYear: academicYear,
            event_name: eventName,
            eventName: eventName,
            event_date: eventDate,
            eventDate: eventDate,
            participation_type: participationType,
            participationType: participationType,
            achievement: participationType,
            issue_date: issueDate,
            issueDate: issueDate,
            is_valid: isValid,
            isValid: isValid,
            is_duplicate: isDuplicate,
            isDuplicate: isDuplicate,
            duplicate_type: duplicateType,
            duplicateType: duplicateType,
            errors: errors,
            warnings: warnings,
            raw_input: row
        };
    });

    return {
        total_records: validated.length,
        valid_records: validCount,
        invalid_records: invalidCount,
        duplicate_records: duplicateCount,
        summary: {
            totalRows: validated.length,
            validCount: validCount,
            invalidCount: invalidCount,
            duplicateCount: duplicateCount
        },
        records: validated
    };
}

// ============================================================
// BULK CERTIFICATE ISSUANCE ENGINE
// ============================================================
async function issueBulkCertificates({
    batch_title = "Bulk Certificate Generation",
    batchName,
    event_name,
    eventTitle,
    event_date,
    category = "Placement Training",
    academic_year = "2026-27",
    signatory_count = 6,
    signatory_1_name = "Dr. M. Jeya Sundari",
    signatory_1_title = "Faculty Coordinator",
    signatory_1_org = "CSBS, RIT",
    signatory_2_name = "M. Rekha",
    signatory_2_title = "Faculty Coordinator",
    signatory_2_org = "CSBS, RIT",
    signatory_3_name = "M. Ramakrishnan",
    signatory_3_title = "Faculty Coordinator",
    signatory_3_org = "CSBS, RIT",
    signatory_4_name = "Dr. D. Kesavaraja",
    signatory_4_title = "Convenor",
    signatory_4_org = "CSBS, RIT",
    signatory_5_name = "Dr. S. Rajakarunakaran",
    signatory_5_title = "Patron",
    signatory_5_org = "RIT",
    signatory_6_name = "Dr. L. Ganesan",
    signatory_6_title = "Chief Patron",
    signatory_6_org = "RIT",
    programme_title = "One Week Short-Term Training Programme (STTP)",
    programme_dates = "October 12, 2026, to October 18, 2026",
    department = "Department of Computer Science and Business Systems",
    institution = "Ramco Institute of Technology, Rajapalayam",
    college_name = "Ramco Institute of Technology, Rajapalayam",
    certificate_wording = "",
    template_style = "rit_purple_gold",
    id_prefix = "RIT-STTP-2026-",
    signatories = null,
    certificate_title = "CERTIFICATE OF PARTICIPATION",
    certificateTitle,
    certificate_type = "Participation",
    allow_duplicates = false,
    records = [],
    issuer = {}
}) {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error("No student records provided for certificate generation.");
    }

    const effectiveBatchTitle = batch_title || batchName || "Bulk Certificate Generation";
    const effectiveEventName = event_name || eventTitle || "";
    const effectiveCertTitle = certificate_title || certificateTitle || "CERTIFICATE OF PARTICIPATION";

    const sigCount = Number(signatory_count) || (signatory_6_name ? 6 : (signatory_5_name ? 5 : 4));
    const sig1Name = (signatories && signatories.signatory1 && signatories.signatory1.name) || signatory_1_name || "Dr. M. Jeya Sundari";
    const sig1Title = (signatories && signatories.signatory1 && signatories.signatory1.title) || signatory_1_title || "Faculty Coordinator";
    const sig1Org = (signatories && signatories.signatory1 && signatories.signatory1.org) || signatory_1_org || "CSBS, RIT";

    const sig2Name = (signatories && signatories.signatory2 && signatories.signatory2.name) || signatory_2_name || "M. Rekha";
    const sig2Title = (signatories && signatories.signatory2 && signatories.signatory2.title) || signatory_2_title || "Faculty Coordinator";
    const sig2Org = (signatories && signatories.signatory2 && signatories.signatory2.org) || signatory_2_org || "CSBS, RIT";

    const sig3Name = (signatories && signatories.signatory3 && signatories.signatory3.name) || signatory_3_name || "M. Ramakrishnan";
    const sig3Title = (signatories && signatories.signatory3 && signatories.signatory3.title) || signatory_3_title || "Faculty Coordinator";
    const sig3Org = (signatories && signatories.signatory3 && signatories.signatory3.org) || signatory_3_org || "CSBS, RIT";

    const sig4Name = (signatories && signatories.signatory4 && signatories.signatory4.name) || signatory_4_name || "Dr. D. Kesavaraja";
    const sig4Title = (signatories && signatories.signatory4 && signatories.signatory4.title) || signatory_4_title || "Convenor";
    const sig4Org = (signatories && signatories.signatory4 && signatories.signatory4.org) || signatory_4_org || "CSBS, RIT";

    const sig5Name = (signatories && signatories.signatory5 && signatories.signatory5.name) || signatory_5_name || "Dr. S. Rajakarunakaran";
    const sig5Title = (signatories && signatories.signatory5 && signatories.signatory5.title) || signatory_5_title || "Patron";
    const sig5Org = (signatories && signatories.signatory5 && signatories.signatory5.org) || signatory_5_org || "RIT";

    const sig6Name = (signatories && signatories.signatory6 && signatories.signatory6.name) || signatory_6_name || "Dr. L. Ganesan";
    const sig6Title = (signatories && signatories.signatory6 && signatories.signatory6.title) || signatory_6_title || "Chief Patron";
    const sig6Org = (signatories && signatories.signatory6 && signatories.signatory6.org) || signatory_6_org || "RIT";

    const data = await getAllData();
    if (!Array.isArray(data.certificates)) data.certificates = [];
    if (!Array.isArray(data.certificate_batches)) data.certificate_batches = [];
    if (!Array.isArray(data.certificate_audit_logs)) data.certificate_audit_logs = [];

    const isAllowDup = Boolean(allow_duplicates);
    const validationResult = await validateBatchRecords(records, data.certificates, {
        event_name: event_name || eventTitle,
        event_date: event_date,
        institution: institution || college_name,
        college_name: college_name || institution,
        department: department
    });
    let validRecords = validationResult.records.filter(r => r.is_valid && (isAllowDup || !r.is_duplicate));

    if (validRecords.length === 0 && validationResult.records.length > 0) {
        validRecords = validationResult.records.filter(r => r.is_valid || (r.student_name && r.student_name.trim().length > 0));
    }

    if (validRecords.length === 0) {
        throw new Error("None of the submitted records are eligible for generation. Please fix invalid records or allow duplicate override.");
    }

    const timestamp = Date.now();
    const batchId = `BATCH-${timestamp.toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const issuedCerts = [];
    const failedRecords = [];

    const allStudents = await getAllStudentUsers();
    const studentUserMap = new Map();
    allStudents.forEach(s => {
        if (s.register_number) studentUserMap.set(String(s.register_number).trim().toUpperCase(), s);
        if (s.email) studentUserMap.set(String(s.email).trim().toLowerCase(), s);
    });

    const issuedAt = new Date().toISOString();
    const issueDateStr = issuedAt.split("T")[0];

    let cleanPrefix = (id_prefix || "RIT-STTP-2026-").trim();
    if (!cleanPrefix.endsWith("-")) cleanPrefix += "-";
    const existingIds = new Set((data.certificates || []).map(c => (c && c.certificate_number ? c.certificate_number.toUpperCase() : "")));

    for (let i = 0; i < validRecords.length; i++) {
        const row = validRecords[i];
        try {
            const evDate = row.event_date || event_date || issueDateStr;
            const certYear = evDate ? new Date(evDate).getFullYear() : new Date().getFullYear();
            
            // Unique certificate ID generation
            let candidateId = `${cleanPrefix}${String(i + 1).padStart(4, '0')}`;
            if (existingIds.has(candidateId)) {
                candidateId = `${cleanPrefix}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
            }
            existingIds.add(candidateId);
            const certId = candidateId;
            const qrToken = crypto.randomBytes(16).toString("hex");

            const regNo = String(row.register_number || "").trim().toUpperCase();
            const stuUser = studentUserMap.get(regNo) || null;

            const newCert = {
                id: timestamp + i * 10 + Math.floor(Math.random() * 9),
                batch_id: batchId,
                user_id: stuUser ? stuUser.id : null,
                feedback_id: null,
                certificate_number: certId,
                certificate_title: row.certificate_title || effectiveCertTitle,
                certificate_type: row.participation_type || row.achievement || certificate_type || "Participation",
                achievement: row.achievement || row.participation_type || "Participation",
                college_name: row.college_name || row.institution || college_name || institution || "Ramco Institute of Technology, Rajapalayam",
                institution: row.institution || row.college_name || institution || college_name || "Ramco Institute of Technology, Rajapalayam",
                department: row.department || department || "Department of Computer Science and Business Systems",
                participant_name: row.participant_name || row.student_name,
                participant_type: row.participant_type || "Student",
                student_name: row.participant_name || row.student_name,
                register_number: regNo, // Stored internally for matching/duplicates, never printed on PDF or public verification
                student_id: stuUser ? stuUser.id : (regNo || `PART-${i + 1}`),
                student_year: (stuUser && stuUser.year) || 4,
                student_email: row.email || (stuUser && stuUser.email) || "",
                event_name: row.event_name || effectiveEventName,
                programme_title: row.programme_title || programme_title || "Short-Term Training Programme (STTP)",
                programme_dates: row.programme_dates || programme_dates || "10 – 12 October 2026",
                certificate_wording: row.certificate_wording || certificate_wording || "",
                template_style: template_style || "rit_purple_gold",
                event_code: "STTP",
                event_date: evDate,
                event_venue: "Department Placement Lab / Online",
                category: category,
                academic_year: row.academic_year || academic_year || "2026-27",
                issue_date: row.issue_date || issueDateStr,
                coordinator: issuer.full_name || issuer.name || "Faculty Coordinator",
                signatory_count: sigCount,
                signatory_title: sig3Title,
                signatory_1_name: sig1Name,
                signatory1_name: sig1Name,
                signatory_1_title: sig1Title,
                signatory1_title: sig1Title,
                signatory_1_org: sig1Org,
                signatory_2_name: sig2Name,
                signatory2_name: sig2Name,
                signatory_2_title: sig2Title,
                signatory2_title: sig2Title,
                signatory_2_org: sig2Org,
                signatory_3_name: sig3Name,
                signatory3_name: sig3Name,
                signatory_3_title: sig3Title,
                signatory3_title: sig3Title,
                signatory_3_org: sig3Org,
                signatory_4_name: sig4Name,
                signatory4_name: sig4Name,
                signatory_4_title: sig4Title,
                signatory4_title: sig4Title,
                signatory_4_org: sig4Org,
                signatory_5_name: sig5Name,
                signatory5_name: sig5Name,
                signatory_5_title: sig5Title,
                signatory5_title: sig5Title,
                signatory_5_org: sig5Org,
                signatory_6_name: sig6Name,
                signatory6_name: sig6Name,
                signatory_6_title: sig6Title,
                signatory6_title: sig6Title,
                signatory_6_org: sig6Org,
                status: "Digitally Verified",
                verification_status: "VERIFIED",
                revoked_at: null,
                revoked_by: null,
                revocation_reason: null,
                issued_by_id: issuer.id || 0,
                issued_by_name: issuer.full_name || issuer.name || "Faculty Authority",
                issued_by_role: issuer.role || issuer.designation || "faculty_coordinator",
                qr_token: qrToken,
                created_at: issuedAt,
                updated_at: issuedAt
            };

            data.certificates.unshift(newCert);
            issuedCerts.push(newCert);
        } catch (err) {
            failedRecords.push({
                row_index: row.row_index,
                student_name: row.student_name,
                register_number: row.register_number,
                error: err.message
            });
        }
    }

    const batchRecord = {
        id: batchId,
        batch_title: effectiveBatchTitle,
        event_name: effectiveEventName || (validRecords[0] ? validRecords[0].event_name : "Department Event"),
        event_date: event_date || (validRecords[0] ? validRecords[0].event_date : issueDateStr),
        academic_year: academic_year,
        total_records: records.length,
        generated_count: issuedCerts.length,
        failed_count: failedRecords.length + (validationResult.invalid_records || 0),
        issued_by_id: issuer.id || 0,
        issued_by_name: issuer.full_name || issuer.name || "Faculty Coordinator",
        created_at: issuedAt
    };
    data.certificate_batches.unshift(batchRecord);

    const auditRecord = {
        id: timestamp + 999,
        action: "BATCH_CERTIFICATE_ISSUANCE",
        batch_id: batchId,
        actor_id: issuer.id || 0,
        actor_name: issuer.full_name || issuer.name || "Faculty Coordinator",
        actor_role: issuer.role || issuer.designation || "faculty_coordinator",
        total_issued: issuedCerts.length,
        created_at: issuedAt,
        details: {
            event_name: batchRecord.event_name,
            total_attempted: records.length,
            generated: issuedCerts.length,
            failed: failedRecords.length
        }
    };
    data.certificate_audit_logs.unshift(auditRecord);

    await commitData(data);

    return {
        success: true,
        batch_id: batchId,
        batchId: batchId,
        batch: batchRecord,
        total_issued: issuedCerts.length,
        issuedCount: issuedCerts.length,
        failed_count: failedRecords.length,
        failedCount: failedRecords.length,
        certificates: issuedCerts,
        failed_records: failedRecords
    };
}

// ============================================================
// CERTIFICATE REVOCATION
// ============================================================
async function revokeCertificate({ certId, reason = "Institutional certificate revocation", issuer = {} }) {
    if (!certId) throw new Error("Certificate ID is required");
    const data = await getAllData();
    const query = String(certId).trim().toLowerCase();
    const cert = (data.certificates || []).find(c =>
        (c.certificate_number && c.certificate_number.toLowerCase() === query) ||
        String(c.id) === query ||
        (c.qr_token && c.qr_token.toLowerCase() === query)
    );

    if (!cert) {
        throw new Error(`Certificate "${certId}" was not found in institutional records.`);
    }

    cert.status = "Revoked";
    cert.revoked_at = new Date().toISOString();
    cert.revoked_by = issuer.full_name || issuer.name || issuer.email || "Faculty Authority";
    cert.revocation_reason = reason;
    cert.updated_at = new Date().toISOString();

    const auditEntry = {
        id: Date.now() + Math.floor(Math.random() * 500),
        certificate_number: cert.certificate_number,
        action: "REVOKED",
        actor_id: issuer.id || 0,
        actor_name: issuer.full_name || issuer.name || "Faculty Authority",
        performed_by_name: issuer.full_name || issuer.name || "Faculty Authority",
        actor_role: issuer.role || issuer.designation || "faculty",
        reason: reason,
        created_at: new Date().toISOString(),
        details: {
            student_name: cert.student_name,
            register_number: cert.register_number,
            event_name: cert.event_name
        }
    };
    if (!Array.isArray(data.certificate_audit_logs)) data.certificate_audit_logs = [];
    data.certificate_audit_logs.unshift(auditEntry);

    await commitData(data);
    return {
        success: true,
        certificate: cert,
        ...cert
    };
}

// ============================================================
// PUBLIC CERTIFICATE VERIFICATION (NO LOGIN REQUIRED)
// Exposes only approved public credential attributes
// ============================================================
async function getPublicCertificateDetails(certId) {
    if (!certId || !String(certId).trim()) {
        return {
            found: false,
            status: "NOT_FOUND",
            message: "Certificate not found. Please check the certificate ID."
        };
    }

    const query = String(certId).trim().toLowerCase();
    const queryClean = query.replace(/[^a-z0-9]/g, "");
    const data = await getAllData();
    const allCerts = data.certificates || [];

    const matchedCert = allCerts.find(c => {
        if (!c) return false;
        const cNum = (c.certificate_number || "").toLowerCase();
        const cNumClean = cNum.replace(/[^a-z0-9]/g, "");
        const qr = (c.qr_token || "").toLowerCase();
        return cNum === query || (queryClean.length >= 6 && cNumClean === queryClean) || qr === query || String(c.id) === query;
    });

    if (!matchedCert) {
        return {
            found: false,
            status: "NOT_FOUND",
            message: "Certificate not found. Please check the certificate ID."
        };
    }

    const isRevoked = matchedCert.status === "Revoked";
    const publicInfo = {
        certificate_id: matchedCert.certificate_number,
        certificateId: matchedCert.certificate_number,
        certificate_number: matchedCert.certificate_number,
        certificateNumber: matchedCert.certificate_number,
        certificate_title: matchedCert.certificate_title || "CERTIFICATE OF PARTICIPATION",
        certificateTitle: matchedCert.certificate_title || "CERTIFICATE OF PARTICIPATION",
        certificate_type: matchedCert.certificate_type || "Participation",
        certificateType: matchedCert.certificate_type || "Participation",
        achievement: matchedCert.achievement || matchedCert.certificate_type || "Participation",
        college_name: matchedCert.college_name || "RAMCO INSTITUTE OF TECHNOLOGY",
        collegeName: matchedCert.college_name || "RAMCO INSTITUTE OF TECHNOLOGY",
        department: matchedCert.department || "Computer Science and Business Systems",
        student_name: matchedCert.student_name,
        studentName: matchedCert.student_name,
        participant_name: matchedCert.participant_name || matchedCert.student_name,
        participantName: matchedCert.participant_name || matchedCert.student_name,
        participant_type: matchedCert.participant_type || "Student",
        participantType: matchedCert.participant_type || "Student",
        event_name: matchedCert.event_name,
        eventName: matchedCert.event_name,
        event_date: matchedCert.event_date,
        eventDate: matchedCert.event_date,
        issue_date: matchedCert.issue_date,
        issueDate: matchedCert.issue_date,
        signatory_title: matchedCert.signatory_title || "Head of Department - CSBS",
        signatoryTitle: matchedCert.signatory_title || "Head of Department - CSBS",
        signatory_1_name: matchedCert.signatory_1_name || "Dr. K. Arulraj",
        signatory1_name: matchedCert.signatory_1_name || "Dr. K. Arulraj",
        signatory_1_title: matchedCert.signatory_1_title || "Faculty Coordinator",
        signatory1_title: matchedCert.signatory_1_title || "Faculty Coordinator",
        signatory_1_org: matchedCert.signatory_1_org || "CSBS, RIT",
        signatory_2_name: matchedCert.signatory_2_name || "Dr. S. Rajakarunakaran",
        signatory2_name: matchedCert.signatory_2_name || "Dr. S. Rajakarunakaran",
        signatory_2_title: matchedCert.signatory_2_title || "STTP Coordinator",
        signatory2_title: matchedCert.signatory_2_title || "STTP Coordinator",
        signatory_2_org: matchedCert.signatory_2_org || "CSBS, RIT",
        signatory_3_name: matchedCert.signatory_3_name || "Dr. S. Rajakarunakaran",
        signatory3_name: matchedCert.signatory_3_name || "Dr. S. Rajakarunakaran",
        signatory_3_title: matchedCert.signatory_3_title || "Head of Department",
        signatory3_title: matchedCert.signatory_3_title || "Head of Department",
        signatory_3_org: matchedCert.signatory_3_org || "CSBS, RIT",
        signatory_4_name: matchedCert.signatory_4_name || "Dr. L. Ganesan",
        signatory4_name: matchedCert.signatory_4_name || "Dr. L. Ganesan",
        signatory_4_title: matchedCert.signatory_4_title || "Principal",
        signatory4_title: matchedCert.signatory_4_title || "Principal",
        signatory_4_org: matchedCert.signatory_4_org || "RIT",
        signatory_5_name: matchedCert.signatory_5_name || "Dr. S. Rajakarunakaran",
        signatory5_name: matchedCert.signatory_5_name || "Dr. S. Rajakarunakaran",
        signatory_5_title: matchedCert.signatory_5_title || "Patron",
        signatory5_title: matchedCert.signatory_5_title || "Patron",
        signatory_5_org: matchedCert.signatory_5_org || "RIT",
        signatory_6_name: matchedCert.signatory_6_name || "Dr. L. Ganesan",
        signatory6_name: matchedCert.signatory_6_name || "Dr. L. Ganesan",
        signatory_6_title: matchedCert.signatory_6_title || "Chief Patron",
        signatory6_title: matchedCert.signatory_6_title || "Chief Patron",
        signatory_6_org: matchedCert.signatory_6_org || "RIT",
        signatory_count: matchedCert.signatory_count || (matchedCert.signatory_6_name ? 6 : (matchedCert.signatory_5_name ? 5 : 4)),
        programme_title: matchedCert.programme_title || "Short-Term Training Programme (STTP)",
        programmeTitle: matchedCert.programme_title || "Short-Term Training Programme (STTP)",
        programme_dates: matchedCert.programme_dates || "",
        programmeDates: matchedCert.programme_dates || "",
        certificate_wording: matchedCert.certificate_wording || "",
        template_style: matchedCert.template_style || "rit_purple_gold",
        status: isRevoked ? "Revoked" : "VALID",
        verification_status: isRevoked ? "REVOKED" : "VALID",
        is_valid: !isRevoked,
        revoked_at: matchedCert.revoked_at || null,
        revokedAt: matchedCert.revoked_at || null,
        revocation_reason: matchedCert.revocation_reason || null,
        revocationReason: matchedCert.revocation_reason || null,
        qr_token: matchedCert.qr_token || null
    };

    if (isRevoked) {
        return {
            found: true,
            status: "REVOKED",
            message: "Certificate Revoked",
            certificate: publicInfo
        };
    }

    return {
        found: true,
        status: "VALID",
        message: "Verified Institutional Certificate",
        certificate: publicInfo
    };
}

// ============================================================
// BATCH MANAGEMENT HELPERS
// ============================================================
async function getCertificateBatches() {
    const data = await getAllData();
    const batches = data.certificate_batches || [];
    batches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return batches;
}

async function getBatchCertificates(batchId) {
    const data = await getAllData();
    const strBatchId = String(batchId);
    return (data.certificates || []).filter(c => String(c.batch_id) === strBatchId);
}

// ============================================================
// REUSABLE EVENT & CERTIFICATE TEMPLATES MANAGEMENT
// ============================================================
async function getCertificateTemplates() {
    const data = await getAllData();
    if (!Array.isArray(data.certificate_templates) || data.certificate_templates.length === 0) {
        data.certificate_templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
        await commitData(data);
    }
    return data.certificate_templates;
}

async function saveCertificateTemplate(template) {
    if (!template || !template.template_title) {
        throw new Error("Template title is required.");
    }
    const data = await getAllData();
    if (!Array.isArray(data.certificate_templates)) {
        data.certificate_templates = JSON.parse(JSON.stringify(INITIAL_TEMPLATES));
    }
    const id = template.id || `tpl_${Date.now().toString(36)}`;
    const cleanTpl = {
        ...template,
        id,
        updated_at: new Date().toISOString()
    };
    const idx = data.certificate_templates.findIndex(t => t.id === id);
    if (idx >= 0) {
        data.certificate_templates[idx] = cleanTpl;
    } else {
        data.certificate_templates.push(cleanTpl);
    }
    await commitData(data);
    return cleanTpl;
}

async function deleteCertificateTemplate(templateId) {
    const data = await getAllData();
    if (!Array.isArray(data.certificate_templates)) return false;
    data.certificate_templates = data.certificate_templates.filter(t => t.id !== templateId);
    await commitData(data);
    return true;
}

async function updateCertificateEmailStatus(certNumberOrId, status, errorMsg = null) {
    const data = await getAllData();
    const strId = String(certNumberOrId || "").trim().toUpperCase();
    const cert = (data.certificates || []).find(c => 
        (c.certificate_number && String(c.certificate_number).toUpperCase() === strId) || 
        String(c.id) === strId
    );
    if (!cert) return null;

    cert.email_status = status; // 'sent', 'failed', 'pending'
    if (status === 'sent') {
        cert.email_sent_at = new Date().toISOString();
        cert.email_error = null;
    } else if (status === 'failed') {
        cert.email_error = errorMsg || 'Delivery failed';
    }
    await commitData(data);
    return cert;
}

// ============================================================
// SAFE DELETION: CERTIFICATES & BATCHES WITH AUDIT LOGGING
// ============================================================

// Helper: Safely locate and delete any associated generated PDF files from disk or Supabase storage
async function deleteAssociatedCertificateFiles(certNumbers = [], batchIds = []) {
    const results = {
        deletedFilesCount: 0,
        failedFiles: []
    };
    const client = getClient();
    const candidateDirs = [
        path.join(__dirname, "uploads"),
        path.join(__dirname, "uploads", "certificates"),
        path.join(__dirname, "../uploads"),
        path.join(__dirname, "../scratch")
    ];

    const patterns = new Set();
    (certNumbers || []).forEach(num => {
        if (!num) return;
        const clean = String(num).trim();
        patterns.add(clean);
        patterns.add(clean.toLowerCase());
    });
    (batchIds || []).forEach(bId => {
        if (!bId) return;
        const clean = String(bId).trim();
        patterns.add(clean);
        patterns.add(clean.toLowerCase());
    });

    // 1. Local disk scan & removal
    candidateDirs.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (!file.endsWith('.pdf')) return;
                const matchesPattern = Array.from(patterns).some(pat => file.includes(pat));
                if (matchesPattern) {
                    try {
                        const targetPath = path.join(dir, file);
                        fs.unlinkSync(targetPath);
                        results.deletedFilesCount++;
                    } catch (e) {
                        results.failedFiles.push({ file: path.join(dir, file), error: e.message });
                    }
                }
            });
        } catch (e) {}
    });

    // 2. Supabase Storage cleanup (if buckets exist)
    if (client && client.storage) {
        try {
            const { data: buckets } = await client.storage.listBuckets();
            const targetBuckets = (buckets || []).filter(b => b.name === STORAGE_BUCKET || b.name === "certificates");
            for (const b of targetBuckets) {
                const { data: fileList } = await client.storage.from(b.name).list();
                if (Array.isArray(fileList)) {
                    const toDelete = fileList
                        .filter(f => f.name.endsWith('.pdf') && Array.from(patterns).some(pat => f.name.includes(pat)))
                        .map(f => f.name);
                    if (toDelete.length > 0) {
                        const { error } = await client.storage.from(b.name).remove(toDelete);
                        if (!error) {
                            results.deletedFilesCount += toDelete.length;
                        } else {
                            results.failedFiles.push({ bucket: b.name, files: toDelete, error: error.message });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[deleteAssociatedCertificateFiles] Supabase storage notice:", e.message);
        }
    }

    return results;
}

// Admin Action: Delete a selected test certificate batch
async function deleteCertificateBatch({ batchId, confirmBatchId, actor = {} }) {
    const cleanBatchId = String(batchId || "").trim();
    const cleanConfirm = String(confirmBatchId || "").trim();

    if (!cleanBatchId) {
        throw new Error("Batch ID is required for deletion.");
    }
    if (cleanConfirm !== cleanBatchId) {
        throw new Error(`Explicit confirmation failed: You entered "${cleanConfirm}", but the exact Batch ID is "${cleanBatchId}". Please confirm accurately to prevent accidental deletion.`);
    }

    const data = await getAllData();
    const batchIndex = (data.certificate_batches || []).findIndex(b => String(b.id).trim() === cleanBatchId);
    const existingBatch = batchIndex >= 0 ? data.certificate_batches[batchIndex] : null;

    // Collect all certificates strictly belonging to this batch
    const matchingCerts = (data.certificates || []).filter(c => String(c.batch_id || "").trim() === cleanBatchId);

    if (!existingBatch && matchingCerts.length === 0) {
        throw new Error(`Test batch "${cleanBatchId}" not found in institutional records.`);
    }

    const certNumbers = matchingCerts.map(c => c.certificate_number).filter(Boolean);

    // 1. Delete associated stored PDF files
    const fileCleanup = await deleteAssociatedCertificateFiles(certNumbers, [cleanBatchId]);

    // 2. Remove from Supabase PostgreSQL tables if available
    const client = getClient();
    if (client) {
        try {
            await client.from("certificates").delete().eq("batch_id", cleanBatchId);
        } catch (e) {}
        try {
            await client.from("certificate_batches").delete().eq("id", cleanBatchId);
        } catch (e) {}
    }

    // 3. Filter master records
    data.certificates = (data.certificates || []).filter(c => String(c.batch_id || "").trim() !== cleanBatchId);
    if (batchIndex >= 0) {
        data.certificate_batches.splice(batchIndex, 1);
    }

    // 4. Register tombstones to permanently prevent resurrecting
    if (!Array.isArray(data.deleted_batch_ids)) data.deleted_batch_ids = [];
    if (!data.deleted_batch_ids.includes(cleanBatchId)) {
        data.deleted_batch_ids.push(cleanBatchId);
    }

    if (!Array.isArray(data.deleted_certificate_numbers)) data.deleted_certificate_numbers = [];
    certNumbers.forEach(num => {
        const up = String(num).trim().toUpperCase();
        if (!data.deleted_certificate_numbers.includes(up)) {
            data.deleted_certificate_numbers.push(up);
        }
    });

    // 5. Audit Logging (strictly no secrets logged)
    if (!Array.isArray(data.certificate_audit_logs)) data.certificate_audit_logs = [];
    const auditRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        action: "BATCH_CERTIFICATE_DELETION",
        batch_id: cleanBatchId,
        actor_id: actor.id || 0,
        actor_name: actor.full_name || actor.name || "Administrator",
        actor_role: actor.role || actor.designation || "admin",
        total_records_deleted: matchingCerts.length,
        deleted_certificate_numbers: certNumbers,
        created_at: new Date().toISOString(),
        details: {
            batch_title: existingBatch ? existingBatch.batch_title : cleanBatchId,
            event_name: existingBatch ? existingBatch.event_name : "Department Event",
            deleted_records_count: matchingCerts.length,
            deleted_files_count: fileCleanup.deletedFilesCount,
            failed_files: fileCleanup.failedFiles
        }
    };
    data.certificate_audit_logs.unshift(auditRecord);

    await commitData(data);

    return {
        success: true,
        batch_id: cleanBatchId,
        batch_title: existingBatch ? existingBatch.batch_title : cleanBatchId,
        deleted_records_count: matchingCerts.length,
        deleted_files_count: fileCleanup.deletedFilesCount,
        failed_files: fileCleanup.failedFiles,
        message: `Successfully deleted batch ${cleanBatchId} and ${matchingCerts.length} associated certificate record(s).`
    };
}

// Admin Action: Delete an individual certificate record
async function deleteSingleCertificateRecord({ certificateNumber, confirmCertificateNumber, actor = {} }) {
    const cleanCertNum = String(certificateNumber || "").trim().toUpperCase();
    const cleanConfirm = String(confirmCertificateNumber || "").trim().toUpperCase();

    if (!cleanCertNum) {
        throw new Error("Certificate Number is required for deletion.");
    }
    if (cleanConfirm !== cleanCertNum) {
        throw new Error(`Explicit confirmation failed: You entered "${cleanConfirm}", but the exact Certificate ID is "${cleanCertNum}".`);
    }

    const data = await getAllData();
    const certIndex = (data.certificates || []).findIndex(c => 
        (c.certificate_number && String(c.certificate_number).trim().toUpperCase() === cleanCertNum) ||
        String(c.id) === cleanCertNum
    );

    if (certIndex < 0) {
        throw new Error(`Certificate record "${cleanCertNum}" not found in institutional records.`);
    }

    const targetCert = data.certificates[certIndex];
    const parentBatchId = targetCert.batch_id || null;

    // 1. Delete associated stored PDF file
    const fileCleanup = await deleteAssociatedCertificateFiles([targetCert.certificate_number], []);

    // 2. Remove from Supabase PostgreSQL tables if available
    const client = getClient();
    if (client) {
        try {
            await client.from("certificates").delete().eq("certificate_number", targetCert.certificate_number);
        } catch (e) {}
    }

    // 3. Remove certificate from data
    data.certificates.splice(certIndex, 1);

    // 4. Update parent batch record count if applicable
    if (parentBatchId) {
        const parentBatch = (data.certificate_batches || []).find(b => String(b.id).trim() === String(parentBatchId).trim());
        if (parentBatch && parentBatch.generated_count > 0) {
            parentBatch.generated_count = Math.max(0, parentBatch.generated_count - 1);
        }
    }

    // 5. Register tombstone
    if (!Array.isArray(data.deleted_certificate_numbers)) data.deleted_certificate_numbers = [];
    if (!data.deleted_certificate_numbers.includes(cleanCertNum)) {
        data.deleted_certificate_numbers.push(cleanCertNum);
    }

    // 6. Audit Logging
    if (!Array.isArray(data.certificate_audit_logs)) data.certificate_audit_logs = [];
    const auditRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        action: "SINGLE_CERTIFICATE_DELETION",
        certificate_number: cleanCertNum,
        batch_id: parentBatchId,
        student_name: targetCert.student_name,
        actor_id: actor.id || 0,
        actor_name: actor.full_name || actor.name || "Administrator",
        actor_role: actor.role || actor.designation || "admin",
        created_at: new Date().toISOString(),
        details: {
            student_name: targetCert.student_name,
            event_name: targetCert.event_name,
            deleted_files_count: fileCleanup.deletedFilesCount,
            failed_files: fileCleanup.failedFiles
        }
    };
    data.certificate_audit_logs.unshift(auditRecord);

    await commitData(data);

    return {
        success: true,
        certificate_number: cleanCertNum,
        student_name: targetCert.student_name,
        batch_id: parentBatchId,
        deleted_files_count: fileCleanup.deletedFilesCount,
        failed_files: fileCleanup.failedFiles,
        message: `Successfully deleted certificate ${cleanCertNum} (${targetCert.student_name}).`
    };
}

module.exports = {
    createEventFeedback,
    getAllEventFeedbacks,
    getAllSubmissions,
    deleteEventFeedback,
    updateEventFeedbackStatus,
    updateEventFeedbackDetails,
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
    generateUniqueCertificateId,
    verifyAndGetCertificateDetails,
    getAllCertificates,
    getAllStudentUsers,
    filterEligibleStudents,
    inferEventCategory,
    getStudentCertificateRecords,
    updateCertificateDetails,
    validateBatchRecords,
    issueBulkCertificates,
    revokeCertificate,
    getPublicCertificateDetails,
    getCertificateBatches,
    getBatchCertificates,
    getCertificateTemplates,
    saveCertificateTemplate,
    deleteCertificateTemplate,
    updateCertificateEmailStatus,
    deleteCertificateBatch,
    deleteSingleCertificateRecord,
    deleteAssociatedCertificateFiles,
    getAllData
};
