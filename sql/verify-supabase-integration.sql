-- TNE Corridor - read-only Supabase verification checks
-- Run AFTER supabase-integrated-admissions-v4.sql.

-- 1) Required tables
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'profiles','officer_profiles','universities','courses','scholarships',
    'entry_requirements','pathway_packages','student_applications','offers'
  )
order by table_name;

-- 2) Auth users vs public profiles. missing_profiles must be 0.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as public_profiles,
  (
    select count(*)
    from auth.users u
    left join public.profiles p on p.id=u.id
    where p.id is null
  ) as missing_profiles;

-- 3) Staff profile synchronization. mismatched_staff_profiles must be 0.
select count(*) as mismatched_staff_profiles
from public.officer_profiles o
join public.profiles p on p.id=o.id
where p.account_type is distinct from o.role
   or p.account_status is distinct from o.status;

-- 4) RLS must be enabled on all application tables.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace='public'::regnamespace
  and relname in (
    'profiles','officer_profiles','universities','courses','scholarships',
    'entry_requirements','pathway_packages','student_applications','offers'
  )
order by relname;

-- 5) Private buckets. public must be false.
select id, public
from storage.buckets
where id in ('application-documents','offer-documents')
order by id;

-- 6) Required RPC/helper functions.
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'accept_offer','reject_offer','record_signed_offer_document',
    'is_admin','is_officer_for','can_staff_access_application'
  )
order by routine_name;

-- 7) Catalogue/application counts.
select
  (select count(*) from public.universities) as universities,
  (select count(*) from public.courses) as courses,
  (select count(*) from public.scholarships) as scholarships,
  (select count(*) from public.entry_requirements) as entry_requirements,
  (select count(*) from public.pathway_packages) as pathway_packages,
  (select count(*) from public.student_applications) as applications,
  (select count(*) from public.offers) as offers;

-- 8) Confirm old catalogue tables still exist as a safety copy.
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('Universities','Courses','Scholarships','EntryRequirements')
order by table_name;

-- 9) Find any broad old application-document policies that should no longer exist.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname='storage'
  and tablename='objects'
  and policyname in (
    'Authenticated users can read application documents',
    'Authenticated users can update application documents',
    'Authenticated users can upload application documents'
  );
-- Expected: zero rows.
