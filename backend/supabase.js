const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || "https://xdcctmnqmlvcibuhlcvx.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log("⚡ Supabase Client initialized successfully for URL:", supabaseUrl);
    } catch (e) {
        console.error("❌ Failed to initialize Supabase client:", e.message);
    }
} else {
    console.warn("⚠️ Supabase credentials missing in environment variables.");
}

// Connectivity test function
async function testSupabaseConnection() {
    if (!supabaseAdmin) {
        return { success: false, message: "Supabase client not initialized" };
    }
    try {
        // Query users table or default system table to test connection
        const { data, error } = await supabaseAdmin.from("users").select("count", { count: "exact", head: true });
        if (error && error.code !== "PGRST116" && !error.message.includes("does not exist")) {
            console.error("Supabase test query error:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true, message: "Connected to Supabase successfully!" };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    supabase,
    supabaseAdmin,
    testSupabaseConnection
};
