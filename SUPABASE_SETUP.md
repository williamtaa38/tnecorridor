# TNE Corridor — Existing Supabase Integration Guide (v10)

This package is wired to the existing TNE Corridor Supabase project already referenced by `/js/supabase-config.js`.

The migration is designed for the **existing project**. It does **not** delete Supabase Auth users, passwords, sessions, or the old capitalized catalogue tables (`Universities`, `Courses`, `Scholarships`, `EntryRequirements`). It creates the new application tables and imports the legacy catalogue into them.

## What becomes the source of truth

- **Supabase Auth (`auth.users`)** — email/password login, verification, reset-password sessions.
- **`public.profiles`** — complete student/user profile and onboarding information.
- **`public.officer_profiles`** — Administrator and University Officer role + university assignment.
- **`public.universities`** — active university directory used by the new portals.
- **`public.courses`** — editable courses and fee structures.
- **`public.scholarships`** — percentage/fixed scholarships and application scope.
- **`public.entry_requirements`** — course/university entry rules.
- **`public.pathway_packages`** — progression packages.
- **`public.student_applications`** — student applications and officer review.
- **`public.offers`** — conditional offers, accepted/rejected status and offer-document metadata.
- **Supabase Storage** — private `application-documents` and `offer-documents` buckets.

The browser localStorage is only used as a short-lived UI cache. It is no longer the authoritative database.

## Step 1 — Back up before changing schema

In Supabase Dashboard, create/download a database backup before running the migration.

Do not delete the existing capitalized catalogue tables. The migration imports from them and leaves them available as a safety copy.

## Step 2 — Run the v4 migration

Open:

**Supabase Dashboard → SQL Editor → New query**

Run the entire file:

`/sql/supabase-integrated-admissions-v4.sql`

The migration will:

1. Keep all existing `auth.users` accounts and passwords.
2. Extend `public.profiles` to contain all student onboarding fields.
3. Backfill one public profile for every existing Auth user.
4. Convert old staff role names `officer → university_officer` and `admin → administrator` if any exist.
5. Create the lower-case application catalogue tables.
6. Import the existing `Universities`, `Courses`, `Scholarships`, and `EntryRequirements` records into the new tables without deleting the old records.
7. Create university-scoped RLS policies.
8. Make `application-documents` private.
9. Create a private `offer-documents` bucket.
10. Create the one-university offer acceptance rules and RPC functions.
11. Add Auth → profile synchronization triggers for future users.

## Step 3 — Verify the migration

Run:

`/sql/verify-supabase-integration.sql`

Important expected results:

- `missing_profiles = 0`
- all required application tables show `rls_enabled = true`
- both Storage buckets show `public = false`
- required functions are present
- the new lower-case catalogue contains the imported legacy universities/courses/scholarships

## Step 4 — Vercel environment variables

Go to:

**Vercel → TNE Corridor project → Settings → Environment Variables**

Add:

- `SUPABASE_URL` = your existing Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role secret

Use the service-role key only on the server. Never put it in HTML, browser JavaScript, `/js/supabase-config.js`, or a public Git repository.

Recommended Vercel environments:

- **Production:** both variables required.
- **Preview:** add both if you will test the Admin portal on preview deployments.
- **Development:** add both if you use `vercel dev` locally.

The publishable key in `/js/supabase-config.js` is a browser-safe publishable key and is expected to be visible to users. RLS is what protects the database.

## Step 5 — Supabase Auth URLs

Go to:

**Supabase → Authentication → URL Configuration**

Set:

- Site URL: `https://tnecorridor.com`

Add Redirect URLs:

- `https://tnecorridor.com/pages/sign-in.html`
- `https://tnecorridor.com/pages/reset-password.html`

For local testing also add the matching localhost URLs used by `vercel dev`.

## Step 6 — Email / SMTP

Password reset and verification depend on Supabase Auth email delivery.

Check:

**Supabase → Authentication → Email / SMTP**

Make sure your SMTP provider is configured and email sending is enabled.

Test both:

- new student verification email
- forgot-password / reset-password email

## Step 7 — Bootstrap the first Administrator

A normal student must never be able to make themselves an Administrator. Therefore the first Administrator must be bootstrapped once.

1. Create or invite the administrator in **Supabase → Authentication → Users**.
2. Copy that user's UUID.
3. Run the following in SQL Editor, replacing the values:

