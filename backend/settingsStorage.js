const fs = require("fs");
const path = require("path");
const { supabase, supabaseAdmin } = require("./supabase");

const SETTINGS_FILE_PATH = path.join(__dirname, "settings.json");

// Default initial portal settings
const DEFAULT_SETTINGS = {
    default_year: "2023-2027",
    default_year_num: 4,
    batches: [
        { id: 1, name: "2026-2030", year_num: 1, year_label: "1st Year", status: "active", is_default: false },
        { id: 2, name: "2025-2029", year_num: 2, year_label: "2nd Year", status: "active", is_default: false },
        { id: 3, name: "2024-2028", year_num: 3, year_label: "3rd Year", status: "active", is_default: false },
        { id: 4, name: "2023-2027", year_num: 4, year_label: "4th Year", status: "active", is_default: true },
        { id: 5, name: "2022-2026", year_num: 5, year_label: "Passed Out", status: "passed_out", is_default: false }
    ],
    updated_at: new Date().toISOString()
};

// In-memory cache
let inMemorySettings = null;

function readLocalSettingsFile() {
    try {
        if (fs.existsSync(SETTINGS_FILE_PATH)) {
            const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.batches)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[settingsStorage] Failed to read local settings.json:", e.message);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function writeLocalSettingsFile(data) {
    try {
        fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.warn("[settingsStorage] Failed to write local settings.json:", e.message);
    }
}

// Get client
function getClient() {
    return supabaseAdmin || supabase;
}

// Fetch settings
async function getSettings() {
    if (inMemorySettings) {
        return inMemorySettings;
    }

    const client = getClient();
    if (client) {
        try {
            const { data, error } = await client
                .from("portal_settings")
                .select("settings_data")
                .eq("setting_key", "general_settings")
                .maybeSingle();

            if (!error && data && data.settings_data && Array.isArray(data.settings_data.batches)) {
                inMemorySettings = data.settings_data;
                writeLocalSettingsFile(inMemorySettings);
                return inMemorySettings;
            }
        } catch (e) {
            // table might not exist in Supabase yet, fallback gracefully
        }
    }

    inMemorySettings = readLocalSettingsFile();
    return inMemorySettings;
}

// Save settings
async function saveSettings(newSettings) {
    newSettings.updated_at = new Date().toISOString();
    inMemorySettings = newSettings;
    writeLocalSettingsFile(newSettings);

    const client = getClient();
    if (client) {
        try {
            await client.from("portal_settings").upsert({
                setting_key: "general_settings",
                settings_data: newSettings,
                updated_at: new Date().toISOString()
            });
        } catch (e) {
            console.warn("[settingsStorage] Supabase save error (using file fallback):", e.message);
        }
    }

    return inMemorySettings;
}

// Update default year/batch
async function setDefaultBatch(batchName) {
    const current = await getSettings();
    let found = false;
    let targetYearNum = 4;

    current.batches.forEach(b => {
        if (b.name === batchName) {
            b.is_default = true;
            found = true;
            targetYearNum = b.year_num || (b.status === "passed_out" ? 5 : 4);
        } else {
            b.is_default = false;
        }
    });

    if (found) {
        current.default_year = batchName;
        current.default_year_num = targetYearNum;
    }

    return await saveSettings(current);
}

// Create a new batch & rollover the final year batch
async function createNewBatch({ name, start_year, end_year, promote_students = true, set_as_default = false }) {
    const current = await getSettings();
    let batchName = (name || "").trim();

    if (!batchName && start_year && end_year) {
        batchName = `${start_year}-${end_year}`;
    }

    if (!batchName) {
        throw new Error("Batch name or start and end year is required.");
    }

    // Check if batch name already exists
    const existingIndex = current.batches.findIndex(b => b.name === batchName);
    if (existingIndex !== -1) {
        throw new Error(`Batch "${batchName}" already exists.`);
    }

    // When a new batch is created:
    // - Current 4th Year (e.g. 2023-2027) becomes Passed Out (year_num: 5, status: 'passed_out')
    // - Current 3rd Year becomes 4th Year
    // - Current 2nd Year becomes 3rd Year
    // - Current 1st Year becomes 2nd Year
    // - New batch is 1st Year (year_num: 1, status: 'active')
    // - Existing passed out batches (like 2022-2026) remain passed out!

    const updatedBatches = [];
    const passedOutBatches = [];

    // First collect existing passed out batches
    current.batches.forEach(b => {
        if (b.status === "passed_out" || b.year_num === 5) {
            b.status = "passed_out";
            b.year_label = "Passed Out";
            b.year_num = 5;
            b.is_default = false;
            passedOutBatches.push(b);
        }
    });

    // Advance active batches
    const activeBatches = current.batches.filter(b => b.status !== "passed_out" && b.year_num !== 5);
    activeBatches.sort((a, b) => b.year_num - a.year_num);

    activeBatches.forEach(b => {
        if (b.year_num === 4) {
            // Current final year batch transitions to Passed Out!
            b.year_num = 5;
            b.status = "passed_out";
            b.year_label = "Passed Out";
            b.is_default = false;
            passedOutBatches.unshift(b); // Put newly passed out at top of passed out list
        } else if (b.year_num === 3) {
            b.year_num = 4;
            b.year_label = "4th Year";
            updatedBatches.push(b);
        } else if (b.year_num === 2) {
            b.year_num = 3;
            b.year_label = "3rd Year";
            updatedBatches.push(b);
        } else if (b.year_num === 1) {
            b.year_num = 2;
            b.year_label = "2nd Year";
            updatedBatches.push(b);
        } else {
            updatedBatches.push(b);
        }
    });

    // Create the new 1st Year batch
    const newBatch = {
        id: Date.now(),
        name: batchName,
        year_num: 1,
        year_label: "1st Year",
        status: "active",
        is_default: false
    };

    updatedBatches.push(newBatch);

    // Sort active batches 1 to 4
    updatedBatches.sort((a, b) => a.year_num - b.year_num);

    // Combine active batches and passed out batches
    const finalBatches = [...updatedBatches, ...passedOutBatches];

    // Determine default year
    if (set_as_default) {
        finalBatches.forEach(b => b.is_default = (b.name === batchName));
        current.default_year = batchName;
        current.default_year_num = 1;
    } else {
        // Find 4th year batch or keep current default if valid
        const defaultMatch = finalBatches.find(b => b.name === current.default_year);
        if (!defaultMatch) {
            const finalYear = finalBatches.find(b => b.year_num === 4) || finalBatches[0];
            finalBatches.forEach(b => b.is_default = (b.name === finalYear.name));
            current.default_year = finalYear.name;
            current.default_year_num = finalYear.year_num;
        } else {
            finalBatches.forEach(b => b.is_default = (b.name === current.default_year));
            current.default_year_num = defaultMatch.year_num;
        }
    }

    current.batches = finalBatches;

    // Promote students in the database if requested
    if (promote_students) {
        await advanceStudentYearsInDb();
    }

    return await saveSettings(current);
}

// Increment student years in DB: 4 -> 5 (passed out), 3 -> 4, 2 -> 3, 1 -> 2
async function advanceStudentYearsInDb() {
    const client = getClient();
    if (!client) return;

    try {
        console.log("[settingsStorage] Advancing student academic years in DB...");
        // 4 -> 5 (Passed out)
        await client.from("users").update({ year: 5 }).eq("year", 4).eq("role", "student");
        // 3 -> 4
        await client.from("users").update({ year: 4 }).eq("year", 3).eq("role", "student");
        // 2 -> 3
        await client.from("users").update({ year: 3 }).eq("year", 2).eq("role", "student");
        // 1 -> 2
        await client.from("users").update({ year: 2 }).eq("year", 1).eq("role", "student");
        console.log("✅ [settingsStorage] Successfully advanced student years in DB.");
    } catch (e) {
        console.warn("[settingsStorage] Error advancing student years in DB:", e.message);
    }
}

// Delete batch
async function deleteBatch(batchName) {
    const current = await getSettings();
    const idx = current.batches.findIndex(b => b.name === batchName);
    if (idx === -1) {
        throw new Error(`Batch "${batchName}" not found.`);
    }

    current.batches.splice(idx, 1);

    // If deleted batch was default, pick another active batch
    if (current.default_year === batchName) {
        const fallback = current.batches.find(b => b.status === "active") || current.batches[0];
        if (fallback) {
            current.default_year = fallback.name;
            current.default_year_num = fallback.year_num;
            fallback.is_default = true;
        }
    }

    return await saveSettings(current);
}

// Toggle batch passed out status
async function toggleBatchPassedOut(batchName, isPassedOut) {
    const current = await getSettings();
    const batch = current.batches.find(b => b.name === batchName);
    if (!batch) {
        throw new Error(`Batch "${batchName}" not found.`);
    }

    batch.status = isPassedOut ? "passed_out" : "active";
    batch.year_label = isPassedOut ? "Passed Out" : (batch.year_num ? `Year ${batch.year_num}` : "Active");
    if (isPassedOut) {
        batch.year_num = 5;
    }

    return await saveSettings(current);
}

module.exports = {
    getSettings,
    saveSettings,
    setDefaultBatch,
    createNewBatch,
    deleteBatch,
    toggleBatchPassedOut,
    advanceStudentYearsInDb
};
