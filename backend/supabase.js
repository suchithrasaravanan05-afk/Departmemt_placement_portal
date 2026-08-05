const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL || "https://xdcctmnqmlvcibuhlcvx.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkY2N0bW5xbWx2Y2lidWhsY3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTYzMzIsImV4cCI6MjEwMDg3MjMzMn0.KnDvm6ClLNMoH840tIqyFSAIk6YVOKWwXue-Aa_o4wQ";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkY2N0bW5xbWx2Y2lidWhsY3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI5NjMzMiwiZXhwIjoyMTAwODcyMzMyfQ.Aj27NDNfoiFSqaz6gxGTOZWcQfl2N6H099vHR46ozKM";

let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl) {
    try {
        if (supabaseAnonKey) {
            supabase = createClient(supabaseUrl, supabaseAnonKey);
        }
        if (supabaseServiceKey) {
            supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        } else {
            supabaseAdmin = supabase;
        }
        console.log("⚡ Supabase Client initialized successfully for URL:", supabaseUrl);
    } catch (e) {
        console.error("❌ Failed to initialize Supabase client:", e.message);
    }
} else {
    console.warn("⚠️ Supabase credentials missing.");
}

// Connectivity test function
async function testSupabaseConnection() {
    const client = supabaseAdmin || supabase;
    if (!client) {
        return { success: false, message: "Supabase client not initialized" };
    }
    try {
        const { data, error } = await client.from("users").select("id", { count: "exact", head: true });
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

