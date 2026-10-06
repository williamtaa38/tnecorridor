# BEA — Supabase Connection Status

This BEA copy is **not connected to the source website Supabase project**. The source project URL and browser keys were removed so BEA cannot accidentally read or write the other website database.

## Required before BEA login / portal testing

1. Create or select the separate BEA Supabase project.
2. Put the BEA project URL and browser Publishable Key into `/js/supabase-config.js`.
3. In the BEA Vercel project, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Run the required BEA SQL migration files in the BEA Supabase SQL Editor.
5. Configure Authentication URLs for `https://britisheducationalliance.com`.
6. Configure email/SMTP and bootstrap the first Administrator.

See `SUPABASE_SETUP.md` and `BEA_SETUP_FIRST.md` for the exact settings.
