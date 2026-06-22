/* ===============================
   SUPABASE CONFIG
   File: /js/supabase-config.js
================================ */

const SUPABASE_URL = "https://rppmrmaadchjrofmdkwp.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "PeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcG1ybWFhZGNoanJvZm1ka3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzQ3MTUsImV4cCI6MjA5NzQ1MDcxNX0.BHKiiIqfX2TKWSW4GY-TzmL9VR8J2nIJ720O2Pqmeq0";

window.tneSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);