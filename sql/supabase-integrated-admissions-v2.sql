-- TNE Corridor integrated admissions schema v2
-- Run in Supabase SQL Editor after the existing starter schema.
create extension if not exists pgcrypto;

create table if not exists public.universities (
  id text primary key, name text not null, short_name text, location text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

alter table public.officer_profiles add column if not exists email text;
alter table public.officer_profiles add column if not exists university_id text references public.universities(id) on delete set null;
alter table public.officer_profiles add column if not exists status text default 'active';
alter table public.officer_profiles drop constraint if exists officer_profiles_role_check;
update public.officer_profiles set role='university_officer' where role='officer';
update public.officer_profiles set role='administrator' where role='admin';
alter table public.officer_profiles alter column role set default 'university_officer';
alter table public.officer_profiles add constraint officer_profiles_role_check check(role in ('university_officer','administrator'));

create table if not exists public.courses (
  id text primary key, university_id text not null references public.universities(id) on delete cascade,
  title text not null, level text not null, duration text, currency text default 'MYR', total_fee numeric(14,2) default 0,
  gst_percent numeric(6,2) default 0, active boolean default true, pricing_method text default 'whole_programme',
  breakdown_text text default '', semesters jsonb default '[]'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.scholarships (
  id text primary key, university_id text not null references public.universities(id) on delete cascade,
  name text not null, percentage numeric(6,2) default 0, scope text default 'whole_course', course_ids jsonb default '[]'::jsonb,
  semester_rules jsonb default '[]'::jsonb, maintenance_terms text default '', active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.pathway_packages (
  id text primary key, university_id text not null references public.universities(id) on delete cascade,
  name text not null, entry_qualification text not null, immediate_target text, final_award text,
  pathway_type text default 'progression', stage_course_ids jsonb default '[]'::jsonb, courses_text text default '', notes text default '', active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.offers (
  id text primary key, application_id text references public.student_applications(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade, university_id text references public.universities(id) on delete cascade,
  course_title text, package_title text, scholarship_name text, scholarship_percentage numeric(6,2) default 0,
  tuition_before_discount numeric(14,2) default 0, discount_amount numeric(14,2) default 0, gst_percent numeric(6,2) default 0,
  gst_amount numeric(14,2) default 0, payable_total numeric(14,2) default 0, currency text default 'MYR', terms text,
  status text default 'sent', created_at timestamptz default now()
);

insert into public.universities(id,name,short_name,location) values
('UOSM','University of Southampton Malaysia','UoSM','Iskandar Puteri, Johor'),
('UORM','University of Reading Malaysia','UoRM','Iskandar Puteri, Johor'),
('MDIS','MDIS Malaysia International College','MDIS','Iskandar Puteri, Johor') on conflict(id) do nothing;

alter table public.universities enable row level security;
alter table public.courses enable row level security;
alter table public.scholarships enable row level security;
alter table public.pathway_packages enable row level security;
alter table public.offers enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.officer_profiles p where p.id=auth.uid() and p.role='administrator' and coalesce(p.status,'active')='active');
$$;
create or replace function public.is_officer_for(uid text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.officer_profiles p where p.id=auth.uid() and p.role='university_officer' and p.university_id=uid and coalesce(p.status,'active')='active');
$$;

-- drop/recreate v2 policies safely
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('universities','courses','scholarships','pathway_packages','offers') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "catalogue read" on public.universities for select to anon, authenticated using(true);
create policy "universities admin write" on public.universities for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "courses read" on public.courses for select to anon, authenticated using(true);
create policy "courses officer write" on public.courses for all to authenticated using(public.is_admin() or public.is_officer_for(university_id)) with check(public.is_admin() or public.is_officer_for(university_id));
create policy "scholarships read" on public.scholarships for select to anon, authenticated using(true);
create policy "scholarships officer write" on public.scholarships for all to authenticated using(public.is_admin() or public.is_officer_for(university_id)) with check(public.is_admin() or public.is_officer_for(university_id));
create policy "packages read" on public.pathway_packages for select to anon, authenticated using(true);
create policy "packages officer write" on public.pathway_packages for all to authenticated using(public.is_admin() or public.is_officer_for(university_id)) with check(public.is_admin() or public.is_officer_for(university_id));
create policy "offers student read" on public.offers for select to authenticated using(student_id=auth.uid() or public.is_admin() or public.is_officer_for(university_id));
create policy "offers officer write" on public.offers for all to authenticated using(public.is_admin() or public.is_officer_for(university_id)) with check(public.is_admin() or public.is_officer_for(university_id));

-- Officer profile access for real role-based sign-in
drop policy if exists "Users can read own officer profile" on public.officer_profiles;
drop policy if exists "staff read own profile" on public.officer_profiles;
drop policy if exists "admins manage staff profiles" on public.officer_profiles;
create policy "staff read own profile" on public.officer_profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy "admins manage staff profiles" on public.officer_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Extend applications for university review / financial assessment
alter table public.student_applications add column if not exists qualification text;
alter table public.student_applications add column if not exists financial_band text;
alter table public.student_applications add column if not exists academic_decision text default 'pending';
alter table public.student_applications add column if not exists financial_decision text default 'pending';
alter table public.student_applications add column if not exists missing_documents jsonb default '[]'::jsonb;
alter table public.student_applications drop constraint if exists student_applications_status_check;
alter table public.student_applications add constraint student_applications_status_check check(status in ('draft','submitted','processing','under_review','action_required','conditional_offer','accepted','successful','failed','offer_rejected','closed_other_offer_accepted'));

-- Let a university officer see and update applications assigned to their institution.
drop policy if exists "Officers can read all applications" on public.student_applications;
drop policy if exists "Officers can update all applications" on public.student_applications;
create policy "staff read assigned applications" on public.student_applications for select to authenticated using(
  public.is_admin() or exists(select 1 from public.officer_profiles p where p.id=auth.uid() and p.role='university_officer' and p.status='active' and (p.university_id=selected_university or exists(select 1 from public.universities u where u.id=p.university_id and u.name=selected_university)))
);
create policy "staff update assigned applications" on public.student_applications for update to authenticated using(
  public.is_admin() or exists(select 1 from public.officer_profiles p where p.id=auth.uid() and p.role='university_officer' and p.status='active' and (p.university_id=selected_university or exists(select 1 from public.universities u where u.id=p.university_id and u.name=selected_university)))
) with check(
  public.is_admin() or exists(select 1 from public.officer_profiles p where p.id=auth.uid() and p.role='university_officer' and p.status='active' and (p.university_id=selected_university or exists(select 1 from public.universities u where u.id=p.university_id and u.name=selected_university)))
);
alter table public.student_applications add column if not exists pathway_request text;

-- One-university acceptance rule enforced in the database.
create or replace function public.accept_offer(p_offer_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_offer public.offers%rowtype;
begin
  select * into v_offer from public.offers where id=p_offer_id and student_id=auth.uid() for update;
  if not found then raise exception 'Offer not found or not owned by this student'; end if;
  if exists(select 1 from public.offers where student_id=auth.uid() and status='accepted' and id<>p_offer_id) then
    raise exception 'Another university offer has already been accepted';
  end if;
  update public.offers set status='accepted' where id=p_offer_id;
  update public.offers set status='declined_after_other_acceptance' where student_id=auth.uid() and id<>p_offer_id and status='sent';
  update public.student_applications set status=case when id=v_offer.application_id then 'accepted' else 'closed_other_offer_accepted' end, updated_at=now()
    where user_id=auth.uid() and (id=v_offer.application_id or status in ('draft','submitted','processing','under_review','action_required','conditional_offer'));
end; $$;
grant execute on function public.accept_offer(text) to authenticated;

update storage.buckets set public=false where id='application-documents';

-- Private application document policies
drop policy if exists "Authenticated users can upload application documents" on storage.objects;
drop policy if exists "Authenticated users can read application documents" on storage.objects;
drop policy if exists "Authenticated users can update application documents" on storage.objects;
create policy "students upload own application documents" on storage.objects for insert to authenticated with check(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "students read own application documents" on storage.objects for select to authenticated using(bucket_id='application-documents' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "students update own application documents" on storage.objects for update to authenticated using(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='application-documents' and (storage.foldername(name))[1]=auth.uid()::text);
