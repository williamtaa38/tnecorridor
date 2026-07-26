/* =========================================
   PROTECT STUDENT-ONLY PAGES
   File: /js/auth-guard.js

   Load this after supabase-config.js on pages that
   require a logged-in student.
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.tneSupabase;

  if (!supabase) {
    window.location.replace("/pages/sign-in.html");
    return;
  }

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    localStorage.removeItem("tneSignedIn");
    localStorage.removeItem("tneCurrentStudentEmail");
    window.location.replace("/pages/sign-in.html");
    return;
  }

  window.tneCurrentUser = session.user;
});
