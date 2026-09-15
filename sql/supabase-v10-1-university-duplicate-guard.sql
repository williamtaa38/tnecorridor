-- TNE Corridor v10.1
-- Prevent duplicate university records that differ only by case/spacing.
-- Safe to re-run.

create unique index if not exists universities_id_case_insensitive_uidx
  on public.universities (upper(trim(id)));

create unique index if not exists universities_name_case_insensitive_uidx
  on public.universities (lower(trim(name)));
