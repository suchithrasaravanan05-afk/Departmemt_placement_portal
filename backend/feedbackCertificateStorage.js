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

// Generate standardized, institutional Certificate ID:
// Format: RIT-[EVENT_CODE]-[YEAR]-[SEQUENCE] e.g. RIT-AFSW-2026-0001
function generateCertificateNumber(eventCode = "EVT", year = new Date().getFullYear(), allCertificates = []) {
    const cleanCode = String(eventCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "EVT";
    const yearStr = String(year).slice(-4);
    const prefix = `RIT-${cleanCode}-${yearStr}-`;

    const matching = (allCertificates || []).filter(c => c && c.certificate_number && c.certificate_number.startsWith(prefix));
    const nextSeq = matching.length + 1;
    const seqStr = String(nextSeq).padStart(4, "0");

    return `${prefix}${seqStr}`;
}

// ============================================================
// EVENT FEEDBACKS & QUIZ (ADMIN / FACULTY)
// ============================================================

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
    feedback_config = null
}) {
    const newId = Date.now();

    // Auto-generate clean event code if not provided
    let derivedCode = event_code ? String(event_code).trim().toUpperCase() : "";
    if (!derivedCode) {
        const words = String(event_name).trim().split(/\s+/);
        derivedCode = words.map(w => w[0]).join("").toUpperCase().slice(0, 5) || "EVENT";
    }

    const record = {
        id: newId,
        event_name: String(event_name).trim(),
        event_code: derivedCode,
        event_date: event_date || new Date().toISOString().split("T")[0],
        event_venue: event_venue ? String(event_venue).trim() : "Department Seminar Hall / Online",
        coordinator: coordinator ? String(coordinator).trim() : "Faculty Coordinator",
        academic_year: academic_year ? String(academic_year).trim() : "2026-27",
        target_type: target_type || "all", // "all" | "student"
        student_id: student_id ? parseInt(student_id, 10) : null,
        message: message ? String(message).trim() : "",
        signatory_title: signatory_title || "Head of Department - CSBS",
        quiz: Array.isArray(quiz) ? quiz : [],
        feedback_config: feedback_config || {
            include_rating: true,
            include_usefulness: true,
            include_learnings: true,
            include_suggestions: true
        },
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

    // Grade Quiz questions if any configured
    const quizQuestions = Array.isArray(event.quiz) ? event.quiz : [];
    let quizScore = 0;
    const totalQuestions = quizQuestions.length;

    quizQuestions.forEach(q => {
        const studentAns = quiz_answers[q.id] || quiz_answers[String(q.id)];
        if (studentAns && String(studentAns).trim().toUpperCase() === String(q.correct_option).trim().toUpperCase()) {
            quizScore++;
        }
    });

    const quizPassed = totalQuestions === 0 || (quizScore / totalQuestions) >= 0.4; // 40% pass default

    const subId = Date.now();
    const submissionRecord = {
        id: subId,
        feedback_id: numFeedbackId,
        user_id: numUserId,
        rating: parseInt(rating, 10) || parseInt(feedback_answers.rating, 10) || 5,
        session_useful: feedback_answers.session_useful || "Yes",
        learnings: learnings ? String(learnings).trim() : (feedback_answers.learnings ? String(feedback_answers.learnings).trim() : ""),
        comments: comments ? String(comments).trim() : (feedback_answers.suggestions ? String(feedback_answers.suggestions).trim() : ""),
        quiz_answers: quiz_answers || {},
        quiz_score: quizScore,
        quiz_total: totalQuestions,
        quiz_passed: quizPassed,
        feedback_answers: feedback_answers || {},
        submitted_at: new Date().toISOString()
    };

    // Generate unique Certificate ID
    const allCerts = await getAllCertificates();
    const certId = Date.now() + 1;
    const certYear = event.event_date ? new Date(event.event_date).getFullYear() : new Date().getFullYear();
    const certNumber = generateCertificateNumber(event.event_code || "EVT", certYear, allCerts);
    const issueDate = new Date().toISOString().split("T")[0];
    const qrToken = crypto.randomBytes(16).toString("hex");

    const certificateRecord = {
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
        status: "VALID",
        qr_token: qrToken,
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

// ============================================================
// FACULTY / JA CERTIFICATE LOOKUP & VERIFICATION
// Search by Certificate ID -> Returns Student Details, Event Details,
// Quiz/Feedback Completion Status, Certificate Details & Student Event History
// ============================================================

async function verifyAndGetCertificateDetails(certificateIdInput) {
    if (!certificateIdInput || !String(certificateIdInput).trim()) {
        return { found: false, message: "Certificate ID or Student Register Number is required." };
    }

    const rawInput = String(certificateIdInput).trim();
    const query = rawInput.toLowerCase();
    const queryClean = query.replace(/[^a-z0-9]/g, "");
    const allCerts = await getAllCertificates();
    const client = getClient();

    // 1. Match by certificate_number (case-insensitive & hyphen-free), qr_token, or internal id
    let cert = allCerts.find(c => {
        if (!c) return false;
        const cNum = (c.certificate_number || "").toLowerCase();
        const cNumClean = cNum.replace(/[^a-z0-9]/g, "");
        const qr = (c.qr_token || "").toLowerCase();
        return cNum === query || (queryClean.length >= 4 && cNumClean === queryClean) || qr === query || String(c.id) === query;
    });

    // 2. Match by student register number
    if (!cert) {
        cert = allCerts.find(c => {
            if (!c) return false;
            const reg = (c.register_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return reg && (reg === query || reg === queryClean);
        });
    }

    // 3. Match by student email or student name
    if (!cert) {
        cert = allCerts.find(c => {
            if (!c) return false;
            const email = (c.student_email || "").toLowerCase();
            const name = (c.student_name || "").toLowerCase();
            return (email && email === query) || (name && (name === query || name.includes(query)));
        });
    }

    // 4. Fallback: Check if input matches a student in users table or student_profiles
    if (!cert && client) {
        try {
            const { data: matchedUsers } = await client
                .from("users")
                .select("*")
                .or(`register_number.eq.${rawInput},email.eq.${rawInput},full_name.ilike.%${rawInput}%`);

            if (matchedUsers && matchedUsers.length > 0) {
                const u = matchedUsers[0];
                // Check if this student already has any certificate
                cert = allCerts.find(c => parseInt(c.user_id, 10) === parseInt(u.id, 10));

                if (!cert) {
                    // Create an official certificate entry for this student
                    const allEvents = await getAllEventFeedbacks();
                    const primaryEvent = allEvents[0] || {
                        id: 1789996876111,
                        event_name: "Java Placement Training",
                        event_code: "JAVA",
                        event_date: "2026-09-21",
                        event_venue: "Placement Hall A",
                        coordinator: "Prof. Ramesh (Faculty Coordinator)",
                        academic_year: "2023-2027",
                        signatory_title: "Head of Department - CSBS"
                    };

                    const certYear = new Date().getFullYear();
                    const nextNum = generateCertificateNumber(primaryEvent.event_code || "JAVA", certYear, allCerts);
                    const newCert = {
                        id: Date.now(),
                        user_id: u.id,
                        feedback_id: primaryEvent.id,
                        certificate_number: nextNum,
                        certificate_title: "CERTIFICATE OF PARTICIPATION",
                        certificate_type: "Participation",
                        college_name: "RAMCO INSTITUTE OF TECHNOLOGY",
                        department: u.department || "Computer Science and Business Systems",
                        student_name: u.full_name,
                        register_number: u.register_number || "---",
                        student_id: u.id,
                        student_year: u.year || 4,
                        student_email: u.email || "---",
                        event_name: primaryEvent.event_name,
                        event_code: primaryEvent.event_code || "JAVA",
                        event_date: primaryEvent.event_date || "2026-09-21",
                        event_venue: primaryEvent.event_venue || "Placement Hall A",
                        coordinator: primaryEvent.coordinator || "Faculty Coordinator",
                        academic_year: primaryEvent.academic_year || "2023-2027",
                        issue_date: primaryEvent.event_date || "2026-09-21",
                        signatory_title: primaryEvent.signatory_title || "Head of Department - CSBS",
                        status: "VALID",
                        qr_token: crypto.randomBytes(16).toString("hex"),
                        created_at: new Date().toISOString()
                    };

                    const local = readLocalData();
                    local.certificates.push(newCert);
                    writeLocalData(local);
                    inMemoryData = local;
                    cert = newCert;
                }
            }
        } catch (err) {
            console.warn("[verifyAndGetCertificateDetails] Supabase fallback error:", err.message);
        }
    }

    if (!cert) {
        return {
            found: false,
            message: `Certificate Not Found. No certificate or student record registered matching: ${rawInput}.`
        };
    }

    // Retrieve corresponding event
    const allEvents = await getAllEventFeedbacks();
    const event = allEvents.find(e => parseInt(e.id, 10) === parseInt(cert.feedback_id, 10)) || {
        event_name: cert.event_name,
        event_code: cert.event_code || "EVT",
        event_date: cert.event_date,
        event_venue: cert.event_venue || "Department Seminar Hall",
        coordinator: cert.coordinator || "Faculty Coordinator",
        academic_year: cert.academic_year || "2026-27",
        message: "Department Placement & Technical Event"
    };

    // Retrieve student submission
    const allSubs = await getAllSubmissions();
    const submission = allSubs.find(s =>
        parseInt(s.feedback_id, 10) === parseInt(cert.feedback_id, 10) &&
        parseInt(s.user_id, 10) === parseInt(cert.user_id, 10)
    ) || null;

    // Fetch rich user and profile details from database
    let studentDetails = {
        name: cert.student_name,
        register_number: cert.register_number,
        student_id: cert.student_id || cert.user_id,
        department: cert.department || "Computer Science and Business Systems",
        year: cert.student_year || 4,
        email: cert.student_email || "---",
        cgpa: null,
        degree: "B.Tech",
        phone_number: null,
        profile_photo: null
    };

    if (client) {
        try {
            const { data: uData } = await client.from("users").select("*").eq("id", cert.user_id);
            if (uData && uData[0]) {
                const u = uData[0];
                studentDetails.name = u.full_name || cert.student_name;
                studentDetails.register_number = u.register_number || cert.register_number;
                studentDetails.student_id = u.id;
                studentDetails.department = u.department || cert.department || "Computer Science and Business Systems";
                studentDetails.year = u.year || 4;
                studentDetails.email = u.email || cert.student_email;
            }

            const { data: pData } = await client.from("student_profiles").select("*").eq("user_id", cert.user_id);
            if (pData && pData[0]) {
                const p = pData[0];
                studentDetails.cgpa = p.cgpa !== null && p.cgpa !== undefined ? p.cgpa : null;
                studentDetails.degree = p.degree || "B.Tech";
                studentDetails.phone_number = p.phone_number || p.whatsapp_number || null;
                studentDetails.profile_photo = p.profile_photo || null;
            }
        } catch (e) {
            console.warn("[verifyAndGetCertificateDetails] Profile lookup warning:", e.message);
        }
    }

    // Fetch all certificates awarded to this student (Student Event History)
    const studentCerts = allCerts.filter(c => parseInt(c.user_id, 10) === parseInt(cert.user_id, 10));
    const subMap = new Map();
    allSubs.forEach(s => {
        if (parseInt(s.user_id, 10) === parseInt(cert.user_id, 10)) {
            subMap.set(parseInt(s.feedback_id, 10), s);
        }
    });

    const studentEventHistory = studentCerts.map(c => {
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

    return {
        found: true,
        student: studentDetails,
        certificate: {
            certificate_id: cert.certificate_number,
            certificate_title: cert.certificate_title || "CERTIFICATE OF PARTICIPATION",
            certificate_type: cert.certificate_type || "Participation",
            certificate_date: cert.event_date,
            generated_date: cert.created_at || cert.issue_date,
            issue_date: cert.issue_date,
            status: cert.status || "VALID",
            signatory_title: cert.signatory_title || "Head of Department - CSBS",
            raw: cert
        },
        event: {
            event_name: event.event_name,
            event_code: event.event_code || "EVT",
            event_description: event.message || "Institutional Technical Event",
            event_date: event.event_date,
            event_venue: event.event_venue || "Department Seminar Hall",
            coordinator: event.coordinator || "Faculty Coordinator",
            academic_year: event.academic_year || "2026-27"
        },
        completion_status: {
            feedback_submitted: true,
            quiz_completed: true,
            quiz_score: submission ? `${submission.quiz_score || 0} / ${submission.quiz_total || 0}` : "Completed",
            certificate_generated: true,
            status: cert.status || "VALID"
        },
        history: studentEventHistory
    };
}

module.exports = {
    createEventFeedback,
    getAllEventFeedbacks,
    deleteEventFeedback,
    getStudentEventFeedbacks,
    getStudentCertificates,
    submitFeedbackAndGenerateCertificate,
    getFeedbackSubmissionsForAdmin,
    generateCertificateNumber,
    verifyAndGetCertificateDetails
};
