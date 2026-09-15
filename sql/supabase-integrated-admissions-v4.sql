-- ============================================================
-- TNE Corridor - Supabase integrated admissions schema v4
-- Safe/idempotent migration for an EXISTING Supabase project.
--
-- PURPOSE
--   * preserve all existing auth.users, passwords and sessions
--   * backfill a public profile for every existing Auth user
--   * save complete student onboarding information in Supabase
--   * support administrator + university officer role access
--   * support courses, scholarships, pathway packages, entry rules, applications and offers
--   * import the existing legacy Universities/Courses/Scholarships/EntryRequirements rows without deleting them
--   * keep application / offer documents in private Storage buckets
--   * enforce one accepted university offer per student
--
-- IMPORTANT
--   * passwords stay only in Supabase Auth; they are never copied into public tables
--   * run after taking a Supabase backup
--   * designed to be re-runnable and non-destructive to user/application rows
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) University directory
-- ------------------------------------------------------------
create table if not exists public.universities (
  id text primary key,
  name text not null,
  short_name text,
  location text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.universities add column if not exists short_name text;
alter table public.universities add column if not exists location text;
alter table public.universities add column if not exists status text default 'active';
alter table public.universities add column if not exists created_at timestamptz default now();
alter table public.universities add column if not exists updated_at timestamptz default now();
update public.universities set status='active' where status is null or status='';
alter table public.universities drop constraint if exists universities_status_check;
alter table public.universities add constraint universities_status_check
  check (status in ('active','inactive'));

-- ------------------------------------------------------------
-- 2) Application profile for EVERY Supabase Auth user
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  account_type text not null default 'student',
  account_status text not null default 'active',
  onboarding_completed boolean not null default false,
  phone text,
  nationality text,
  location text,
  preferred_intake text,
  qualification text,
  completion_year text,
  english_level text,
  english_score text,
  study_interest text,
  certificate_results jsonb not null default '{}'::jsonb,
  selected_courses jsonb not null default '[]'::jsonb,
  wants_scholarship text,
  budget_range text,
  academic_strength text,
  need_accommodation text,
  consent_given boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing projects may already have a smaller profiles table.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists account_type text default 'student';
alter table public.profiles add column if not exists account_status text default 'active';
alter table public.profiles add column if not exists onboarding_completed boolean default false;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists nationality text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists preferred_intake text;
alter table public.profiles add column if not exists qualification text;
alter table public.profiles add column if not exists completion_year text;
alter table public.profiles add column if not exists english_level text;
alter table public.profiles add column if not exists english_score text;
alter table public.profiles add column if not exists study_interest text;
alter table public.profiles add column if not exists certificate_results jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists selected_courses jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists wants_scholarship text;
alter table public.profiles add column if not exists budget_range text;
alter table public.profiles add column if not exists academic_strength text;
alter table public.profiles add column if not exists need_accommodation text;
alter table public.profiles add column if not exists consent_given boolean default false;
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set account_type='student' where account_type is null or account_type='';
update public.profiles set account_status='active' where account_status is null or account_status='';
update public.profiles set onboarding_completed=false where onboarding_completed is null;
update public.profiles set certificate_results='{}'::jsonb where certificate_results is null;
update public.profiles set selected_courses='[]'::jsonb where selected_courses is null;
update public.profiles set consent_given=false where consent_given is null;

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('student','university_officer','administrator'));
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active','inactive'));

-- ------------------------------------------------------------
-- 3) Staff profiles
-- ------------------------------------------------------------
create table if not exists public.officer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'university_officer',
  university_id text references public.universities(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.officer_profiles add column if not exists full_name text;
alter table public.officer_profiles add column if not exists email text;
alter table public.officer_profiles add column if not exists university_id text references public.universities(id) on delete set null;
alter table public.officer_profiles add column if not exists status text default 'active';
alter table public.officer_profiles add column if not exists created_at timestamptz default now();
alter table public.officer_profiles add column if not exists updated_at timestamptz default now();

-- Drop the old two-role constraint BEFORE normalising old role values.
-- Existing projects may still contain role='officer'/'admin'.
alter table public.officer_profiles drop constraint if exists officer_profiles_role_check;
update public.officer_profiles set role='university_officer' where role='officer';
update public.officer_profiles set role='administrator' where role='admin';
update public.officer_profiles set status='active' where status is null or status='';
alter table public.officer_profiles alter column role set default 'university_officer';
alter table public.officer_profiles add constraint officer_profiles_role_check
  check (role in ('university_officer','administrator'));
alter table public.officer_profiles drop constraint if exists officer_profiles_status_check;
alter table public.officer_profiles add constraint officer_profiles_status_check
  check (status in ('active','inactive'));

-- ------------------------------------------------------------
-- 4) Student applications (create or extend safely)
-- ------------------------------------------------------------
create table if not exists public.student_applications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  nationality text default 'Malaysian',
  selected_university text,
  selected_course text,
  qualification text,
  financial_band text,
  pathway_request text,
  need_visa boolean default false,
  need_airport_transport boolean default false,
  need_accommodation boolean default false,
  arrival_airport text,
  arrival_date date,
  accommodation_type text,
  emergency_contact text,
  student_notes text,
  consent_university boolean default false,
  consent_data boolean default false,
  consent_whatsapp boolean default false,
  status text default 'draft',
  priority text default 'Normal',
  academic_decision text default 'pending',
  financial_decision text default 'pending',
  officer_note text,
  missing_documents jsonb default '[]'::jsonb,
  student_documents jsonb default '[]'::jsonb,
  officer_documents jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.student_applications add column if not exists qualification text;
