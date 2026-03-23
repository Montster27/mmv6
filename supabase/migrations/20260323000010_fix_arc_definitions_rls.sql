-- Fix: arc_definitions only had an 'authenticated' RLS policy.
-- If the browser client's JWT isn't attached yet when getOrCreateDailyRun
-- fires, the query returns zero rows and all arc beats silently vanish.
-- arc_definitions is static game config, not user data — make it public.

BEGIN;

-- Add a public read policy (keeps existing authenticated policy too)
CREATE POLICY arc_definitions_select_public
  ON public.arc_definitions
  FOR SELECT
  USING (is_enabled = true);

COMMIT;
