const bcrypt = require("bcryptjs");

const { supabase, supabaseAdmin, testSupabaseConnection } = require("./supabase");

// Always use Supabase Cloud — no MySQL or local database
const dbMode = "supabase";

// Verify Supabase connection on startup
testSupabaseConnection().then(res => {
    if (res.success) {
        console.log("⚡ Supabase Cloud Connected successfully!");
    } else {
        console.error("❌ Supabase connection failed:", res.error || res.message);
    }
});

async function querySupabase(sql, params = [], callback) {
    const client = supabaseAdmin || supabase;
    if (!client) {
        if (callback) callback(new Error("Supabase client not initialized"), null);
        return;
    }

    try {
        const cleanSql = sql.trim().replace(/\s+/g, " ");

        // ----------------------------------------------------
        // 1. STATS / COUNTS
        // ----------------------------------------------------
        if (cleanSql.includes("COUNT(*) as count FROM users WHERE role = 'student'")) {
            const { count, error } = await client.from("users").select("id", { count: "exact", head: true }).eq("role", "student");
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        if (cleanSql.includes("COUNT(DISTINCT user_id) as count FROM applications WHERE status = 'Selected'")) {
            const { data, error } = await client.from("applications").select("user_id").eq("status", "Selected");
            if (error) return callback(error, null);
            const distinct = new Set((data || []).map(d => d.user_id)).size;
            return callback(null, [{ count: distinct }]);
        }

        if (cleanSql.includes("COUNT(*) as count FROM placement_drives")) {
            const { count, error } = await client.from("placement_drives").select("id", { count: "exact", head: true });
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        if (cleanSql.includes("COUNT(*) as count FROM applications")) {
            const { count, error } = await client.from("applications").select("id", { count: "exact", head: true });
            if (error) return callback(error, null);
            return callback(null, [{ count: count || 0 }]);
        }

        // ----------------------------------------------------
        // 2. USERS TABLE QUERIES
        // ----------------------------------------------------
        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM users")) {
            // LOGIN QUERY: register_number = ? OR email = ? OR (role = 'admin' AND ...)
            // This is the main student/admin login lookup used by auth.js
            if (cleanSql.includes("register_number = ? OR email = ?")) {
                const identifier = params[0]; // register_number
                const emailVal   = params[1]; // email (same value in login)
                const searchVal  = identifier || emailVal;
                const { data, error } = await client
                    .from("users")
                    .select("*")
                    .or(`register_number.eq.${searchVal},email.eq.${searchVal}`);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("email = ? OR (register_number")) {
                const emailVal = params[0];
                const regVal = params[1];
                let query = client.from("users").select("*");
                if (regVal) {
                    query = query.or(`email.eq.${emailVal},register_number.eq.${regVal}`);
                } else {
                    query = query.eq("email", emailVal);
                }
                const { data, error } = await query;
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("email = ? OR register_number = ?")) {
                const searchVal = params[0];
                const { data, error } = await client.from("users").select("*").or(`email.eq.${searchVal},register_number.eq.${searchVal}`);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("WHERE email = ?")) {
                const { data, error } = await client.from("users").select("*").eq("email", params[0]);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            if (cleanSql.includes("WHERE id = ?")) {
                const { data, error } = await client.from("users").select("*").eq("id", params[0]);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }

            // Fallback: generic select all users (e.g. /auth/me with register_number lookup)
            if (cleanSql.includes("register_number, email, role") || cleanSql.includes("id, full_name, register_number")) {
                const userId = params[0];
                const { data, error } = await client.from("users").select("id, full_name, register_number, email, role, year, department, phone").eq("id", userId);
                if (error) return callback(error, null);
                return callback(null, data || []);
            }
        }

        if (cleanSql.startsWith("INSERT INTO users")) {
            const [full_name, register_number, email, password, role, year, department, phone] = params;
            const { data, error } = await client.from("users").insert([{
                full_name, register_number, email, password, role, year, department, phone
            }]).select();
            if (error) return callback(error, null);
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        // ----------------------------------------------------
        // 3. STUDENT PROFILES QUERIES
        // ----------------------------------------------------
        if (cleanSql.includes("FROM users u") && cleanSql.includes("WHERE u.id = ?")) {
            const userId = params[0];
            const { data: uData, error: uErr } = await client.from("users").select("*").eq("id", userId);
            if (uErr) return callback(uErr, null);
            if (!uData || uData.length === 0) return callback(null, []);

            const user = uData[0];
            const { data: spData } = await client.from("student_profiles").select("*").eq("user_id", userId);
            const profile = spData && spData[0] ? spData[0] : {};

            const merged = {
                user_id: user.id,
                full_name: user.full_name,
                register_number: user.register_number,
                email: user.email,
                year: user.year,
                department: user.department,
                phone: user.phone,
                ...profile
            };
            return callback(null, [merged]);
        }

        if (cleanSql.includes("FROM users u") && cleanSql.includes("WHERE u.role = 'student'")) {
            const { data: users, error: uErr } = await client.from("users").select("*").eq("role", "student");
            if (uErr) return callback(uErr, null);

            const { data: profiles } = await client.from("student_profiles").select("*");
            const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

            // Fetch placed companies mapping
            const { data: selectedApps } = await client.from("applications").select("user_id, drive_id").eq("status", "Selected");
            const { data: drives } = await client.from("placement_drives").select("id, company_name, job_role");
            const driveMap = new Map((drives || []).map(d => [d.id, d]));
            const placedMap = new Map();
            (selectedApps || []).forEach(sa => {
                const d = driveMap.get(sa.drive_id);
                if (d) {
                    const existing = placedMap.get(sa.user_id) || [];
                    existing.push(`${d.company_name} (${d.job_role})`);
                    placedMap.set(sa.user_id, existing);
                }
            });

            let combined = (users || []).map(u => {
                const sp = profMap.get(u.id) || {};
                const placedArr = placedMap.get(u.id) || [];
                return {
                    user_id: u.id,
                    full_name: u.full_name,
                    register_number: u.register_number,
                    email: u.email,
                    year: u.year,
                    department: u.department,
                    phone: u.phone,
                    cgpa: sp.cgpa,
                    history_arrears_count: sp.history_arrears_count,
                    standing_arrears_count: sp.standing_arrears_count,
                    domain_interest: sp.domain_interest,
                    tenth_percentage: sp.tenth_percentage,
                    twelth_percentage: sp.twelth_percentage,
                    resume_file: sp.resume_file,
                    linkedin_link: sp.linkedin_link,
                    github_link: sp.github_link,
                    placed_company: placedArr.length > 0 ? placedArr.join(", ") : null
                };
            });

            let pIdx = 0;
            if (cleanSql.includes("u.year = ?")) {
                const yearVal = parseInt(params[pIdx++]);
                combined = combined.filter(s => s.year === yearVal);
            }
            if (cleanSql.includes("LIKE ?")) {
                const searchVal = String(params[pIdx]).replace(/%/g, "").toLowerCase();
                pIdx += 3;
                combined = combined.filter(s =>
                    (s.full_name && s.full_name.toLowerCase().includes(searchVal)) ||
                    (s.register_number && s.register_number.toLowerCase().includes(searchVal)) ||
                    (s.email && s.email.toLowerCase().includes(searchVal))
                );
            }
            if (cleanSql.includes("sp.cgpa >= ?")) {
                const minCgpa = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.cgpa || 0) >= minCgpa);
            }
            if (cleanSql.includes("sp.tenth_percentage >= ?")) {
                const minTenth = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.tenth_percentage || 0) >= minTenth);
            }
            if (cleanSql.includes("sp.twelth_percentage >= ?")) {
                const minTwelth = parseFloat(params[pIdx++]);
                combined = combined.filter(s => parseFloat(s.twelth_percentage || 0) >= minTwelth);
            }
            if (cleanSql.includes("sp.standing_arrears_count <= ?")) {
                const maxArrears = parseInt(params[pIdx++]);
                combined = combined.filter(s => parseInt(s.standing_arrears_count || 0) <= maxArrears);
            }

            return callback(null, combined);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM student_profiles WHERE user_id = ?")) {
            const { data, error } = await client.from("student_profiles").select("*").eq("user_id", params[0]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO student_profiles (user_id, college_email, department, phone_number)")) {
            const [user_id, college_email, department, phone_number] = params;
            const { data, error } = await client.from("student_profiles").insert([{ user_id, college_email, department, phone_number }]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("INSERT INTO student_profiles ( user_id,")) {
            const [
                user_id, dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage, degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa, sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number, history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count, linkedin_link, github_link, profile_photo, resume_file
            ] = params;

            const { data, error } = await client.from("student_profiles").insert([{
                user_id, dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage, degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa, sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number, history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count, linkedin_link, github_link, profile_photo, resume_file
            }]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("UPDATE student_profiles SET")) {
            const [
                dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage,
                degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number,
                history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count,
                linkedin_link, github_link,
                profile_photo, resume_file, user_id
            ] = params;

            const upsertObj = {
                user_id,
                dob, personal_email, college_email, domain_interest,
                tenth_percentage, twelth_percentage, diploma_percentage,
                degree, department,
                sem1_gpa, sem2_gpa, sem3_gpa, sem4_gpa,
                sem5_gpa, sem6_gpa, sem7_gpa, sem8_gpa,
                cgpa, phone_number, whatsapp_number,
                history_of_arrears, history_arrears_count,
                standing_of_arrears, standing_arrears_count,
                linkedin_link, github_link
            };

            // Only update file fields if new files were uploaded (COALESCE equivalent)
            if (profile_photo) upsertObj.profile_photo = profile_photo;
            if (resume_file) upsertObj.resume_file = resume_file;

            // Use upsert: if row exists update it, if not create it
            const { data, error } = await client
                .from("student_profiles")
                .upsert(upsertObj, { onConflict: "user_id" });
            if (error) {
                console.error("Supabase upsert student_profiles error:", error);
                return callback(error, null);
            }
            return callback(null, { affectedRows: 1 });
        }


        // ----------------------------------------------------
        // 4. PLACEMENT DRIVES QUERIES
        // ----------------------------------------------------
        if (cleanSql.includes("FROM placement_drives pd") && cleanSql.includes("app.user_id = ?")) {
            const userId = params[0];
            const filterDeletedForStudent = cleanSql.includes("is_deleted_for_students = 0") || (userId !== 0 && userId !== "0");

            const { data: drives, error: dErr } = await client.from("placement_drives").select("*").order("created_at", { ascending: false });
            if (dErr) return callback(dErr, null);

            let filteredDrives = drives || [];
            if (filterDeletedForStudent) {
                filteredDrives = filteredDrives.filter(d => !d.is_deleted_for_students || d.is_deleted_for_students == 0);
            }

            const { data: apps } = await client.from("applications").select("*").eq("user_id", userId);
            const appMap = new Map((apps || []).map(a => [a.drive_id, a]));

            const results = filteredDrives.map(d => {
                const app = appMap.get(d.id);
                return {
                    ...d,
                    app_status: app ? app.status : null,
                    applied_at: app ? app.applied_at : null
                };
            });
            return callback(null, results);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM placement_drives WHERE id = ?")) {
            const { data, error } = await client.from("placement_drives").select("*").eq("id", params[0]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM placement_drives")) {
            const { data, error } = await client.from("placement_drives").select("*").order("created_at", { ascending: false });
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO placement_drives")) {
            const [
                company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
                eligible_years, job_location, deadline, description, target_batch
            ] = params;

            const { data, error } = await client.from("placement_drives").insert([{
                company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
                eligible_years, job_location, deadline, description,
                target_batch: target_batch || "All Batches",
                is_deleted_for_students: 0
            }]).select();
            if (error) return callback(error, null);
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        if (cleanSql.includes("UPDATE placement_drives SET is_deleted_for_students =")) {
            const isDel = params[0];
            const driveId = params[1];
            const { data, error } = await client.from("placement_drives").update({ is_deleted_for_students: isDel }).eq("id", driveId);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("UPDATE placement_drives SET")) {
            const [
                company_name, job_role, package_ctc, min_cgpa, max_standing_arrears,
                eligible_years, job_location, deadline, description, target_batch, driveId
            ] = params;
            const updateObj = {
                company_name,
                job_role,
                package_ctc,
                min_cgpa,
                max_standing_arrears,
                eligible_years,
                job_location,
                deadline,
                description,
                target_batch
            };
            const { data, error } = await client.from("placement_drives").update(updateObj).eq("id", driveId);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.startsWith("DELETE FROM placement_drives WHERE id = ?")) {
            const { data, error } = await client.from("placement_drives").delete().eq("id", params[0]);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM applications")) {
            let q = client.from("applications").delete();
            if (cleanSql.includes("user_id = ?")) {
                q = q.eq("user_id", params[0]);
            } else if (cleanSql.includes("drive_id = ?")) {
                q = q.eq("drive_id", params[0]);
            } else if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM student_profiles")) {
            let q = client.from("student_profiles").delete();
            if (cleanSql.includes("user_id = ?")) {
                q = q.eq("user_id", params[0]);
            } else if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        if (cleanSql.includes("DELETE FROM users")) {
            let q = client.from("users").delete();
            if (cleanSql.includes("id = ?")) {
                q = q.eq("id", params[0]);
            }
            const { error } = await q;
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        // ----------------------------------------------------
        // 5. APPLICATIONS QUERIES
        // ----------------------------------------------------
        if (cleanSql.startsWith("SELECT") && cleanSql.includes("FROM applications WHERE drive_id = ? AND user_id = ?")) {
            const { data, error } = await client.from("applications").select("*").eq("drive_id", params[0]).eq("user_id", params[1]);
            if (error) return callback(error, null);
            return callback(null, data || []);
        }

        if (cleanSql.startsWith("INSERT INTO applications")) {
            const [drive_id, user_id, status = "Applied"] = params;
            const { data, error } = await client.from("applications").insert([{ drive_id, user_id, status }]).select();
            if (error) {
                if (error.code === "23505" || error.message.includes("unique")) {
                    const err = new Error("UNIQUE constraint failed");
                    return callback(err, null);
                }
                return callback(error, null);
            }
            const inserted = data && data[0] ? data[0] : {};
            return callback(null, { insertId: inserted.id, affectedRows: 1 });
        }

        if (cleanSql.includes("FROM applications app") || (cleanSql.includes("FROM applications") && cleanSql.includes("JOIN"))) {
            const { data: apps, error: aErr } = await client.from("applications").select("*").order("applied_at", { ascending: false });
            if (aErr) return callback(aErr, null);

            const { data: drives } = await client.from("placement_drives").select("*");
            const driveMap = new Map((drives || []).map(d => [d.id, d]));

            const { data: users } = await client.from("users").select("*");
            const userMap = new Map((users || []).map(u => [u.id, u]));

            const { data: profiles } = await client.from("student_profiles").select("*");
            const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

            let results = (apps || []).map(a => {
                const drive = driveMap.get(a.drive_id) || {};
                const user = userMap.get(a.user_id) || {};
                const sp = profMap.get(a.user_id) || {};

                return {
                    app_id: a.id,
                    status: a.status,
                    applied_at: a.applied_at,
                    company_name: drive.company_name,
                    job_role: drive.job_role,
                    package_ctc: drive.package_ctc,
                    full_name: user.full_name,
                    register_number: user.register_number,
                    email: user.email,
                    year: user.year,
                    phone: user.phone,
                    cgpa: sp.cgpa,
                    standing_arrears_count: sp.standing_arrears_count,
                    resume_file: sp.resume_file
                };
            });

            if (cleanSql.includes("app.status = 'Selected'") || cleanSql.includes("status = 'Selected'")) {
                results = results.filter(r => r.status === 'Selected');
            }

            let pIdx = 0;
            if (cleanSql.includes("u.year = ?")) {
                const yearVal = parseInt(params[pIdx++]);
                results = results.filter(r => r.year === yearVal);
            }
            if (cleanSql.includes("LIKE ?")) {
                const searchVal = String(params[pIdx]).replace(/%/g, "").toLowerCase();
                results = results.filter(r =>
                    (r.full_name && r.full_name.toLowerCase().includes(searchVal)) ||
                    (r.register_number && r.register_number.toLowerCase().includes(searchVal)) ||
                    (r.company_name && r.company_name.toLowerCase().includes(searchVal)) ||
                    (r.job_role && r.job_role.toLowerCase().includes(searchVal))
                );
            }

            return callback(null, results);
        }

        if (cleanSql.startsWith("UPDATE applications SET status = ? WHERE id = ?")) {
            const [status, application_id] = params;
            const { data, error } = await client.from("applications").update({ status }).eq("id", application_id);
            if (error) return callback(error, null);
            return callback(null, { affectedRows: 1 });
        }

        console.warn("⚠️ Unhandled Supabase query:", cleanSql);
        return callback(null, []);
    } catch (err) {
        console.error("❌ Exception executing Supabase query:", err);
        return callback(err, null);
    }
}

const db = {
    mode: () => dbMode,
    supabase: supabaseAdmin || supabase,
    query: (sql, params, callback) => {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];
        // Always use Supabase — no MySQL or SQLite
        return querySupabase(sql, params, callback);
    }
};

console.log("⚡ Database: Supabase Cloud (only mode — no localhost DB)");

module.exports = db;