alter table public.student_applications add column if not exists financial_band text;
alter table public.student_applications add column if not exists pathway_request text;
alter table public.student_applications add column if not exists academic_decision text default 'pending';
alter table public.student_applications add column if not exists financial_decision text default 'pending';
alter table public.student_applications add column if not exists officer_note text;
alter table public.student_applications add column if not exists missing_documents jsonb default '[]'::jsonb;
alter table public.student_applications add column if not exists student_documents jsonb default '[]'::jsonb;
alter table public.student_applications add column if not exists officer_documents jsonb default '[]'::jsonb;
alter table public.student_applications add column if not exists submitted_at timestamptz;
alter table public.student_applications add column if not exists created_at timestamptz default now();
alter table public.student_applications add column if not exists updated_at timestamptz default now();

alter table public.student_applications drop constraint if exists student_applications_status_check;
alter table public.student_applications add constraint student_applications_status_check
  check (status in (
    'draft','submitted','processing','under_review','action_required',
    'conditional_offer','accepted','successful','failed','offer_rejected',
    'closed_other_offer_accepted'
  ));

-- ------------------------------------------------------------
-- 5) University catalogue
-- ------------------------------------------------------------
create table if not exists public.courses (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  title text not null,
  level text not null,
  duration text,
  currency text default 'MYR',
  total_fee numeric(14,2) default 0,
  gst_percent numeric(6,2) default 0,
  active boolean default true,
  pricing_method text default 'whole_programme',
  breakdown_text text default '',
  semesters jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scholarships (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  name text not null,
  discount_type text default 'percentage',
  discount_value numeric(14,2) default 0,
  percentage numeric(6,2) default 0,
  scope text default 'whole_course',
  course_ids jsonb default '[]'::jsonb,
  scope_years jsonb default '[]'::jsonb,
  semester_rules jsonb default '[]'::jsonb,
  maintenance_terms text default '',
  raw_benefit text default '',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scholarships add column if not exists discount_type text default 'percentage';
alter table public.scholarships add column if not exists discount_value numeric(14,2) default 0;
alter table public.scholarships add column if not exists percentage numeric(6,2) default 0;
alter table public.scholarships add column if not exists scope text default 'whole_course';
alter table public.scholarships add column if not exists course_ids jsonb default '[]'::jsonb;
alter table public.scholarships add column if not exists scope_years jsonb default '[]'::jsonb;
alter table public.scholarships add column if not exists semester_rules jsonb default '[]'::jsonb;
alter table public.scholarships add column if not exists maintenance_terms text default '';
alter table public.scholarships add column if not exists raw_benefit text default '';
alter table public.scholarships add column if not exists active boolean default true;
alter table public.scholarships add column if not exists created_at timestamptz default now();
alter table public.scholarships add column if not exists updated_at timestamptz default now();
update public.scholarships
set discount_type = coalesce(nullif(discount_type,''),'percentage'),
    discount_value = case when coalesce(discount_value,0)=0 then coalesce(percentage,0) else discount_value end,
    percentage = case when coalesce(discount_type,'percentage')='percentage' and coalesce(percentage,0)=0 then coalesce(discount_value,0) else coalesce(percentage,0) end;
alter table public.scholarships drop constraint if exists scholarships_discount_type_check;
alter table public.scholarships add constraint scholarships_discount_type_check check(discount_type in ('percentage','fixed_amount'));
alter table public.scholarships drop constraint if exists scholarships_scope_check;
alter table public.scholarships add constraint scholarships_scope_check check(scope in ('whole_course','yearly','per_semester'));

create table if not exists public.pathway_packages (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  name text not null,
  entry_qualification text not null,
  immediate_target text,
  final_award text,
  pathway_type text default 'progression',
  stage_course_ids jsonb default '[]'::jsonb,
  courses_text text default '',
  notes text default '',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.entry_requirements (
  id text primary key,
  title text,
  course_id text references public.courses(id) on delete cascade,
  university_id text references public.universities(id) on delete cascade,
  qualification text,
  minimum_requirement text,
  english_requirement text,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 5B) Preserve and import the EXISTING legacy catalogue
--     The old capitalized tables remain untouched as a backup.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public."Universities"') is not null then
    insert into public.universities(id,name,short_name,location,status)
    select
      coalesce(nullif("universityCode",''), nullif("ID",''), "Title"),
      "Title",
      coalesce(nullif("universityShortName",''), nullif("universityCode",''), "Title"),
      coalesce("location",''),
      'active'
    from public."Universities"
    where coalesce("Title",'') <> ''
    on conflict(id) do nothing;
  end if;
end $$;

do $$
begin
  if to_regclass('public."Courses"') is not null then
    insert into public.courses(
      id,university_id,title,level,duration,currency,total_fee,gst_percent,active,
      pricing_method,breakdown_text,semesters
    )
    select
      coalesce(nullif(c."courseCode",''), nullif(c."ID",''), c."Title"),
      c."universityCode",
      c."Title",
      coalesce(nullif(c."level",''),'Programme'),
      coalesce(c."duration",''),
      coalesce(nullif(c."tuitionCurrency",''),'MYR'),
      coalesce(c."tuitionTotal_Malaysian", c."tuitionTotal_International", 0)::numeric,
      0,
      true,
      'whole_programme',
      coalesce(c."notes",''),
      '[]'::jsonb
    from public."Courses" c
    where coalesce(c."Title",'') <> ''
      and coalesce(c."universityCode",'') <> ''
      and exists(select 1 from public.universities u where u.id=c."universityCode")
    on conflict(id) do nothing;
  end if;
end $$;

do $$
begin
  if to_regclass('public."Scholarships"') is not null then
    insert into public.scholarships(
      id,university_id,name,discount_type,discount_value,percentage,scope,course_ids,
      scope_years,semester_rules,maintenance_terms,raw_benefit,active
    )
    select
      coalesce(nullif(s.scholarship_code,''), nullif(s.id,''), md5(coalesce(s.title,'') || coalesce(s.university_code,''))),
      s.university_code,
      coalesce(nullif(s.title,''),'Scholarship'),
      case
        when coalesce(s.amount_or_benefit,'') ~ '%' then 'percentage'
        when coalesce(s.amount_or_benefit,'') ~* '(RM|MYR)[[:space:]]*[0-9]' then 'fixed_amount'
        else 'percentage'
      end,
      case
        when coalesce(s.amount_or_benefit,'') ~ '%' then
          coalesce(((regexp_match(s.amount_or_benefit, '([0-9]+([.][0-9]+)?)[[:space:]]*%'))[1])::numeric,0)
        when coalesce(s.amount_or_benefit,'') ~* '(RM|MYR)[[:space:]]*[0-9]' then
          coalesce(replace((regexp_match(s.amount_or_benefit, '(RM|MYR)[[:space:]]*([0-9,]+([.][0-9]+)?)', 'i'))[2],',','')::numeric,0)
        else 0
      end,
      case
        when coalesce(s.amount_or_benefit,'') ~ '%' then
          least(100,coalesce(((regexp_match(s.amount_or_benefit, '([0-9]+([.][0-9]+)?)[[:space:]]*%'))[1])::numeric,0))
        else 0
      end,
      'whole_course',
      case
        when coalesce(s.course_code,'') <> '' and exists(select 1 from public.courses c where c.id=s.course_code)
        then jsonb_build_array(s.course_code)
        else '[]'::jsonb
      end,
      '[]'::jsonb,
      '[]'::jsonb,
      concat_ws(E'\n', nullif(s.eligibility_criteria,''), nullif(s.notes,'')),
      coalesce(s.amount_or_benefit,''),
      true
    from public."Scholarships" s
    where coalesce(s.university_code,'') <> ''
      and exists(select 1 from public.universities u where u.id=s.university_code)
    on conflict(id) do nothing;
  end if;
end $$;

do $$
begin
  if to_regclass('public."EntryRequirements"') is not null then
    insert into public.entry_requirements(
      id,title,course_id,university_id,qualification,minimum_requirement,english_requirement,notes,active
    )
    select
      coalesce(nullif(e."entryRequirementCode",''), nullif(e."ID",''), md5(coalesce(e."Title",'') || coalesce(e."courseCode",''))),
      e."Title",
      case when exists(select 1 from public.courses c where c.id=e."courseCode") then e."courseCode" else null end,
      case when exists(select 1 from public.universities u where u.id=e."universityCode") then e."universityCode" else null end,
      e."qualification",
      e."minimumRequirement",
      e."englishRequirement",
      e."notes",
      true
    from public."EntryRequirements" e
    where coalesce(e."Title",'') <> ''
    on conflict(id) do nothing;
  end if;
end $$;

-- ------------------------------------------------------------
-- 6) Offers
-- ------------------------------------------------------------
create table if not exists public.offers (
  id text primary key,
  application_id text references public.student_applications(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  university_id text references public.universities(id) on delete cascade,
  course_title text,
  package_title text,
  scholarship_name text,
  scholarship_discount_type text default 'percentage',
  scholarship_discount_value numeric(14,2) default 0,
  scholarship_percentage numeric(6,2) default 0,
  tuition_before_discount numeric(14,2) default 0,
  discount_amount numeric(14,2) default 0,
  gst_percent numeric(6,2) default 0,
  gst_amount numeric(14,2) default 0,
  payable_total numeric(14,2) default 0,
  currency text default 'MYR',
  terms text,
  status text default 'sent',
  offer_letter_name text,
  offer_letter_path text,
  signed_letter_name text,
  signed_letter_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.offers add column if not exists scholarship_discount_type text default 'percentage';
alter table public.offers add column if not exists scholarship_discount_value numeric(14,2) default 0;
alter table public.offers add column if not exists offer_letter_name text;
alter table public.offers add column if not exists offer_letter_path text;
alter table public.offers add column if not exists signed_letter_name text;
alter table public.offers add column if not exists signed_letter_path text;
alter table public.offers add column if not exists updated_at timestamptz default now();
alter table public.offers drop constraint if exists offers_status_check;
alter table public.offers add constraint offers_status_check
  check (status in ('sent','accepted','rejected','declined_after_other_acceptance','cancelled'));
alter table public.offers drop constraint if exists offers_discount_type_check;
alter table public.offers add constraint offers_discount_type_check
  check (scholarship_discount_type in ('percentage','fixed_amount'));

-- Database-level guarantee: one accepted offer per student.
create unique index if not exists one_accepted_offer_per_student_idx
  on public.offers(student_id)
  where status='accepted' and student_id is not null;

-- ------------------------------------------------------------
-- 7) Seed currently known universities only when absent
-- ------------------------------------------------------------
insert into public.universities(id,name,short_name,location,status) values
('UOSM','University of Southampton Malaysia','UoSM','Iskandar Puteri, Johor','active'),
('UORM','University of Reading Malaysia','UoRM','Iskandar Puteri, Johor','active'),
('MDIS','MDIS Malaysia International College','MDIS','Iskandar Puteri, Johor','active')
on conflict(id) do nothing;

-- ------------------------------------------------------------
-- 8) updated_at helper
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','officer_profiles','universities','courses','scholarships',
    'pathway_packages','entry_requirements','student_applications','offers'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || t || '_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || t || '_updated_at', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9) Synchronize Supabase Auth -> public.profiles
-- ------------------------------------------------------------
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, email, full_name, account_type, account_status,
    onboarding_completed, consent_given, consent_at, created_at, updated_at
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'account_type', new.raw_user_meta_data ->> 'role')
           in ('student','university_officer','administrator')
      then coalesce(new.raw_user_meta_data ->> 'account_type', new.raw_user_meta_data ->> 'role')
      else 'student'
    end,
    'active',
    case when lower(coalesce(new.raw_user_meta_data ->> 'onboarding_completed','false'))='true' then true else false end,
    case when lower(coalesce(new.raw_user_meta_data ->> 'consent_given','false'))='true' then true else false end,
    case
      when coalesce(new.raw_user_meta_data ->> 'consent_at','') <> ''
      then (new.raw_user_meta_data ->> 'consent_at')::timestamptz
      else null
    end,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when coalesce(public.profiles.full_name,'') = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();
  return new;
exception
  when others then
    -- Do not block a Supabase Auth signup because profile synchronization failed.
    raise warning 'TNE profile sync warning for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_tne on auth.users;
create trigger on_auth_user_created_tne
after insert on auth.users
for each row execute function public.handle_auth_user_sync();

drop trigger if exists on_auth_user_updated_tne on auth.users;
create trigger on_auth_user_updated_tne
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_sync();

-- Backfill ALL existing Auth users without deleting/resetting credentials.
insert into public.profiles (
  id,email,full_name,account_type,account_status,onboarding_completed,
  consent_given,consent_at,created_at,updated_at
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name',''),
  case
    when coalesce(u.raw_user_meta_data ->> 'account_type', u.raw_user_meta_data ->> 'role')
         in ('student','university_officer','administrator')
    then coalesce(u.raw_user_meta_data ->> 'account_type', u.raw_user_meta_data ->> 'role')
    else 'student'
  end,
  'active',
  case when lower(coalesce(u.raw_user_meta_data ->> 'onboarding_completed','false'))='true' then true else false end,
  case when lower(coalesce(u.raw_user_meta_data ->> 'consent_given','false'))='true' then true else false end,
  case
    when coalesce(u.raw_user_meta_data ->> 'consent_at','') <> ''
    then (u.raw_user_meta_data ->> 'consent_at')::timestamptz
    else null
  end,
  coalesce(u.created_at,now()),
  now()
from auth.users u
on conflict(id) do update set
  email = excluded.email,
  full_name = case when coalesce(public.profiles.full_name,'')='' then excluded.full_name else public.profiles.full_name end,
  updated_at = now();

-- ------------------------------------------------------------
-- 10) Keep staff role/status synchronized into public.profiles
-- ------------------------------------------------------------
create or replace function public.sync_staff_profile_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,email,full_name,account_type,account_status,created_at,updated_at
  ) values (
    new.id,new.email,new.full_name,new.role,coalesce(new.status,'active'),now(),now()
  )
  on conflict(id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
    account_type = excluded.account_type,
    account_status = excluded.account_status,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists sync_staff_profile_to_profile_tne on public.officer_profiles;
create trigger sync_staff_profile_to_profile_tne
after insert or update of full_name,email,role,status on public.officer_profiles
for each row execute function public.sync_staff_profile_to_profile();

-- Initial staff override for existing rows.
update public.profiles p
set account_type = op.role,
    account_status = coalesce(op.status,'active'),
    email = coalesce(op.email,p.email),
    full_name = coalesce(nullif(op.full_name,''),p.full_name),
    updated_at = now()
from public.officer_profiles op
where p.id = op.id;

-- ------------------------------------------------------------
-- 11) Authorization helpers
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.officer_profiles p
    where p.id = auth.uid()
      and p.role = 'administrator'
      and coalesce(p.status,'active') = 'active'
  );
