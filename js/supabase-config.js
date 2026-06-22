/* ===============================
   SUPABASE CONFIG
   File: /js/supabase-config.js
================================ */

const SUPABASE_URL = "https://rppmrmaadchjrofmdkwp.supabase.co/rest/v1/";

/*
  Use your Publishable key from:
  Supabase Dashboard → Project Settings → API Keys → Publishable key

  It should look like:
  sb_publishable_xxxxxxxxxxxxxxxxxxxxx

  Do NOT use the Secret key.
*/
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3SwHa4P3MlKtl0Wr3Hsu3g_o8Id5D4S";

window.tneSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);