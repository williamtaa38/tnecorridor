# University duplicate-key fix (v10.1)

The `universities.id` value is the university short code and is the primary key.
The Admin Portal normalizes entered codes to uppercase, so entering `NUMed` becomes
`NUMED`. If `NUMED` already exists, inserting it again correctly fails.

v10.1 changes the Admin Portal to:
- detect duplicate university codes and names before insert;
- show a friendly `University already exists` message instead of a raw PostgreSQL error;
- add an **Edit** action for university name/location;
- lock the university code during editing because it is referenced by courses,
  scholarships, pathway packages, applications, offers and staff permissions;
- keep **Activate / Deactivate** for lifecycle management;
- enforce case-insensitive uniqueness for university code and name in PostgreSQL.

The live Supabase project already has the database-side duplicate guard applied.