$$;

create or replace function public.is_officer_for(p_university_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.officer_profiles p
    where p.id = auth.uid()
      and p.role = 'university_officer'
      and p.university_id = p_university_id
      and coalesce(p.status,'active') = 'active'
  );
$$;

create or replace function public.can_staff_access_application(p_application_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists(
    select 1
    from public.student_applications a
    join public.officer_profiles p on p.id = auth.uid()
    where a.id = p_application_id
      and p.role = 'university_officer'
      and p.status = 'active'
      and (
        p.university_id = a.selected_university
        or exists(
          select 1 from public.universities u
          where u.id = p.university_id and u.name = a.selected_university
        )
      )
  );
$$;

-- Prevent an ordinary student from changing the security fields in their own profile.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.account_type := old.account_type;
    new.account_status := old.account_status;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields_tne on public.profiles;
create trigger protect_profile_security_fields_tne
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Students may edit their application content while it is active, but cannot
-- self-approve eligibility, change officer notes, or force an accepted/offer status.
create or replace function public.protect_application_staff_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id
     and not public.is_admin()
     and not public.can_staff_access_application(old.id) then
    new.user_id := old.user_id;
    new.priority := old.priority;
    new.academic_decision := old.academic_decision;
    new.financial_decision := old.financial_decision;
    new.officer_note := old.officer_note;
    new.officer_documents := old.officer_documents;

    -- Valid student-side transitions are draft -> submitted and
    -- action_required -> submitted. Otherwise keep the server status.
    if not (
      new.status = old.status
      or (old.status = 'draft' and new.status = 'submitted')
      or (old.status = 'action_required' and new.status = 'submitted')
    ) then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_application_staff_fields_tne on public.student_applications;
create trigger protect_application_staff_fields_tne
before update on public.student_applications
for each row execute function public.protect_application_staff_fields();

-- ------------------------------------------------------------
-- 12) RLS + grants
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.officer_profiles enable row level security;
alter table public.universities enable row level security;
alter table public.courses enable row level security;
alter table public.scholarships enable row level security;
alter table public.pathway_packages enable row level security;
alter table public.entry_requirements enable row level security;
alter table public.student_applications enable row level security;
alter table public.offers enable row level security;

