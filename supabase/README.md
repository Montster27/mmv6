# Supabase Phase One Schema

This project is not using the Supabase CLI yet. To apply the schema:

1) Open the Supabase Dashboard → SQL Editor.  
2) Copy the contents of `supabase/migrations/0001_phase1_schema.sql`.  
3) Run it once against your project.

What it does
- Creates the Phase One tables: `profiles`, `player_experiments`, `characters`, `daily_states`, `storylets`, `storylet_runs`, `social_actions`.
- Ensures `pgcrypto` is available (for `gen_random_uuid()`).
- Enables Row Level Security on every table and adds the required policies:
  - `profiles`: select/insert/update own row.
  - `player_experiments`: select/insert/update own row.
  - `characters`, `daily_states`, `storylet_runs`: select/insert/update where `user_id = auth.uid()`.
  - `storylets`: authenticated users can select active rows (`is_active = true`); no write policies.
  - `social_actions`: select if `from_user_id = auth.uid()` or `to_user_id = auth.uid()`; insert if `from_user_id = auth.uid()`.

Notes
- All user references point to `auth.users`.  
- Write policies are intentionally minimal; no delete policies are defined.  
- No additional tables, triggers, or future-proofing included.
