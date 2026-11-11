-- Absolid v0.9 — 사용자 차단
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- 선행: v0.8-cheers-and-push.sql 까지 실행되어 있어야 함
--
-- 포함:
--   1) 차단 목록(user_blocks) — 차단한 본인만 조회·추가·해제 (상대는 차단 사실을 알 수 없음)
--   2) 차단 / 해제 / 내 차단 목록 함수
--   3) 응원: 차단 관계(어느 쪽이든)면 보낼 수 없고, 받은 응원 목록에서도 제외
--
-- 그룹 화면의 멤버·리더보드·인증샷은 my_blocked_ids() 로 받은 목록을 앱에서 숨김.

-- ══════════════════════════════════════════════
-- 1) 차단 목록
-- ══════════════════════════════════════════════
create table if not exists public.user_blocks (
  blocker uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked);
alter table public.user_blocks enable row level security;

-- 본인이 한 차단만 조회·해제. 추가는 block_user() 로만 (존재하지 않는 사용자·자기 자신 차단 방지)
drop policy if exists "user_blocks: 본인 조회" on public.user_blocks;
create policy "user_blocks: 본인 조회" on public.user_blocks
  for select using (blocker = auth.uid());
drop policy if exists "user_blocks: 본인 해제" on public.user_blocks;
create policy "user_blocks: 본인 해제" on public.user_blocks
  for delete using (blocker = auth.uid());

-- 두 사람 사이에 차단이 있는지 (어느 쪽이 했든) — 응원 등 상호작용 차단용
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;
-- 누가 누구를 차단했는지 탐색하지 못하게 앱 사용자에게는 실행 권한을 주지 않음 (security definer 함수 안에서만 사용)
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════
-- 2) 차단 / 해제 / 목록
-- ══════════════════════════════════════════════
create or replace function public.block_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;
  if p_target is null or p_target = uid then raise exception '자기 자신은 차단할 수 없어요.'; end if;
  if not exists (select 1 from auth.users where id = p_target) then raise exception '존재하지 않는 사용자예요.'; end if;
  insert into public.user_blocks (blocker, blocked) values (uid, p_target)
  on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요해요.'; end if;
  delete from public.user_blocks where blocker = auth.uid() and blocked = p_target;
end $$;

-- 내가 차단한 사용자 (설정 화면용 — 닉네임만, 이름·전화번호는 노출 안 함)
create or replace function public.my_blocks()
returns table(id uuid, nickname text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked, coalesce(nullif(p.nickname, ''), '이름 없음'), b.created_at
  from public.user_blocks b
  left join public.profiles p on p.id = b.blocked
  where b.blocker = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.my_blocks() from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.my_blocks() to authenticated;

-- ══════════════════════════════════════════════
-- 3) 응원 — 차단 관계 반영 (v0.8 함수 교체)
-- ══════════════════════════════════════════════
create or replace function public.send_cheer(p_group uuid, p_to uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  v_kind text;
  v_id bigint;
begin
  if uid is null then raise exception '로그인이 필요해요.'; end if;
  if p_to = uid then raise exception '자기 자신은 응원할 수 없어요.'; end if;
  if not exists (select 1 from public.group_members gm where gm.group_id = p_group and gm.user_id = uid)
     or not exists (select 1 from public.group_members gm where gm.group_id = p_group and gm.user_id = p_to) then
    raise exception '같은 그룹 멤버만 응원할 수 있어요.';
  end if;
  -- 차단 관계면 거절 (누가 차단했는지는 알리지 않음)
  if public.is_blocked_between(uid, p_to) then raise exception '이 멤버에게는 응원을 보낼 수 없어요.'; end if;

  -- 응원 종류는 서버가 판단 (상대가 오늘 운동했는지)
  v_kind := case when exists (
    select 1 from public.workouts w where w.user_id = p_to and w.date = today
  ) then 'done' else 'nudge' end;

  insert into public.cheers (group_id, from_user, to_user, date, kind)
  values (p_group, uid, p_to, today, v_kind)
  on conflict (from_user, to_user, date) do nothing
  returning id into v_id;
  return v_id;
end $$;

-- 오늘 내가 받은 응원 — 내가 차단한 사람이 차단 전에 보낸 응원도 숨김
create or replace function public.my_received_cheers()
returns table(from_nickname text, kind text, group_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.nickname, ''), '이름 없음'), c.kind, g.name, c.created_at
  from public.cheers c
  left join public.profiles p on p.id = c.from_user
  left join public.groups g on g.id = c.group_id
  where c.to_user = auth.uid()
    and c.date = (now() at time zone 'Asia/Seoul')::date
    and not exists (select 1 from public.user_blocks b where b.blocker = auth.uid() and b.blocked = c.from_user)
  order by c.created_at desc;
$$;