grant select on public.universities, public.courses, public.scholarships, public.pathway_packages, public.entry_requirements to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.officer_profiles, public.student_applications, public.offers to authenticated;
grant insert, update, delete on public.universities, public.courses, public.scholarships, public.pathway_packages, public.entry_requirements to authenticated;

-- Remove policy names used by previous TNE Corridor schema versions.
do $$
declare item text; table_name text; policy_name text;
begin
  foreach item in array array[
    'officer_profiles|Users can read own officer profile',
    'officer_profiles|staff read own profile',
    'officer_profiles|admins manage staff profiles',
    'student_applications|Students can read own applications',
    'student_applications|Students can insert own applications',
    'student_applications|Students can update own active applications',
    'student_applications|Students can update own applications',
    'student_applications|Officers can read all applications',
    'student_applications|Officers can update all applications',
    'student_applications|staff read assigned applications',
    'student_applications|staff update assigned applications',
    'universities|catalogue read',
    'universities|universities admin write',
    'courses|courses read',
    'courses|courses officer write',
    'scholarships|scholarships read',
    'scholarships|scholarships officer write',
    'pathway_packages|packages read',
    'pathway_packages|packages officer write',
    'pathway_packages|packages read',
    'offers|offers student read',
    'offers|offers officer write',
    'profiles|Users can read own profile',
    'profiles|Users can update own profile',
    'profiles|profiles own read',
    'profiles|profiles own insert',
    'profiles|profiles own update',
    'officer_profiles|staff profile own or admin read',
    'officer_profiles|admin insert staff profile',
    'officer_profiles|admin update staff profile',
    'officer_profiles|admin delete staff profile',
    'universities|universities public read',
    'universities|universities admin insert',
    'universities|universities admin update',
    'universities|universities admin delete',
    'courses|courses public read',
    'courses|courses scoped insert',
    'courses|courses scoped update',
    'courses|courses scoped delete',
    'scholarships|scholarships public read',
    'scholarships|scholarships scoped insert',
    'scholarships|scholarships scoped update',
    'scholarships|scholarships scoped delete',
    'pathway_packages|pathways public read',
    'pathway_packages|pathways scoped insert',
    'pathway_packages|pathways scoped update',
    'pathway_packages|pathways scoped delete',
    'entry_requirements|entry requirements public read',
    'entry_requirements|entry requirements scoped insert',
    'entry_requirements|entry requirements scoped update',
    'entry_requirements|entry requirements scoped delete',
    'student_applications|applications student read own',
    'student_applications|applications student insert own',
    'student_applications|applications student update own',
    'student_applications|applications student delete own draft',
    'offers|offers scoped read',
    'offers|offers staff insert',
    'offers|offers staff update',
    'offers|offers staff delete'
  ]
  loop
    table_name := split_part(item,'|',1);
    policy_name := split_part(item,'|',2);
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
  end loop;
