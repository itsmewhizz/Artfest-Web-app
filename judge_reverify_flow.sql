-- ============================================================
-- Judges panel: re-verified edit of results (including LOCKED)
-- Run in the Supabase Dashboard (SQL Editor).
--
-- REPLACES the earlier "locked = permanently immutable" rule:
--   * A locked result CAN be edited again, but ONLY through this
--     flow (Yes -> judge name -> judge password -> captcha).
--   * There is no other path: RLS still blocks all direct UPDATEs
--     to locked rows (see judges_rls.sql). This flow is the only
--     SECURITY DEFINER write path, and it re-verifies everything
--     server-side before touching the row.
--   * After a successful re-verified edit the result is re-locked
--     (locked = true) again.
--   * Every successful re-verified edit is written to result_edit_log.
--
-- Adds:
--   1. pgcrypto                     (server-side password re-verification)
--   2. judge_captcha_challenges     (single-use, 5-min server captcha)
--   3. result_edit_log              (audit log)
--   4. judge_create_captcha()       (RPC: issue a server captcha)
--   5. judge_reverify_edit()        (RPC: the ONLY secure write path)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Server-side captcha challenges (single use, 5 min expiry)
--    No direct table policies: only the SECURITY DEFINER functions
--    below may touch this table.
-- ------------------------------------------------------------
create table if not exists public.judge_captcha_challenges (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null,
  captcha text not null,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used boolean not null default false
);

alter table public.judge_captcha_challenges enable row level security;

-- ------------------------------------------------------------
-- 2. Audit log for re-verified edits
-- ------------------------------------------------------------
create table if not exists public.result_edit_log (
  id uuid primary key default gen_random_uuid(),
  result_id uuid,
  programme_id text,
  programme_name text,
  judge_email text,
  edited_at timestamptz not null default now(),
  old_first jsonb,
  old_second jsonb,
  old_third jsonb,
  new_first jsonb,
  new_second jsonb,
  new_third jsonb
);

alter table public.result_edit_log enable row level security;

-- Admins may view the audit log.
drop policy if exists "admins_select_edit_log" on public.result_edit_log;
create policy "admins_select_edit_log" on public.result_edit_log
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- 3. judge_create_captcha() - issue a server-side captcha
--    Returns { challenge_id, captcha, expires_at }. Only a logged-in judge
--    may request one. expires_at lets the client show/auto-refresh the code
--    before it goes stale.
-- ------------------------------------------------------------
create or replace function public.judge_create_captcha()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_captcha text := '';
  v_i int;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'judge' then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  for v_i in 1..6 loop
    v_captcha := v_captcha || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  end loop;

  insert into public.judge_captcha_challenges (judge_id, captcha)
  values (auth.uid(), v_captcha)
  returning id into v_id;

  return jsonb_build_object(
    'challenge_id', v_id,
    'captcha', v_captcha,
    'expires_at', to_char(now() + interval '5 minutes', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
end;
$$;

-- ------------------------------------------------------------
-- 4. judge_reverify_edit() - the ONLY secure write path for results
--    Re-verifies server-side:
--      * caller is an authenticated judge
--      * judge name matches the signed-in judge's email
--      * judge password matches (crypt() against auth.users)
--      * captcha challenge is valid, unexpired and unused
--    Then upserts the result, sets locked = true (re-lock) and
--    writes an audit log row. SECURITY DEFINER bypasses RLS, so
--    this is the single sanctioned way to touch a locked result.
-- ------------------------------------------------------------
create or replace function public.judge_reverify_edit(
  p_challenge_id uuid,
  p_captcha text,
  p_judge_email text,
  p_judge_password text,
  p_programme_id text,
  p_programme_name text,
  p_result_no integer default null,
  p_first jsonb default null,
  p_second jsonb default null,
  p_third jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_email text := auth.jwt() ->> 'email';
  v_judge_ok boolean;
  v_chal public.judge_captcha_challenges%rowtype;
  v_existing_id uuid;
  v_old_first jsonb;
  v_old_second jsonb;
  v_old_third jsonb;
  v_new_id uuid;
  v_next_no integer;
begin
  -- 1) Must be an authenticated judge
  if auth.uid() is null or v_role <> 'judge' then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  -- 2) Judge name must match the signed-in judge's email
  if lower(p_judge_email) <> lower(v_email) then
    return jsonb_build_object('error', 'invalid_judge');
  end if;

  -- 3) Re-verify the judge's password server-side
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and encrypted_password = crypt(p_judge_password, encrypted_password)
  ) into v_judge_ok;
  if not v_judge_ok then
    return jsonb_build_object('error', 'invalid_judge');
  end if;

  -- 4) Validate the captcha challenge (single use, 5 min)
  select * into v_chal from public.judge_captcha_challenges
  where id = p_challenge_id
    and judge_id = auth.uid()
    and used = false
    and expires_at > now();
  if v_chal.id is null then
    return jsonb_build_object('error', 'captcha_invalid');
  end if;
  if upper(trim(p_captcha)) <> v_chal.captcha then
    update public.judge_captcha_challenges set used = true where id = v_chal.id;
    return jsonb_build_object('error', 'captcha_invalid');
  end if;
  update public.judge_captcha_challenges set used = true where id = v_chal.id;

  -- 5) Upsert the result for this programme (latest row)
  select id, first, second, third
    into v_existing_id, v_old_first, v_old_second, v_old_third
  from public.results
  where "programmeId" = p_programme_id
  order by "updatedAt" desc nulls last
  limit 1;

  if v_existing_id is null then
    if p_result_no is null then
      select coalesce(max("resultNo"), 0) + 1 into v_next_no from public.results;
    else
      v_next_no := p_result_no;
    end if;
    insert into public.results ("programmeId", name, first, second, third, "updatedAt", locked, "resultNo")
    values (p_programme_id, p_programme_name, p_first, p_second, p_third, now(), true, v_next_no)
    returning id into v_new_id;
  else
    update public.results
    set first = p_first,
        second = p_second,
        third = p_third,
        "updatedAt" = now(),
        locked = true
    where id = v_existing_id
    returning id into v_new_id;
  end if;

  -- 6) Audit log
  insert into public.result_edit_log
    (result_id, programme_id, programme_name, judge_email,
     old_first, old_second, old_third, new_first, new_second, new_third)
  values
    (v_new_id, p_programme_id, p_programme_name, v_email,
     v_old_first, v_old_second, v_old_third, p_first, p_second, p_third);

  return jsonb_build_object('ok', true, 'result_id', v_new_id);
end;
$$;
