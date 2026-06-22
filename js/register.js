/* ===============================
   SUPABASE CONFIG
   File: /js/supabase-config.js
================================ */

console.log("✅ supabase-config.js loaded version 5");

const SUPABASE_URL = "https://rppmrmaadchjrofmdkwp.supabase.co";

/*
  Use ONE of these:

  Recommended for testing:
  Supabase → Project Settings → API Keys → Legacy anon public key

  It starts with:
  eyJ...

  Do NOT use:
  - API URL
  - Secret key
  - service_role key
*/
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcG1ybWFhZGNoanJvZm1ka3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzQ3MTUsImV4cCI6MjA5NzQ1MDcxNX0.BHKiiIqfX2TKWSW4GY-TzmL9VR8J2nIJ720O2Pqmeq0";

(function () {
  try {
    if (!window.supabase) {
      throw new Error("Supabase CDN did not load before supabase-config.js.");
    }

    if (SUPABASE_URL.includes("/rest/v1") || SUPABASE_URL.includes("/auth/v1")) {
      throw new Error("SUPABASE_URL must be only https://PROJECT_REF.supabase.co");
    }

    if (!SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase anon public key.");
    }

    window.tneSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    console.log("✅ Supabase client connected:", SUPABASE_URL);
    console.log("✅ Supabase key starts with:", SUPABASE_ANON_KEY.slice(0, 12));
  } catch (error) {
    console.error("❌ Supabase config error:", error);
    window.tneSupabase = null;
  }
})();