end $$;

-- profiles
create policy "profiles own read" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles own insert" on public.profiles
for insert to authenticated
with check (id = auth.uid() or public.is_admin());

create policy "profiles own update" on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- staff profiles
create policy "staff profile own or admin read" on public.officer_profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "admin insert staff profile" on public.officer_profiles
for insert to authenticated
with check (public.is_admin());

create policy "admin update staff profile" on public.officer_profiles
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admin delete staff profile" on public.officer_profiles
for delete to authenticated
using (public.is_admin());

-- public catalogue reads
create policy "universities public read" on public.universities
for select to anon, authenticated using (true);
create policy "courses public read" on public.courses
for select to anon, authenticated using (true);
create policy "scholarships public read" on public.scholarships
for select to anon, authenticated using (true);
create policy "pathways public read" on public.pathway_packages
for select to anon, authenticated using (true);

-- university writes
create policy "universities admin insert" on public.universities
for insert to authenticated with check (public.is_admin());
create policy "universities admin update" on public.universities
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "universities admin delete" on public.universities
for delete to authenticated using (public.is_admin());

create policy "courses scoped insert" on public.courses
for insert to authenticated with check (public.is_admin() or public.is_officer_for(university_id));
create policy "courses scoped update" on public.courses
for update to authenticated using (public.is_admin() or public.is_officer_for(university_id))
with check (public.is_admin() or public.is_officer_for(university_id));
create policy "courses scoped delete" on public.courses
for delete to authenticated using (public.is_admin() or public.is_officer_for(university_id));

