document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const supabase = window.tneSupabase;
  const form = document.getElementById("resetPasswordForm");
  const status = document.getElementById("resetPasswordStatus");
  const submit = form?.querySelector('button[type="submit"]');
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmNewPassword");

  if (!form || !status) return;

  const show = (message, kind = "") => {
    status.textContent = message;
    status.className = `signin-status ${kind}`.trim();
    if (message) status.classList.add("visible");
  };

  const setReady = (ready) => {
    if (submit) submit.disabled = !ready;
    if (newPassword) newPassword.disabled = !ready;
    if (confirmPassword) confirmPassword.disabled = !ready;
  };

  if (!supabase) {
    setReady(false);
    show("Supabase is not connected. Please contact TNE Corridor support.", "error");
    return;
  }

  setReady(false);
  show("Verifying your password reset link…", "info");

  async function waitForSession(timeoutMs = 1600) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const { data } = await supabase.auth.getSession();
      if (data?.session) return data.session;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return null;
  }

  async function establishRecoverySession() {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const code = params.get("code");

    // Preferred production flow: custom recovery email template using TokenHash.
    // This works even when the email is opened on another device/browser.
    if (tokenHash && type === "recovery") {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery"
      });
      if (error) throw error;
      return data?.session || (await waitForSession());
    }

    // PKCE reset links normally auto-exchange because detectSessionInUrl=true.
    // Give the client time to finish before attempting an explicit exchange.
    let session = await waitForSession();
    if (session) return session;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data?.session || (await waitForSession());
    }

    return null;
  }

  let recoverySession = null;
  try {
    recoverySession = await establishRecoverySession();
  } catch (error) {
    console.error("Password recovery verification error:", error);
    const message = String(error?.message || "");
    if (/code verifier|pkce/i.test(message)) {
      show(
        "This reset link was opened in a different browser/device from the one that requested it. Please request a new password reset email and open it in the same browser, or use the new recovery link after the email template is updated.",
        "error"
      );
    } else {
      show(
        message || "This password reset link is invalid, expired, or has already been used. Please request a new one.",
        "error"
      );
    }
    return;
  }

  if (!recoverySession) {
    show(
      "This page does not contain a valid password reset session. Please request a new password reset email.",
      "error"
    );
    return;
  }

  // Remove one-time codes from the address bar after Supabase has accepted them.
  try {
    history.replaceState({}, document.title, window.location.pathname);
  } catch (_) {}

  setReady(true);
  show("Reset link verified. Enter your new password below.", "success");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = newPassword?.value || "";
    const confirmation = confirmPassword?.value || "";

    if (password.length < 8) {
      show("Use at least 8 characters.", "error");
      return;
    }
    if (password !== confirmation) {
      show("The passwords do not match.", "error");
      return;
    }

    if (submit) submit.disabled = true;
    show("Updating your password…", "info");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      let destination = "/pages/sign-in.html";

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.account_type === "administrator" || profile?.account_type === "university_officer") {
          destination = "/pages/staff-login.html";
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      try {
        localStorage.removeItem("tnePasswordRecoveryPendingAt");
      } catch (_) {}

      show("Password updated successfully. Returning to sign in…", "success");
      await supabase.auth.signOut();
      setTimeout(() => window.location.replace(destination), 1200);
    } catch (error) {
      console.error("Password update error:", error);
      show(error?.message || "Unable to update your password. Please request a new reset link.", "error");
      if (submit) submit.disabled = false;
    }
  });
});
