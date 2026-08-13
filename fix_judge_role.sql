-- ============================================================
-- Fix judge login: add role='judge' to the judge accounts.
--
-- WHY: Your judge emails/passwords are valid and sign-in succeeds,
-- but app_metadata has NO role claim, so the app (and the judge
-- RPCs) refuse the session because app_metadata.role <> 'judge'.
--
-- RUN THIS in Supabase Dashboard -> SQL Editor.
-- After running, just log in again (each login mints a fresh JWT
-- that carries the new role claim).
-- ============================================================

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"judge"}'::jsonb
where email in ('judge1here@fest.com', 'judge2here@fest.com');

-- Sanity check: should print both rows with a role of "judge".
select email, raw_app_meta_data ->> 'role' as role
from auth.users
where email in ('judge1here@fest.com', 'judge2here@fest.com');