const fs = require("fs");
const path = require("path");
const { supabase, supabaseAdmin } = require("./supabase");

const PERMISSIONS_FILE = path.join(__dirname, "permissions.json");

// Default permission values according to role
const ROLE_DEFAULTS = {
    student: {
        placement_access: true,
        social_media_access: false
    },
    faculty: {
        placement_access: true,
        social_media_access: true
    },
    hod: {
        placement_access: true,
        social_media_access: true
    },
    admin: {
        placement_access: true,
        social_media_access: true
    }
};

// Initial test user presets to support testing requirements immediately
const DEFAULT_PRESETS = {
    // Specific accounts for testing scenarios:
    // 1. Faculty with Placement ONLY
    "faculty_placement_only@rit.ac.in": { placement_access: true, social_media_access: false },
    "FAC-PLACEMENT-ONLY": { placement_access: true, social_media_access: false },
    // 2. Faculty with Social Media ONLY
    "faculty_social_only@rit.ac.in": { placement_access: false, social_media_access: true },
    "FAC-SOCIAL-ONLY": { placement_access: false, social_media_access: true },
    // 3. Faculty with BOTH
    "faculty@rit.ac.in": { placement_access: true, social_media_access: true },
    "FACULTY001": { placement_access: true, social_media_access: true },
    // 4. HOD with BOTH
    "hod@rit.ac.in": { placement_access: true, social_media_access: true },
    "HOD001": { placement_access: true, social_media_access: true },
    // 5. Admin with BOTH
    "admin@rit.ac.in": { placement_access: true, social_media_access: true },
    "ADMIN001": { placement_access: true, social_media_access: true }
};

let inMemoryPermissions = null;

function readLocalPermissions() {
    try {
        if (fs.existsSync(PERMISSIONS_FILE)) {
            const raw = fs.readFileSync(PERMISSIONS_FILE, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[permissionsStorage] Failed reading permissions.json:", e.message);
    }
    return { ...DEFAULT_PRESETS };
}

function writeLocalPermissions(data) {
    try {
        fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.warn("[permissionsStorage] Failed writing permissions.json:", e.message);
    }
}

function getPermissionsStore() {
    if (!inMemoryPermissions) {
        inMemoryPermissions = readLocalPermissions();
    }
    return inMemoryPermissions;
}

/**
 * Get permissions for a specific user.
 * Checks:
 * 1. Explicit user record fields (if present in Supabase / users table)
 * 2. Persistent storage by ID / email / register_number
 * 3. Role-based defaults
 */
async function getUserPermissions(user) {
    if (!user) {
        return { placement_access: false, social_media_access: false };
    }

    // If already present in user object from Supabase columns
    if (typeof user.placement_access === "boolean" && typeof user.social_media_access === "boolean") {
        return {
            placement_access: user.placement_access,
            social_media_access: user.social_media_access
        };
    }

    const store = getPermissionsStore();
    const idKey = user.id ? `id_${user.id}` : null;
    const emailKey = user.email ? user.email.toLowerCase() : null;
    const regKey = user.register_number ? user.register_number.toUpperCase() : null;

    if (idKey && store[idKey]) return { ...store[idKey] };
    if (emailKey && store[emailKey]) return { ...store[emailKey] };
    if (regKey && store[regKey]) return { ...store[regKey] };

    // Fallback to role defaults
    const r = (user.role || "student").toLowerCase();
    const defaults = ROLE_DEFAULTS[r] || { placement_access: true, social_media_access: false };
    return { ...defaults };
}

/**
 * Update permissions for a user
 */
async function setUserPermissions(key, perms) {
    const store = getPermissionsStore();
    const safeKey = String(key).toLowerCase();
    store[safeKey] = {
        placement_access: Boolean(perms.placement_access),
        social_media_access: Boolean(perms.social_media_access),
        updated_at: new Date().toISOString()
    };
    writeLocalPermissions(store);

    // Try updating Supabase users table if columns exist
    const client = supabaseAdmin || supabase;
    if (client) {
        try {
            await client.from("users").update({
                placement_access: perms.placement_access,
                social_media_access: perms.social_media_access
            }).or(`email.eq.${safeKey},register_number.eq.${key}`);
        } catch (e) {
            // Non-blocking if columns don't exist yet in Supabase
        }
    }

    return store[safeKey];
}

/**
 * List all configured custom permissions
 */
function getAllPermissions() {
    return getPermissionsStore();
}

module.exports = {
    getUserPermissions,
    setUserPermissions,
    getAllPermissions,
    ROLE_DEFAULTS
};
