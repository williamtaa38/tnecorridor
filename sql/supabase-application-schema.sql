-- ===============================
-- TNE Corridor Student Application Portal
-- Supabase starter schema
-- ===============================

-- 1) Applications table
create table if not exists public.student_applications (
  id text primary key,
  user_id uuid null references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  nationality text default 'Malaysian',
  selected_university text,
  selected_course text,
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
  status text default 'draft' check (status in ('draft','submitted','processing','action_required','successful','failed')),
  priority text default 'Normal',
  officer_note text,
  student_documents jsonb default '[]'::jsonb,
  officer_documents jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Optional officer profile table
create table if not exists public.officer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'officer' check (role in ('officer','admin')),
  created_at timestamptz default now()
);

-- 3) Storage bucket for application documents
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', true)
on conflict (id) do nothing;

-- 4) updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_student_applications_updated_at on public.student_applications;
create trigger set_student_applications_updated_at
before update on public.student_applications
for each row execute function public.set_updated_at();

-- 5) Row Level Security
alter table public.student_applications enable row level security;
alter table public.officer_profiles enable row level security;

-- Student can read own application
create policy "Students can read own applications"
on public.student_applications
for select
using (auth.uid() = user_id);

-- Student can insert own application
create policy "Students can insert own applications"
on public.student_applications
for insert
with check (auth.uid() = user_id);

-- Student can update own application before final outcome
create policy "Students can update own active applications"
on public.student_applications
for update
using (auth.uid() = user_id and status in ('draft','submitted','action_required'))
with check (auth.uid() = user_id);

-- Officers can read all applications
create policy "Officers can read all applications"
on public.student_applications
for select
using (
  exists (
    select 1 from public.officer_profiles op
    where op.id = auth.uid()
    and op.role in ('officer','admin')
  )
);

-- Officers can update all applications
create policy "Officers can update all applications"
on public.student_applications
for update
using (
  exists (
    select 1 from public.officer_profiles op
    where op.id = auth.uid()
    and op.role in ('officer','admin')
  )
)
with check (
  exists (
    select 1 from public.officer_profiles op
    where op.id = auth.uid()
    and op.role in ('officer','admin')
  )
);

-- Officer profile policies
create policy "Users can read own officer profile"
on public.officer_profiles
for select
using (auth.uid() = id);

-- Storage policies for public bucket demo.
-- For production, change public=false and use signed URLs.
create policy "Authenticated users can upload application documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'application-documents');

create policy "Authenticated users can read application documents"
on storage.objects
for select
to authenticated
using (bucket_id = 'application-documents');

create policy "Authenticated users can update application documents"
on storage.objects
for update
to authenticated
using (bucket_id = 'application-documents')
with check (bucket_id = 'application-documents');
