# TNE Corridor — Supabase Integration Setup

This version uses the existing browser Supabase project configured in `/js/supabase-config.js` and adds database-backed courses, scholarships, pathway packages, applications, offers and role-based staff access.

## 1. Back up Supabase first
In Supabase Dashboard, make a database backup/export before running the migration.

## 2. Run the migration
Open **Supabase Dashboard → SQL Editor → New query** and run the entire file:

`/sql/supabase-integrated-admissions-v2.sql`

It creates/updates:
- `universities`
- `courses`
- `scholarships`
- `pathway_packages`
- `offers`
- additional university-review fields on `student_applications`
- staff role/university fields on `officer_profiles`
- RLS policies
- private application-document storage rules
- the one-university `accept_offer()` database function

The migration also converts old staff roles `officer → university_officer` and `admin → administrator`.

## 3. Add Vercel environment variables
In **Vercel → Project → Settings → Environment Variables**, add:

- `SUPABASE_URL` = your existing project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase Dashboard → Project Settings → API → service role key

`SUPABASE_SERVICE_ROLE_KEY` is a **secret**. Never put it in browser JavaScript, GitHub, HTML, or `supabase-config.js`.

For the live site, Production is required. If you test the administrator account-creation functions on Preview or local Vercel development, add the same variables to those environments too.

The browser publishable key already belongs in `/js/supabase-config.js`; it is not the service-role secret.

## 4. Configure Auth URLs
In **Supabase → Authentication → URL Configuration**:

- Site URL: `https://tnecorridor.com`
- Add Redirect URL: `https://tnecorridor.com/pages/reset-password.html`
- If using Vercel previews, add the relevant preview domain reset-password URL.
- For local testing, add `http://localhost:3000/pages/reset-password.html` if that is your local Vercel URL.

Password-reset emails use this page.

## 5. Create the first administrator
The administrator API intentionally refuses requests unless the signed-in account is already an administrator. Bootstrap the first administrator once:

1. Go to **Supabase → Authentication → Users** and create/invite the administrator user.
2. Copy that user's UUID.
3. Run this in SQL Editor, replacing the values:

```sql
insert into public.officer_profiles
  (id, full_name, email, role, university_id, status)
values
  ('PASTE_AUTH_USER_UUID', 'TNE Administrator', 'admin@example.com', 'administrator', null, 'active')
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  university_id = null,
  status = 'active';
```

After that, sign in at `/pages/staff-login.html` as **TNE Administrator**. The administrator can create university-officer accounts from the portal.

## 6. University officers
Create officer accounts from **Administrator Portal → Officer Accounts**. Each account is bound to one university in `officer_profiles.university_id`.

An officer can create, edit and delete only that university's courses, scholarships and pathway packages because RLS enforces the university scope.

## 7. Password reset
Password reset is now available for:
- students on the student sign-in page and student portal
- university officers on the officer portal and staff login
- administrators on the admin portal
- administrators can also send reset emails to individual student/officer accounts

Supabase email delivery/SMTP must be configured for reset emails to arrive.

## 8. Important pathway behaviour
For an SPM / IGCSE / O-Level entry, the **Immediate Target Award** is automatically restricted to **Pre-U / Foundation / A-Level**. The officer may still choose a higher **Final Intended Award** such as Degree or Master, and the pathway builder inserts the required intermediate stages.

Examples:
- SPM → Foundation/A-Level → Degree
- SPM → Foundation/A-Level → Degree → Master
- Foundation/A-Level/STPM/UEC/Diploma → Degree
- Degree → Master

The package cannot be saved until a real active course is selected for every required stage.

## 9. Whole-course family budget
Student onboarding and application forms now ask for **Estimated Whole-Course Family Budget**, not yearly family budget. The selected value is saved to `student_applications.financial_band` for university review.

## 10. Deploy
Commit the changed files, push to your Vercel-connected repository, then redeploy. After deployment test in this order:

1. Student registration/sign-in
2. Student password reset
3. Administrator staff sign-in
4. Create a university officer
5. Officer sign-in
6. Create → edit → delete a course
7. Create → edit → delete a scholarship
8. Create an SPM pathway and confirm the immediate target is Pre-U/Foundation/A-Level
9. Submit a student application
10. Review it as the correct university officer
11. Issue an offer
12. Accept it as the student and confirm other active offers close