create policy "scholarships scoped insert" on public.scholarships
for insert to authenticated with check (public.is_admin() or public.is_officer_for(university_id));
create policy "scholarships scoped update" on public.scholarships
for update to authenticated using (public.is_admin() or public.is_officer_for(university_id))
with check (public.is_admin() or public.is_officer_for(university_id));
create policy "scholarships scoped delete" on public.scholarships
for delete to authenticated using (public.is_admin() or public.is_officer_for(university_id));

create policy "pathways scoped insert" on public.pathway_packages
for insert to authenticated with check (public.is_admin() or public.is_officer_for(university_id));
create policy "pathways scoped update" on public.pathway_packages
for update to authenticated using (public.is_admin() or public.is_officer_for(university_id))
with check (public.is_admin() or public.is_officer_for(university_id));
create policy "pathways scoped delete" on public.pathway_packages
for delete to authenticated using (public.is_admin() or public.is_officer_for(university_id));

create policy "entry requirements public read" on public.entry_requirements
for select to anon, authenticated using (active is distinct from false);
create policy "entry requirements scoped insert" on public.entry_requirements
for insert to authenticated with check (public.is_admin() or public.is_officer_for(university_id));
create policy "entry requirements scoped update" on public.entry_requirements
for update to authenticated using (public.is_admin() or public.is_officer_for(university_id))
with check (public.is_admin() or public.is_officer_for(university_id));
create policy "entry requirements scoped delete" on public.entry_requirements
for delete to authenticated using (public.is_admin() or public.is_officer_for(university_id));

