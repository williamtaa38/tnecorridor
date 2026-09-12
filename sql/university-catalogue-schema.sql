-- ============================================================
-- TNE Corridor — University Catalogue / Fees / Scholarships /
-- Progression Packages (Supabase migration blueprint)
-- ============================================================
-- The current university portal still uses the front-end preview
-- store. These tables mirror the structured data now used by the UI
-- and are intended for the Supabase integration phase.

create extension if not exists pgcrypto;

alter table public.officer_profiles
  add column if not exists university_id text;

create table if not exists public.university_courses (
  id text primary key,
  university_id text not null,
  title text not null,
  level text not null,
  duration text,
  currency text not null default 'MYR',
  fee_mode text not null default 'total'
    check (fee_mode in ('total','yearly','semester','subject')),
  total_fee numeric(14,2) not null default 0,
  tax_label text not null default 'SST',
  tax_percent numeric(6,3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_years (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.university_courses(id) on delete cascade,
  year_order integer not null,
  name text not null,
  fee numeric(14,2) not null default 0,
  unique(course_id, year_order)
);

create table if not exists public.course_semesters (
  id uuid primary key default gen_random_uuid(),
  course_year_id uuid not null references public.course_years(id) on delete cascade,
  semester_order integer not null,
  name text not null,
  fee numeric(14,2) not null default 0,
  unique(course_year_id, semester_order)
);

create table if not exists public.course_subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.course_semesters(id) on delete cascade,
  subject_order integer not null default 1,
  name text not null,
  code text,
  credits numeric(7,2) not null default 0,
  fee numeric(14,2) not null default 0
);

create table if not exists public.university_scholarships (
  id uuid primary key default gen_random_uuid(),
  university_id text not null,
  name text not null,
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage','fixed')),
  discount_value numeric(14,2) not null default 0,
  scope text not null default 'total_fee'
    check (scope in ('total_fee','yearly','semester')),
  maintenance_terms text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scholarship_courses (
  scholarship_id uuid not null references public.university_scholarships(id) on delete cascade,
  course_id text not null references public.university_courses(id) on delete cascade,
  primary key (scholarship_id, course_id)
);

create table if not exists public.scholarship_year_targets (
  scholarship_id uuid not null references public.university_scholarships(id) on delete cascade,
  course_year_id uuid not null references public.course_years(id) on delete cascade,
  primary key (scholarship_id, course_year_id)
);

create table if not exists public.scholarship_semester_targets (
  scholarship_id uuid not null references public.university_scholarships(id) on delete cascade,
  semester_id uuid not null references public.course_semesters(id) on delete cascade,
  primary key (scholarship_id, semester_id)
);

create table if not exists public.pathway_packages (
  id uuid primary key default gen_random_uuid(),
  university_id text not null,
  name text not null,
  entry_qualification text not null,
  target_award text not null
    check (target_award in ('undergraduate','postgraduate','doctorate')),
  pathway_type text not null default 'progression'
    check (pathway_type in ('progression','credit_transfer')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pathway_stages (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.pathway_packages(id) on delete cascade,
  stage_order integer not null,
  course_id text not null references public.university_courses(id) on delete restrict,
  progression_rule text,
  unique(package_id, stage_order)
);

-- Shared updated_at trigger from supabase-application-schema.sql may already exist.
-- Re-create only when needed.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_university_courses_updated_at on public.university_courses;
create trigger set_university_courses_updated_at
before update on public.university_courses
for each row execute function public.set_updated_at();

drop trigger if exists set_university_scholarships_updated_at on public.university_scholarships;
create trigger set_university_scholarships_updated_at
before update on public.university_scholarships
for each row execute function public.set_updated_at();

drop trigger if exists set_pathway_packages_updated_at on public.pathway_packages;
create trigger set_pathway_packages_updated_at
before update on public.pathway_packages
for each row execute function public.set_updated_at();

-- RLS: university officers can only work on their own university.
alter table public.university_courses enable row level security;
alter table public.course_years enable row level security;
alter table public.course_semesters enable row level security;
alter table public.course_subjects enable row level security;
alter table public.university_scholarships enable row level security;
alter table public.scholarship_courses enable row level security;
alter table public.scholarship_year_targets enable row level security;
alter table public.scholarship_semester_targets enable row level security;
alter table public.pathway_packages enable row level security;
alter table public.pathway_stages enable row level security;

create or replace function public.current_officer_university()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select university_id
  from public.officer_profiles
  where id = auth.uid()
  limit 1
$$;

-- Courses
create policy "University officers manage own courses"
on public.university_courses
for all
to authenticated
using (university_id = public.current_officer_university())
with check (university_id = public.current_officer_university());

-- Child curriculum tables inherit access through the course.
create policy "University officers manage own course years"
on public.course_years
for all
to authenticated
using (exists (
  select 1 from public.university_courses c
  where c.id = course_years.course_id
    and c.university_id = public.current_officer_university()
))
with check (exists (
  select 1 from public.university_courses c
  where c.id = course_years.course_id
    and c.university_id = public.current_officer_university()
));

create policy "University officers manage own semesters"
on public.course_semesters
for all
to authenticated
using (exists (
  select 1
  from public.course_years y
  join public.university_courses c on c.id = y.course_id
  where y.id = course_semesters.course_year_id
    and c.university_id = public.current_officer_university()
))
with check (exists (
  select 1
  from public.course_years y
  join public.university_courses c on c.id = y.course_id
  where y.id = course_semesters.course_year_id
    and c.university_id = public.current_officer_university()
));

create policy "University officers manage own subjects"
on public.course_subjects
for all
to authenticated
using (exists (
  select 1
  from public.course_semesters s
  join public.course_years y on y.id = s.course_year_id
  join public.university_courses c on c.id = y.course_id
  where s.id = course_subjects.semester_id
    and c.university_id = public.current_officer_university()
))
with check (exists (
  select 1
  from public.course_semesters s
  join public.course_years y on y.id = s.course_year_id
  join public.university_courses c on c.id = y.course_id
  where s.id = course_subjects.semester_id
    and c.university_id = public.current_officer_university()
));

-- Scholarships
create policy "University officers manage own scholarships"
on public.university_scholarships
for all
to authenticated
using (university_id = public.current_officer_university())
with check (university_id = public.current_officer_university());

create policy "University officers manage own scholarship courses"
on public.scholarship_courses
for all
to authenticated
using (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_courses.scholarship_id
    and s.university_id = public.current_officer_university()
))
with check (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_courses.scholarship_id
    and s.university_id = public.current_officer_university()
));

create policy "University officers manage own scholarship year targets"
on public.scholarship_year_targets
for all
to authenticated
using (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_year_targets.scholarship_id
    and s.university_id = public.current_officer_university()
))
with check (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_year_targets.scholarship_id
    and s.university_id = public.current_officer_university()
));

create policy "University officers manage own scholarship semester targets"
on public.scholarship_semester_targets
for all
to authenticated
using (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_semester_targets.scholarship_id
    and s.university_id = public.current_officer_university()
))
with check (exists (
  select 1 from public.university_scholarships s
  where s.id = scholarship_semester_targets.scholarship_id
    and s.university_id = public.current_officer_university()
));

-- Pathways
create policy "University officers manage own pathway packages"
on public.pathway_packages
for all
to authenticated
using (university_id = public.current_officer_university())
with check (university_id = public.current_officer_university());

create policy "University officers manage own pathway stages"
on public.pathway_stages
for all
to authenticated
using (exists (
  select 1 from public.pathway_packages p
  where p.id = pathway_stages.package_id
    and p.university_id = public.current_officer_university()
))
with check (exists (
  select 1 from public.pathway_packages p
  where p.id = pathway_stages.package_id
    and p.university_id = public.current_officer_university()
));
