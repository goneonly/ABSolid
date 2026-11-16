-- ABSolid v0.12 — 그룹장의 멤버 내보내기와 참여 막기
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- 선행: v0.11-abuse-limits.sql 까지 실행되어 있어야 함
--
-- 포함:
--   1) 참여 막은 사람 표 (group_bans) — 그룹장만 조회
--   2) kick_member: 그룹장이 멤버를 내보냄. p_ban 이면 같은 초대 코드로 다시 들어오지 못하게 막음
--   3) group_bans_of, unban_member: 그룹장이 막은 사람 목록 보기, 막기 풀기
--   4) join_group 교체: 막힌 사람은 참여 거절 (나머지는 v0.11 과 같음)
-- 개인끼리의 차단(user_blocks, v0.9)과는 별개. 그쪽은 서로 보이지 않게 하는 것이고, 이쪽은 그룹에서 빼는 것

-- ══════════════════════════════════════════════
-- 1) 참여 막은 사람
-- ══════════════════════════════════════════════
create table if not exists public.group_bans (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  banned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_bans enable row level security;
-- 조회: 그 그룹의 그룹장만. 추가, 삭제는 아래 함수로만 (정책 없음)
drop policy if exists "group_bans: 그룹장 조회" on public.group_bans;
create policy "group_bans: 그룹장 조회" on public.group_bans
  for select using (exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()));

-- 그룹장인지 확인하고 그룹 행을 잠금 (동시에 나가기, 내보내기가 겹치지 않게)
create or replace function public._require_group_owner(p_gid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;
  perform 1 from public.groups gr where gr.id = p_gid and gr.created_by = uid for update;
  if not found then raise exception '그룹장만 할 수 있어요.'; end if;
end $$;
revoke all on function public._require_group_owner(uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════
-- 2) 내보내기
-- ══════════════════════════════════════════════
create or replace function public.kick_member(p_gid uuid, p_target uuid, p_ban boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_group_owner(p_gid);
  if p_target = auth.uid() then
    raise exception '자기 자신은 내보낼 수 없어요. 그룹 나가기를 이용해 주세요.';
  end if;
  delete from public.group_members gm where gm.group_id = p_gid and gm.user_id = p_target;
  if not found then raise exception '이 그룹의 멤버가 아니에요.'; end if;
  if coalesce(p_ban, false) then
    insert into public.group_bans (group_id, user_id, banned_by) values (p_gid, p_target, auth.uid())
      on conflict do nothing;
  end if;
end $$;
revoke all on function public.kick_member(uuid, uuid, boolean) from public, anon;
grant execute on function public.kick_member(uuid, uuid, boolean) to authenticated;

-- ══════════════════════════════════════════════
-- 3) 막은 사람 목록, 막기 풀기
-- ══════════════════════════════════════════════
create or replace function public.group_bans_of(p_gid uuid)
returns table(user_id uuid, nickname text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_group_owner(p_gid);
  return query
    select gb.user_id, coalesce(p.nickname, ''), gb.created_at
    from public.group_bans gb left join public.profiles p on p.id = gb.user_id
    where gb.group_id = p_gid
    order by gb.created_at desc;
end $$;
revoke all on function public.group_bans_of(uuid) from public, anon;
grant execute on function public.group_bans_of(uuid) to authenticated;

create or replace function public.unban_member(p_gid uuid, p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_group_owner(p_gid);
  delete from public.group_bans gb where gb.group_id = p_gid and gb.user_id = p_target;
end $$;
revoke all on function public.unban_member(uuid, uuid) from public, anon;
grant execute on function public.unban_member(uuid, uuid) to authenticated;

-- ══════════════════════════════════════════════
-- 4) 참여: 막힌 사람 거절
-- ══════════════════════════════════════════════
create or replace function public.join_group(code text)
returns table(id uuid, name text, invite_code text, max_members int, members_only boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  g public.groups;
  uid uuid := auth.uid();
  cnt int;
  me public.profiles;
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;

  delete from public.join_attempts ja where ja.user_id = uid and ja.created_at < now() - interval '1 hour';
  if (select count(*) from public.join_attempts ja where ja.user_id = uid) >= 10 then
    raise exception '초대 코드를 너무 많이 틀렸어요. 1시간 뒤 다시 시도해 주세요.';
  end if;

  -- 그룹 행을 잠근 채 조회해 동시 참여 경합 방지
  select * into g from public.groups gr where gr.invite_code = upper(btrim(code)) for update;
  if g.id is null then
    insert into public.join_attempts (user_id) values (uid);
    return; -- 빈 결과
  end if;

  -- 그룹장이 참여를 막은 사람 (v0.12)
  if exists (select 1 from public.group_bans gb where gb.group_id = g.id and gb.user_id = uid) then
    raise exception '이 그룹에는 참여할 수 없어요.';
  end if;

  -- 이미 이 그룹 멤버면 그대로 반환 (재참여 무해)
  if exists (select 1 from public.group_members gm where gm.user_id = uid and gm.group_id = g.id) then
    return query select g.id, g.name, g.invite_code, g.max_members, g.members_only; return;
  end if;

  -- 정원 확인
  select count(*) into cnt from public.group_members gm where gm.group_id = g.id;
  if cnt >= g.max_members then
    raise exception '이 그룹은 정원(%명)이 가득 찼어요.', g.max_members;
  end if;

  -- 회원만 받기: 이름, 전화번호 등록 필수
  if g.members_only then
    select * into me from public.profiles p where p.id = uid;
    if coalesce(me.full_name, '') = '' or coalesce(me.phone, '') = '' then
      raise exception '이 그룹은 이름과 전화번호를 등록한 회원만 참여할 수 있어요. 설정에서 회원가입을 완료해 주세요.';
    end if;
  end if;

  insert into public.group_members (group_id, user_id) values (g.id, uid)
    on conflict do nothing;

  return query select g.id, g.name, g.invite_code, g.max_members, g.members_only;
end $$;
