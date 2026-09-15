/* =========================================
   SUPABASE CLIENT CONFIGURATION
   File: /js/supabase-config.js
========================================= */

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://rppmrmaadchjrofmdkwp.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_3SwHa4P3MlKtl0Wr3Hsu3g_o8Id5D4S";

  // Canonical production auth redirects. Keep these explicit instead of
  // deriving them from window.location.origin because tnecorridor.com and
  // www.tnecorridor.com may redirect to each other. Supabase requires the
  // redirect URL to match its Authentication > URL Configuration allow list.
  const TNE_PRODUCTION_ORIGIN = "https://tnecorridor.com";

  window.tneAuthRedirects = Object.freeze({
    passwordReset: `${TNE_PRODUCTION_ORIGIN}/pages/reset-password.html`
  });

  window.tneMarkPasswordRecoveryRequested = () => {
    try {
      window.localStorage.setItem("tnePasswordRecoveryPendingAt", String(Date.now()));
    } catch (_) {}
  };

  /**
   * Check whether the Supabase CDN library loaded.
   */
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "Supabase JavaScript library did not load. Check that the Supabase CDN script is included before supabase-config.js."
    );

    window.tneSupabase = null;
    return;
  }

  /**
   * Prevent the Supabase client from being created more than once.
   */
  if (window.tneSupabase) {
    console.warn("Supabase client has already been initialized.");
    return;
  }

  /**
   * Check whether the project configuration is complete.
   */
  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_URL.includes("YOUR_PROJECT_REFERENCE") ||
    SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE_PUBLISHABLE_KEY")
  ) {
    console.error(
      "Supabase configuration is incomplete. Add your project URL and publishable key in /js/supabase-config.js."
    );

    window.tneSupabase = null;
    return;
  }

  /**
   * Check the Supabase project URL format.
   */
  if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")) {
    console.error("The Supabase project URL is not valid.");

    window.tneSupabase = null;
    return;
  }

  try {
    /**
     * Create the Supabase browser client.
     */
    window.tneSupabase = window.supabase.createClient(
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

    console.log("Supabase client connected successfully.");
  } catch (error) {
    console.error("Unable to initialize Supabase:", error);

    window.tneSupabase = null;
  }
})();