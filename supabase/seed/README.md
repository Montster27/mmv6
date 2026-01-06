# Seed: storylets

We are not using the Supabase CLI yet. To seed storylets:

1) Open Supabase Dashboard → SQL Editor.  
2) Copy the contents of `supabase/seed/0001_storylets.sql`.  
3) Run once. This inserts 4 active storylets with minimal choices.

Notes
- Choices follow the structure used in Phase One: `[{ "id": "...", "label": "...", "effects": { "stress": x, "energy": y }, "flags": [...] }]`.
- No writes are performed from the app; this is a one-time seed.
