/* =========================================
   BEA SUPABASE CLIENT CONFIGURATION
   File: /js/supabase-config.js

   IMPORTANT:
   This BEA copy intentionally does NOT reuse the source project Supabase connection.
   Replace the two placeholders below with the URL and Publishable Key from
   the separate BEA Supabase project before using login / registration.
========================================= */

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://YOUR_BEA_PROJECT_REF.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "YOUR_BEA_SUPABASE_PUBLISHABLE_KEY";

  // Canonical BEA production auth redirects.
  // Add these URLs in Supabase > Authentication > URL Configuration.
  const BEA_PRODUCTION_ORIGIN = "https://britisheducationalliance.com";

  window.beaAuthRedirects = Object.freeze({
    passwordReset: `${BEA_PRODUCTION_ORIGIN}/pages/reset-password.html`
  });

  window.beaMarkPasswordRecoveryRequested = () => {
    try {
      window.localStorage.setItem("beaPasswordRecoveryPendingAt", String(Date.now()));
    } catch (_) {}
  };

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "Supabase JavaScript library did not load. Check that the Supabase CDN script is included before supabase-config.js."
    );
    window.beaSupabase = null;
    return;
  }

  if (window.beaSupabase) {
    console.warn("BEA Supabase client has already been initialized.");
    return;
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_URL.includes("YOUR_BEA_PROJECT_REF") ||
    SUPABASE_PUBLISHABLE_KEY.includes("YOUR_BEA_SUPABASE_PUBLISHABLE_KEY")
  ) {
    console.error(
      "BEA Supabase is not configured. Add the BEA project URL and publishable key in /js/supabase-config.js."
    );
    window.beaSupabase = null;
    return;
  }

  if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")) {
    console.error("The BEA Supabase project URL is not valid.");
    window.beaSupabase = null;
    return;
  }

  try {
    window.beaSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storage: window.localStorage
        }
      }
    );

    console.log("BEA Supabase client connected successfully.");
  } catch (error) {
    console.error("Unable to initialize BEA Supabase:", error);
    window.beaSupabase = null;
  }
})();
