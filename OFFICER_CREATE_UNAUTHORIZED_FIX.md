# v10.3 Officer Creation Unauthorized Fix

The Admin Portal now sends privileged account-management actions directly to the secured Supabase Edge Function `tne-admin-users` instead of relying on the Vercel `/api/admin-users` route.

This fixes the generic `Unauthorized` error seen while creating university officers when Vercel server environment credentials were missing, stale, or pointed to a different Supabase project.

The Edge Function validates the signed-in Supabase user, verifies `officer_profiles.role = administrator` and active status, then uses server-side Supabase credentials to create the Auth user and linked profile records.