```sql
insert into public.officer_profiles
  (id, full_name, email, role, university_id, status)
values
  (
    'PASTE_AUTH_USER_UUID',
    'TNE Administrator',
    'admin@example.com',
    'administrator',
    null,
    'active'
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = 'administrator',
  university_id = null,
  status = 'active';
```

The database trigger automatically mirrors this role into `public.profiles`.

Then sign in through:

`/pages/staff-login.html`

Choose **TNE Administrator**.

## Step 8 — User/account flow

### Student

Registration:

`/pages/register.html`

The account is created in Supabase Auth with `account_type = student`. A public profile is created automatically by the database trigger.

Student onboarding then stores these fields directly in `public.profiles`:

- name
- phone
- nationality
- location
- preferred intake
- qualification
- completion year
- English level/score
- study interest
- certificate/results JSON
- selected courses
- scholarship preference
- estimated whole-course family budget
- academic strength
- accommodation requirement
- consent
- onboarding completion

Student sign-in:

`/pages/sign-in.html`

After login, the site reads the Supabase profile. If onboarding is incomplete it sends the student to onboarding; otherwise it opens the application portal.

### University Officer

Create accounts from:

**Administrator Portal → Officer Accounts**

The server-side `/api/admin-users.js` uses the service-role key to create the Auth user and then writes:

- `public.profiles`
- `public.officer_profiles`
- assigned `university_id`
- role = `university_officer`

RLS restricts officers to their own university.

### Administrator

Administrators are identified by:

`public.officer_profiles.role = 'administrator'`

They can manage users, university status, account activation/deactivation and password-reset emails.

## Step 9 — Password reset

Password reset is connected to Supabase Auth for:

- Student Sign In → **Forgot password?**
- Student Portal → reset password
- Staff Sign In → reset password
- University Officer Portal → reset password
- Administrator Portal → reset own/user password

The recovery link returns to:

`/pages/reset-password.html`

The page calls `supabase.auth.updateUser({ password })` after the recovery session is established.

## Step 10 — Catalogue integration

The migration imports the existing legacy catalogue into the new lower-case tables.

The new portals read/write only the new tables. This means a university officer can create/edit/delete a course or scholarship without modifying your old imported dataset.

The old tables remain available as a backup/reference until you decide to retire them.

## Step 11 — Application and document integration

Student application documents are uploaded to:

`application-documents/<student_uuid>/<application_id>/...`

RLS allows:

- the student to access their own files
- the assigned university officer to read files for applications assigned to their university
- an Administrator to read them

Formal and signed offer letters use:

`offer-documents/<university_id>/<offer_id>/formal/...`

and:

`offer-documents/<university_id>/<offer_id>/signed/<student_uuid>/...`

The files stay private; only authorized users can obtain signed URLs.

## Step 12 — Deployment

Replace your existing website files with this package, commit them, push to the Vercel-connected repository and redeploy.

After deployment, use a hard refresh (`Ctrl + Shift + R`).

## Final end-to-end test

1. Register a new student.
2. Verify the email.
3. Sign in.
4. Complete all six onboarding steps.
5. Confirm the data appears in `public.profiles`.
6. Test Forgot Password.
7. Sign in as Administrator.
8. Create a University Officer.
9. Sign in as the officer.
10. Create, edit and delete a test course.
11. Create, edit and delete a test scholarship.
12. Create an SPM progression package and confirm the immediate stage is Pre-U / Foundation / A-Level.
13. Submit a student application.
14. Review it as the correct university officer.
15. Upload application documents.
16. Issue a conditional offer.
17. Accept the offer as the student.
18. Upload the formal and signed offer letters.
19. Confirm a second university offer cannot also be accepted.
20. Run `verify-supabase-integration.sql` again.



## Password reset redirect (v10.4)

For production, set **Authentication > URL Configuration** to:

- Site URL: `https://tnecorridor.com`
- Redirect URL: `https://tnecorridor.com/pages/reset-password.html`
- Also allow: `https://www.tnecorridor.com/pages/reset-password.html`

The frontend now always requests the canonical `www` reset URL instead of deriving it from the current hostname.

For the most robust recovery flow (including opening the email on another device), edit **Authentication > Email Templates > Reset password** and use a TokenHash link:

```html
<h2>Reset your password</h2>
<p>We received a request to reset your password.</p>
<p>
  <a href="https://tnecorridor.com/pages/reset-password.html?token_hash={{ .TokenHash }}&type=recovery">
    Reset password
  </a>
</p>
<p>If you did not request this, you can ignore this email.</p>
```

The reset page supports both this TokenHash flow and Supabase PKCE `?code=` recovery links.
