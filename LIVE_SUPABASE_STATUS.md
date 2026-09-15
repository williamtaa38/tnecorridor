# TNE Corridor — Live Supabase Status

The existing Supabase project used by `/js/supabase-config.js` has been upgraded for the v10 admissions system.

## Completed in Supabase

- Existing Auth users and passwords preserved.
- `profiles` expanded for complete student onboarding data.
- Auth-to-profile synchronization added for future users.
- Existing legacy university/course/scholarship/entry-requirement data imported into the new lower-case application tables without deleting the old tables.
- New `universities`, `courses`, `scholarships`, `entry_requirements`, `pathway_packages`, and `offers` tables connected.
- Existing `student_applications` extended for university review and financial/pathway fields.
- Role-based RLS added for students, University Officers and Administrators.
- Student application status/security fields protected from self-approval.
- `application-documents` changed from public to private.
- Private `offer-documents` bucket created.
- One-university offer acceptance enforced at database level.
- Password-reset flows use Supabase Auth.
- Security-definer trigger functions removed from anonymous API execution.

## Verified live state

- Auth user/profile synchronization: no missing public profile records.
- All new application tables have RLS enabled.
- Both document buckets are private.
- Offer acceptance/rejection/document RPC functions exist.
- Existing legacy catalogue tables are still present as a safety copy.
- The browser Supabase URL and publishable-key project match the connected project.

## Still requires your dashboard configuration

1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
2. Configure Supabase Auth Site URL / Redirect URLs.
3. Make sure SMTP/email delivery works.
4. Designate the first Administrator account. No Administrator/University Officer existed when the integration was checked, so no existing student account was promoted automatically.
5. Enable Supabase Auth leaked-password protection if available on your plan.

See `SUPABASE_SETUP.md` for the exact steps.
