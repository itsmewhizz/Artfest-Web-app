-- ============================================================
-- Migration: Add judge_credentials and judge_verify_credentials RPC functions
-- Run in the Supabase Dashboard (SQL Editor) if missing from schema cache.
-- ============================================================

create extension if not exists pgcrypto;

-- 1. judge_credentials(p_judge_email, p_judge_password)
create or replace function public.judge_credentials(
  p_judge_email text,
  p_judge_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
  v_email text;
  v_valid boolean := false;
begin
  select id, email, coalesce(raw_app_meta_data ->> 'role', '')
    into v_user_id, v_email, v_role
  from auth.users
  where lower(email) = lower(trim(p_judge_email));

  if v_user_id is not null then
    select (encrypted_password = crypt(p_judge_password, encrypted_password))
      into v_valid
    from auth.users
    where id = v_user_id;
  end if;

  if v_valid is true then
    return jsonb_build_object(
      'valid', true,
      'judge_id', v_user_id,
      'email', v_email,
      'role', v_role
    );
  else
    return jsonb_build_object(
      'valid', false,
      'error', 'invalid_credentials'
    );
  end if;
end;
$$;

-- 2. Alias: judge_verify_credentials(p_judge_email, p_judge_password)
create or replace function public.judge_verify_credentials(
  p_judge_email text,
  p_judge_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return public.judge_credentials(p_judge_email, p_judge_password);
end;
$$;

grant execute on function public.judge_credentials(text, text) to authenticated, anon;
grant execute on function public.judge_verify_credentials(text, text) to authenticated, anon;
