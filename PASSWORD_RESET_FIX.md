# TNE Corridor v10.4 Password Reset Fix

The previous reset request derived its redirect URL from `window.location.origin`. Because the live site can move between `tnecorridor.com` and `www.tnecorridor.com`, Supabase could reject the redirect target and fall back to the Site URL root.

This update:
- uses the canonical reset URL `https://tnecorridor.com/pages/reset-password.html`;
- supports PKCE `?code=` reset links;
- supports cross-device TokenHash recovery links;
- adds a same-browser root fallback when Supabase returns to `/` with a recovery code;
- validates the recovery session before enabling the password form;
- redirects staff to Staff Sign In and students to Student Sign In after a successful reset.

Manual Supabase settings are still required: add both reset URLs to Authentication > URL Configuration and update the Recovery email template to the TokenHash version documented in `SUPABASE_SETUP.md`.
