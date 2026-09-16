/**
 * Department Normalizer & 3NF Resolver
 * Ensures that any department input (abbreviation, case variant, or typo)
 * resolves to a valid 3NF department record, storing ONLY department_id.
 */

// Official department catalog
const DEPARTMENTS = [
    {
        id: 1,
        department_code: "CSBS",
        department_name: "Computer Science and Business Systems"
    }
];

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    const aLen = a.length;
    const bLen = b.length;

    for (let i = 0; i <= bLen; i++) matrix[i] = [i];
    for (let j = 0; j <= aLen; j++) matrix[0][j] = j;

    for (let i = 1; i <= bLen; i++) {
        for (let j = 1; j <= aLen; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[bLen][aLen];
}

/**
 * Calculates string similarity ratio between 0 and 1
 */
function stringSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    const dist = levenshteinDistance(s1, s2);
    return (longer.length - dist) / longer.length;
}

/**
 * Normalizes and resolves department input.
 * Accepts string or numeric ID.
 * 
 * Returns:
 *   { success: true, department_id: 1, department_code: "CSBS", department_name: "Computer Science and Business Systems" }
 * or
 *   { success: false, error: "Invalid department. Only authorized departments (e.g. Computer Science and Business Systems / CSBS) are accepted." }
 */
function normalizeDepartment(input) {
    if (input === null || input === undefined || input === "") {
        return {
            success: false,
            error: "Invalid department. Only authorized departments (e.g. Computer Science and Business Systems / CSBS) are accepted."
        };
    }

    // If already a numeric department_id
    if (typeof input === "number" || (/^\d+$/.test(String(input).trim()))) {
        const idNum = parseInt(input, 10);
        const match = DEPARTMENTS.find(d => d.id === idNum);
        if (match) {
            return {
                success: true,
                department_id: match.id,
                department_code: match.department_code,
                department_name: match.department_name
            };
        }
        return {
            success: false,
            error: "Invalid department. Only authorized departments (e.g. Computer Science and Business Systems / CSBS) are accepted."
        };
    }

    // Step 1: Trim, collapse multiple spaces, convert to lowercase
    const raw = String(input).trim().replace(/\s+/g, " ").toLowerCase();

    // Step 2: Check direct abbreviation matches (e.g., csbs, c.s.b.s, c-s-b-s)
    const stripped = raw.replace(/[^a-z0-9]/g, "");
    if (stripped === "csbs") {
        const d = DEPARTMENTS[0];
        return {
            success: true,
            department_id: d.id,
            department_code: d.department_code,
            department_name: d.department_name
        };
    }

    // Step 3: Clean string for phrase matching (& -> and, remove non-alphanumeric except spaces)
    const normalized = raw
        .replace(/&/g, "and")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Canonical CSBS target
    const canonicalName = "computer science and business systems";
    const canonicalWithoutAnd = "computer science business systems";

    if (normalized === canonicalName || normalized === canonicalWithoutAnd) {
        const d = DEPARTMENTS[0];
        return {
            success: true,
            department_id: d.id,
            department_code: d.department_code,
            department_name: d.department_name
        };
    }

    // Step 4: Token/keyword matching for variations and typos
    // E.g. "Computer Scinece and Business Sytems", "Computer Scince & Business Systems"
    const words = normalized.split(" ");
    const hasComputer = words.some(w => stringSimilarity(w, "computer") >= 0.75 || w.startsWith("comp"));
    const hasScience = words.some(w => stringSimilarity(w, "science") >= 0.70 || w.startsWith("sci"));
    const hasBusiness = words.some(w => stringSimilarity(w, "business") >= 0.70 || w.startsWith("bus"));
    const hasSystems = words.some(w => stringSimilarity(w, "systems") >= 0.70 || stringSimilarity(w, "system") >= 0.70 || w.startsWith("sys"));

    if (hasComputer && hasScience && hasBusiness && hasSystems) {
        const d = DEPARTMENTS[0];
        return {
            success: true,
            department_id: d.id,
            department_code: d.department_code,
            department_name: d.department_name
        };
    }

    // Step 5: Fuzzy match against full canonical name
    const similarity = stringSimilarity(normalized, canonicalName);
    if (similarity >= 0.75) {
        const d = DEPARTMENTS[0];
        return {
            success: true,
            department_id: d.id,
            department_code: d.department_code,
            department_name: d.department_name
        };
    }

    // If input does not match any valid department
    return {
        success: false,
        error: "Invalid department. Only authorized departments (e.g. Computer Science and Business Systems / CSBS) are accepted."
    };
}

/**
 * Resolve department or throw a descriptive error
 */
function resolveDepartmentOrThrow(input) {
    const result = normalizeDepartment(input);
    if (!result.success) {
        const err = new Error(result.error);
        err.statusCode = 400;
        throw err;
    }
    return result;
}

/**
 * Get department info by ID
 */
function getDepartmentById(id) {
    const num = parseInt(id, 10);
    return DEPARTMENTS.find(d => d.id === num) || {
        id: 1,
        department_code: "CSBS",
        department_name: "Computer Science and Business Systems"
    };
}

module.exports = {
    DEPARTMENTS,
    normalizeDepartment,
    resolveDepartmentOrThrow,
    getDepartmentById
};
