/* ===============================
   SUPABASE CONFIG
   File: /js/supabase-config.js
================================ */

const SUPABASE_URL = "https://rppmrmaadchjrofmdkwp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3SwHa4P3MlKtl0Wr3Hsu3g_o8Id5D4S";

(function () {
  try {
    if (!window.supabase) {
      throw new Error("Supabase CDN not loaded. Check script order in register.html.");
    }

    if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.includes(".supabase.co")) {
      throw new Error("Invalid Supabase URL.");
    }

    if (SUPABASE_URL.includes("/rest/v1") || SUPABASE_URL.includes("/auth/v1")) {
      throw new Error("SUPABASE_URL must not include /rest/v1 or /auth/v1.");
    }

    if (!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
      throw new Error("Invalid Supabase Publishable key. Use the Publishable key, not Secret key.");
    }

    window.tneSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    console.log("✅ Supabase client connected:", SUPABASE_URL);
  } catch (error) {
    console.error("❌ Supabase config error:", error);
    window.tneSupabase = null;
  }
})();