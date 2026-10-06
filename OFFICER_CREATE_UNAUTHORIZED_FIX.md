# BEA Admin account service

The Admin Portal sends privileged account-management actions to `/api/admin-users`.

The Vercel server function uses the BEA project environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep the service-role key server-side only. Do not place it in browser JavaScript.