-- applications
create policy "applications student read own" on public.student_applications
for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.can_staff_access_application(id));

create policy "applications student insert own" on public.student_applications
for insert to authenticated
with check (user_id = auth.uid());

create policy "applications student update own" on public.student_applications
for update to authenticated
using (
  (user_id = auth.uid() and status in ('draft','submitted','action_required'))
  or public.is_admin()
  or public.can_staff_access_application(id)
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or public.can_staff_access_application(id)
);

create policy "applications student delete own draft" on public.student_applications
for delete to authenticated
using ((user_id = auth.uid() and status='draft') or public.is_admin());

-- offers: student reads own; staff manages only its university
create policy "offers scoped read" on public.offers
for select to authenticated
using (student_id = auth.uid() or public.is_admin() or public.is_officer_for(university_id));

create policy "offers staff insert" on public.offers
for insert to authenticated
with check (public.is_admin() or public.is_officer_for(university_id));

create policy "offers staff update" on public.offers
for update to authenticated
using (public.is_admin() or public.is_officer_for(university_id))
with check (public.is_admin() or public.is_officer_for(university_id));

create policy "offers staff delete" on public.offers
for delete to authenticated
using (public.is_admin() or public.is_officer_for(university_id));

-- ------------------------------------------------------------
-- 13) Student offer response functions
-- ------------------------------------------------------------
create or replace function public.accept_offer(p_offer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_offer public.offers%rowtype;
begin
  select * into v_offer
  from public.offers
  where id = p_offer_id and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'Offer not found or not owned by this student';
  end if;

  if v_offer.status not in ('sent','accepted') then
    raise exception 'This offer is no longer available for acceptance';
  end if;

  if exists(
    select 1 from public.offers
    where student_id = auth.uid() and status='accepted' and id<>p_offer_id
  ) then
    raise exception 'Another university offer has already been accepted';
  end if;

  update public.offers
  set status='accepted', updated_at=now()
  where id=p_offer_id;

  update public.offers
  set status='declined_after_other_acceptance', updated_at=now()
  where student_id=auth.uid() and id<>p_offer_id and status='sent';

  update public.student_applications
  set status = case
      when id=v_offer.application_id then 'accepted'
      else 'closed_other_offer_accepted'
    end,
    updated_at=now()
  where user_id=auth.uid()
    and (id=v_offer.application_id or status in ('draft','submitted','processing','under_review','action_required','conditional_offer'));
end;
$$;
grant execute on function public.accept_offer(text) to authenticated;

create or replace function public.reject_offer(p_offer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_application_id text;
begin
  select application_id into v_application_id
  from public.offers
  where id=p_offer_id and student_id=auth.uid() and status='sent'
  for update;

  if not found then
    raise exception 'Offer not found, already answered, or not owned by this student';
  end if;

  update public.offers set status='rejected', updated_at=now() where id=p_offer_id;
  update public.student_applications
     set status='offer_rejected', updated_at=now()
   where id=v_application_id and user_id=auth.uid();
end;
$$;
grant execute on function public.reject_offer(text) to authenticated;

create or replace function public.record_signed_offer_document(
  p_offer_id text,
  p_path text,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.offers
  set signed_letter_path=p_path,
      signed_letter_name=p_name,
      updated_at=now()
  where id=p_offer_id
    and student_id=auth.uid()
    and status='accepted';

  if not found then
    raise exception 'Accepted offer not found or not owned by this student';
  end if;
end;
$$;
grant execute on function public.record_signed_offer_document(text,text,text) to authenticated;

-- ------------------------------------------------------------
-- 14) Private Storage buckets and policies
-- ------------------------------------------------------------
insert into storage.buckets (id,name,public)
values ('application-documents','application-documents',false)
on conflict(id) do update set public=false;

insert into storage.buckets (id,name,public)
values ('offer-documents','offer-documents',false)
on conflict(id) do update set public=false;

-- Drop TNE document policies from previous versions.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='storage' and tablename='objects'
      and (
        policyname ilike '%application document%'
        or policyname ilike '%offer document%'
        or policyname ilike '%application docs%'
        or policyname ilike '%offer docs%'
        or policyname ilike '%students upload own application%'
        or policyname ilike '%students read own application%'
        or policyname ilike '%students update own application%'
        or policyname ilike '%authenticated users can upload application%'
        or policyname ilike '%authenticated users can read application%'
        or policyname ilike '%authenticated users can update application%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- application-documents path: <student_uuid>/<application_id>/<filename>
create policy "application docs student upload own" on storage.objects
for insert to authenticated
with check (
  bucket_id='application-documents'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy "application docs authorized read" on storage.objects
for select to authenticated
using (
  bucket_id='application-documents'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_admin()
    or public.can_staff_access_application((storage.foldername(name))[2])
  )
);

create policy "application docs student update own" on storage.objects
for update to authenticated
using (bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "application docs student delete own" on storage.objects
for delete to authenticated
using (bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);

-- offer-documents path:
-- formal: <university_id>/<offer_id>/formal/<filename>
-- signed: <university_id>/<offer_id>/signed/<student_uuid>/<filename>
create policy "offer docs authorized read" on storage.objects
for select to authenticated
using (
  bucket_id='offer-documents'
  and exists(
    select 1 from public.offers o
    where o.id=(storage.foldername(name))[2]
      and o.university_id=(storage.foldername(name))[1]
      and (
        o.student_id=auth.uid()
        or public.is_admin()
        or public.is_officer_for(o.university_id)
      )
  )
);

create policy "offer docs staff upload formal" on storage.objects
for insert to authenticated
with check (
  bucket_id='offer-documents'
  and (storage.foldername(name))[3]='formal'
  and (public.is_admin() or public.is_officer_for((storage.foldername(name))[1]))
  and exists(
    select 1 from public.offers o
    where o.id=(storage.foldername(name))[2]
      and o.university_id=(storage.foldername(name))[1]
  )
);

create policy "offer docs student upload signed" on storage.objects
for insert to authenticated
with check (
  bucket_id='offer-documents'
  and (storage.foldername(name))[3]='signed'
  and (storage.foldername(name))[4]=auth.uid()::text
  and exists(
    select 1 from public.offers o
    where o.id=(storage.foldername(name))[2]
      and o.university_id=(storage.foldername(name))[1]
      and o.student_id=auth.uid()
      and o.status='accepted'
  )
);

-- ------------------------------------------------------------
-- 15) Helpful indexes
-- ------------------------------------------------------------
create index if not exists profiles_email_idx on public.profiles(lower(email));
create index if not exists student_applications_user_id_idx on public.student_applications(user_id);
create index if not exists student_applications_university_idx on public.student_applications(selected_university);
create index if not exists courses_university_idx on public.courses(university_id);
create index if not exists scholarships_university_idx on public.scholarships(university_id);
create index if not exists pathways_university_idx on public.pathway_packages(university_id);
create index if not exists entry_requirements_university_idx on public.entry_requirements(university_id);
create index if not exists entry_requirements_course_idx on public.entry_requirements(course_id);
create index if not exists offers_student_idx on public.offers(student_id);
create index if not exists offers_university_idx on public.offers(university_id);
create index if not exists offers_application_id_idx on public.offers(application_id);
create index if not exists officer_profiles_university_id_idx on public.officer_profiles(university_id);

-- ------------------------------------------------------------
-- 16) API execution hardening
-- ------------------------------------------------------------
-- Trigger-only SECURITY DEFINER functions are never exposed as RPCs.
revoke all on function public.handle_auth_user_sync() from public, anon, authenticated;
revoke all on function public.sync_staff_profile_to_profile() from public, anon, authenticated;
revoke all on function public.protect_profile_security_fields() from public, anon, authenticated;
revoke all on function public.protect_application_staff_fields() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
end $$;

-- These helpers/RPCs need the signed-in user context but must never be anonymous.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_officer_for(text) from public, anon;
revoke all on function public.can_staff_access_application(text) from public, anon;
revoke all on function public.accept_offer(text) from public, anon;
revoke all on function public.reject_offer(text) from public, anon;
revoke all on function public.record_signed_offer_document(text,text,text) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_officer_for(text) to authenticated;
grant execute on function public.can_staff_access_application(text) to authenticated;
grant execute on function public.accept_offer(text) to authenticated;
grant execute on function public.reject_offer(text) to authenticated;
grant execute on function public.record_signed_offer_document(text,text,text) to authenticated;

commit;

-- End v4 migration.
