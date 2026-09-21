const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { supabase, supabaseAdmin } = require("./supabase");

const DATA_FILE = path.join(__dirname, "event_feedbacks_certificates.json");

// Default structure
const DEFAULT_DATA = {
    event_feedbacks: [],
    feedback_submissions: [],
    certificates: []
};

// In-memory cache
let inMemoryData = null;

function readLocalData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.event_feedbacks)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Read local file warning:", e.message);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function writeLocalData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.warn("[feedbackCertificateStorage] Write local file warning:", e.message);
    }
}

function getClient() {
    return supabaseAdmin || supabase;
}

// Generate unique certificate number: RIT-CSBS-CERT-YYYY-XXXXXX
function generateCertificateNumber(year = new Date().getFullYear()) {
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const timestampHex = Date.now().toString(36).toUpperCase().slice(-3);
    return `RIT-CSBS-CERT-${year}-${randomHex}${timestampHex}`;
}

// ============================================================
// EVENT FEEDBACKS (ADMIN)
// ============================================================

async function createEventFeedback({ event_name, event_date, target_type = "all", student_id = null, message = "", signatory_title = "Head of Department - CSBS" }) {
    const newId = Date.now();
    const record = {
        id: newId,
        event_name: String(event_name).trim(),
        event_date: event_date || new Date().toISOString().split("T")[0],
        target_type: target_type || "all", // "all" | "student"
        student_id: student_id ? parseInt(student_id, 10) : null,
        message: message ? String(message).trim() : "",
        signatory_title: signatory_title || "Head of Department - CSBS",
        created_at: new Date().toISOString()
    };

    // Attempt Supabase insert if table exists
    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client.from("event_feedbacks").insert([record]).select();
            if (!error && data && data[0]) {
                return data[0];
            }
        } catch (e) {
            console.warn("[feedbackCertificateStorage] Supabase insert event_feedbacks error:", e.message);
        }
    }

    // Local fallback
    const local = readLocalData();
    local.event_feedbacks.unshift(record);
    writeLocalData(local);
    inMemoryData = local;
    return record;
}

async function getAllEventFeedbacks() {
    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client.from("event_feedbacks").select("*").order("created_at", { ascending: false });
            if (!error && Array.isArray(data)) {
                return data;
            }
        } catch (e) {
            console.warn("[feedbackCertificateStorage] Supabase get event_feedbacks error:", e.message);
        }
    }

    const local = readLocalData();
    return local.event_feedbacks || [];
}

async function deleteEventFeedback(id) {
    const numId = parseInt(id, 10);
    const client = getClient();
    if (client) {
        try {
            await client.from("event_feedbacks").delete().eq("id", numId);
            await client.from("feedback_submissions").delete().eq("feedback_id", numId);
            await client.from("certificates").delete().eq("feedback_id", numId);
        } catch (e) {}
    }

    const local = readLocalData();
    local.event_feedbacks = (local.event_feedbacks || []).filter(item => parseInt(item.id, 10) !== numId);
    local.feedback_submissions = (local.feedback_submissions || []).filter(item => parseInt(item.feedback_id, 10) !== numId);
    local.certificates = (local.certificates || []).filter(item => parseInt(item.feedback_id, 10) !== numId);
    writeLocalData(local);
    inMemoryData = local;
    return true;
}

// ============================================================
// STUDENT FEEDBACK SUBMISSION & CERTIFICATE CREATION
// ============================================================

async function getStudentEventFeedbacks(userId) {
    const numUserId = parseInt(userId, 10);
    const allEvents = await getAllEventFeedbacks();
    const allSubmissions = await getAllSubmissions();
    const allCerts = await getAllCertificates();

    // Filter events targeted to this student: target_type === 'all' or student_id === numUserId
    const relevantEvents = allEvents.filter(ev => {
        if (ev.target_type === "all" || !ev.student_id) return true;
        return parseInt(ev.student_id, 10) === numUserId;
    });

    const subMap = new Map();
    (allSubmissions || []).forEach(sub => {
        if (parseInt(sub.user_id, 10) === numUserId) {
            subMap.set(parseInt(sub.feedback_id, 10), sub);
        }
    });

    const certMap = new Map();
    (allCerts || []).forEach(cert => {
        if (parseInt(cert.user_id, 10) === numUserId) {
            certMap.set(parseInt(cert.feedback_id, 10), cert);
        }
    });

    return relevantEvents.map(ev => {
        const evId = parseInt(ev.id, 10);
        const submission = subMap.get(evId) || null;
        const cert = certMap.get(evId) || null;
        return {
            ...ev,
            is_submitted: !!submission,
            submission_details: submission,
            certificate: cert
        };
    });
}

