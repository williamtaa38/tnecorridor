document.addEventListener("DOMContentLoaded", async function () {
  "use strict";
  const supabase = window.tneSupabase;
  const role = document.getElementById("staffRole");
  const university = document.getElementById("staffUniversity");
  const universityWrap = document.getElementById("universitySelectWrap");
  const email = document.getElementById("staffEmail");
  const password = document.getElementById("staffPassword");
  const form = document.getElementById("staffLoginForm");
  const submit = form?.querySelector('button[type="submit"]');

  function message(text, type="warning") {
    let box = document.getElementById("staffLoginStatus");
    if (!box) {
      box = document.createElement("div"); box.id = "staffLoginStatus"; box.className = `notice ${type}`;
      form.parentElement.insertBefore(box, form);
    }
    box.className = `notice ${type}`; box.textContent = text;
  }
  if (!supabase) { message("Supabase is not connected.","warning"); if(submit) submit.disabled=true; return; }

  const { data:univs } = await supabase.from("universities").select("id,name,status").eq("status","active").order("name");
  university.innerHTML = (univs || []).map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)}</option>`).join("");

  function refreshRole() { const admin = role.value === "administrator"; universityWrap.hidden = admin; university.required = !admin; }
  role.addEventListener("change", refreshRole); refreshRole();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!email.value.trim() || !password.value) return;
    if(submit) submit.disabled=true;
    message("Signing in…","success");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email:email.value.trim().toLowerCase(), password:password.value });
      if (error) throw error;
      const { data:profile, error:pe } = await supabase.from("officer_profiles").select("id,full_name,email,role,university_id,status").eq("id",data.user.id).maybeSingle();
      if(pe) throw pe;
      if(!profile || profile.status === "inactive") throw new Error("This account does not have active staff access.");
      if(profile.role !== role.value) throw new Error("The selected account type does not match this account.");
      if(profile.role === "university_officer" && profile.university_id !== university.value) throw new Error("This officer account belongs to a different university.");
      sessionStorage.setItem("tneStaffSessionV1", JSON.stringify({ role:profile.role, name:profile.full_name || data.user.email, email:profile.email || data.user.email, universityId:profile.university_id || "" }));
      window.location.href = profile.role === "administrator" ? "/pages/admin-portal.html" : "/pages/university-portal.html";
    } catch(err) { message(err.message || "Unable to sign in.","warning"); if(submit) submit.disabled=false; }
  });

  document.getElementById("forgotStaffPassword")?.addEventListener("click", async () => {
    const address = email.value.trim().toLowerCase();
    if(!address){ message("Enter your email address first.","warning"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(address,{ redirectTo:`${window.location.origin}/pages/reset-password.html` });
    message(error ? error.message : "Password reset email sent. Check your inbox.", error ? "warning" : "success");
  });

  function escapeHtml(v){ return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
});
