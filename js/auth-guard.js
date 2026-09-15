/* =========================================
   PROTECT STUDENT-ONLY PAGES
   File: /js/auth-guard.js

   Load after supabase-config.js on pages that
   require an authenticated ACTIVE student.
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const supabase = window.tneSupabase;

  async function redirectToSignIn() {
    localStorage.removeItem("tneSignedIn");
    localStorage.removeItem("tneCurrentStudentEmail");
    window.location.replace("/pages/sign-in.html");
  }

  if (!supabase) {
    await redirectToSignIn();
    return;
  }

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    await redirectToSignIn();
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,account_type,account_status,onboarding_completed")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Student profile guard failed:", profileError);
    await supabase.auth.signOut();
    await redirectToSignIn();
    return;
  }

  if (profile.account_status === "inactive") {
    await supabase.auth.signOut();
    await redirectToSignIn();
    return;
  }

  if (profile.account_type !== "student") {
    window.location.replace("/pages/staff-login.html");
    return;
  }

  window.tneCurrentUser = session.user;
  window.tneCurrentProfile = profile;
});