async function getAllSubmissions() {
    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client.from("feedback_submissions").select("*").order("submitted_at", { ascending: false });
            if (!error && Array.isArray(data)) {
                return data;
            }
        } catch (e) {}
    }
    const local = readLocalData();
    return local.feedback_submissions || [];
}

async function getAllCertificates() {
    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client.from("certificates").select("*").order("issue_date", { ascending: false });
            if (!error && Array.isArray(data)) {
                return data;
            }
        } catch (e) {}
    }
    const local = readLocalData();
    return local.certificates || [];
}

async function getStudentCertificates(userId) {
    const numUserId = parseInt(userId, 10);
    const certs = await getAllCertificates();
    return (certs || []).filter(c => parseInt(c.user_id, 10) === numUserId);
}

async function submitFeedbackAndGenerateCertificate({ feedback_id, user_id, rating, learnings, comments, student_info }) {
    const numFeedbackId = parseInt(feedback_id, 10);
    const numUserId = parseInt(user_id, 10);

    const allEvents = await getAllEventFeedbacks();
    const event = allEvents.find(e => parseInt(e.id, 10) === numFeedbackId);
    if (!event) {
        throw new Error("Event feedback request not found");
    }

    // Check if already submitted
    const allSubs = await getAllSubmissions();
    const existingSub = allSubs.find(s => parseInt(s.feedback_id, 10) === numFeedbackId && parseInt(s.user_id, 10) === numUserId);
    if (existingSub) {
        // Return existing certificate
        const allCerts = await getAllCertificates();
        const existingCert = allCerts.find(c => parseInt(c.feedback_id, 10) === numFeedbackId && parseInt(c.user_id, 10) === numUserId);
        return {
            submission: existingSub,
            certificate: existingCert,
            alreadySubmitted: true
        };
    }

    const subId = Date.now();
    const submissionRecord = {
        id: subId,
        feedback_id: numFeedbackId,
        user_id: numUserId,
        rating: parseInt(rating, 10) || 5,
        learnings: learnings ? String(learnings).trim() : "",
        comments: comments ? String(comments).trim() : "",
        submitted_at: new Date().toISOString()
    };

    // Generate unique Certificate
    const certId = Date.now() + 1;
    const certNumber = generateCertificateNumber();
    const issueDate = new Date().toISOString().split("T")[0];

    const certificateRecord = {
        id: certId,
        user_id: numUserId,
        feedback_id: numFeedbackId,
        certificate_number: certNumber,
        college_name: "RAMCO INSTITUTE OF TECHNOLOGY",
        department: student_info.department || "Computer Science and Business Systems",
        student_name: student_info.full_name || "Student",
        register_number: student_info.register_number || "---",
        event_name: event.event_name,
        event_date: event.event_date,
        issue_date: issueDate,
        signatory_title: event.signatory_title || "Head of Department - CSBS",
        created_at: new Date().toISOString()
    };

    // Supabase insert attempt
    const client = getClient();
    if (client) {
        try {
            await client.from("feedback_submissions").insert([submissionRecord]);
            await client.from("certificates").insert([certificateRecord]);
        } catch (e) {
            console.warn("[feedbackCertificateStorage] Supabase insert submission/cert warning:", e.message);
        }
    }

    // Local save
    const local = readLocalData();
    local.feedback_submissions.unshift(submissionRecord);
    local.certificates.unshift(certificateRecord);
    writeLocalData(local);
    inMemoryData = local;

    return {
        submission: submissionRecord,
        certificate: certificateRecord,
        alreadySubmitted: false
    };
}

async function getFeedbackSubmissionsForAdmin(feedbackId) {
    const numFeedbackId = parseInt(feedbackId, 10);
    const allSubs = await getAllSubmissions();
    const allCerts = await getAllCertificates();

    const targetSubs = allSubs.filter(s => parseInt(s.feedback_id, 10) === numFeedbackId);
    const certMap = new Map();
    allCerts.forEach(c => {
        if (parseInt(c.feedback_id, 10) === numFeedbackId) {
            certMap.set(parseInt(c.user_id, 10), c);
        }
    });

    return targetSubs.map(s => {
        const c = certMap.get(parseInt(s.user_id, 10)) || {};
        return {
            ...s,
            student_name: c.student_name || "---",
            register_number: c.register_number || "---",
            department: c.department || "---",
            certificate_number: c.certificate_number || "---",
            issue_date: c.issue_date || s.submitted_at
        };
    });
}

module.exports = {
    createEventFeedback,
    getAllEventFeedbacks,
    deleteEventFeedback,
    getStudentEventFeedbacks,
    getStudentCertificates,
    submitFeedbackAndGenerateCertificate,
    getFeedbackSubmissionsForAdmin,
    generateCertificateNumber
};
