# Admin Portal University Loading Fix — v10.2

## What was wrong
The admin portal loaded Universities, Applications and the privileged `/api/admin-users` directory inside one `Promise.all()` call.

If the privileged account API failed (for example because `SUPABASE_SERVICE_ROLE_KEY` was not configured in Vercel), the entire load aborted even when the normal Supabase `universities` query had already succeeded. The UI therefore showed:
- 0 Universities
- no university rows
- an empty University dropdown in Create Officer Login

This also explains why adding an existing university returned a database duplicate error even though the table looked empty.

## What v10.2 changes
- Universities are loaded directly from `public.universities` and render independently of the privileged account API.
- Student/application/officer directory data is loaded directly through existing RLS-secured tables.
- `/api/admin-users` is only required for privileged Auth actions such as creating or disabling accounts.
- Create Officer Login now shows a clear active-university dropdown.
- If no active university exists, officer creation is disabled with a useful message.
- University rows show `Edit` plus `Deactivate` / `Activate` in the Universities tab.
- Account-service errors now explicitly tell the administrator to check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.

## Files to replace
- `/js/admin-portal.js`
- `/pages/admin-portal.html`

After deployment, hard refresh the browser with Ctrl+Shift+R.
