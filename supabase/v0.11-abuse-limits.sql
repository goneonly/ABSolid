-- ABSolid v0.11 — 가입·기능 남용 방지
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- 선행: v0.10-signup-profile.sql 까지 실행되어 있어야 함
--
-- 포함:
--   1) 일회용(임시) 이메일 가입 차단 — 서버가 거절 + 앱이 가입 전에 미리 안내
--   2) 그룹 생성: 한 사람당 하루 5개
--   3) 신고: 하루 20건, 같은 사람·같은 날짜 인증샷 중복 신고 불가
--   4) 초대 코드: 틀린 코드는 한 시간에 10번까지 (코드 무작위 대입 방지)
-- 봇 가입 차단(캡차)·IP 당 요청 제한은 Supabase 대시보드 설정 (docs/SUPABASE_SETUP.md)

-- ══════════════════════════════════════════════
-- 1) 일회용 이메일
-- ══════════════════════════════════════════════
create table if not exists public.blocked_email_domains (
  domain text primary key check (domain = lower(domain))
);
alter table public.blocked_email_domains enable row level security; -- 정책 없음: 아래 함수로만 확인

-- 자주 쓰이는 일회용 메일 도메인 (필요하면 SQL Editor 에서 insert 로 추가)
insert into public.blocked_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'), ('guerrillamailblock.com'),
  ('sharklasers.com'), ('grr.la'), ('pokemail.net'), ('spam4.me'),
  ('10minutemail.com'), ('10minutemail.net'), ('20minutemail.com'),
  ('temp-mail.org'), ('temp-mail.io'), ('temp-mail.de'), ('tempmail.com'), ('tempmail.net'), ('tempmailo.com'),
  ('tempmailaddress.com'), ('tempinbox.com'), ('tempr.email'), ('mytemp.email'),
  ('yopmail.com'), ('yopmail.net'), ('yopmail.fr'),
  ('trashmail.com'), ('trashmail.de'), ('wegwerfmail.de'), ('wegwerfemail.de'), ('byom.de'),
  ('getnada.com'), ('nada.email'), ('dispostable.com'), ('discard.email'), ('maildrop.cc'), ('mailnesia.com'),
  ('mintemail.com'), ('mohmal.com'), ('throwawaymail.com'), ('fakeinbox.com'), ('emailondeck.com'),
  ('mailcatch.com'), ('spamgourmet.com'), ('burnermail.io'), ('moakt.com'), ('tmail.ws'),
  ('tmpmail.org'), ('tmpmail.net'), ('inboxkitten.com'), ('mail.tm'), ('mail.gw'),
  ('emailfake.com'), ('fakemail.net'), ('mailpoof.com'), ('spambox.us'), ('harakirimail.com'), ('mailsac.com'),
  ('mailforspam.com'), ('emltmp.com'), ('owlymail.com'), ('mail7.io'), ('chacuo.net'), ('linshiyouxiang.net'),
  ('1secmail.com'), ('1secmail.net'), ('1secmail.org'), ('kzccv.com'), ('qiott.com'), ('wuuvo.com'),
  ('icznn.com'), ('ezztt.com'), ('vjuum.com'),
  ('armyspy.com'), ('cuvox.de'), ('dayrep.com'), ('einrot.com'), ('fleckens.hu'), ('gustr.com'),
  ('jourrapide.com'), ('rhyta.com'), ('superrito.com'), ('teleworm.us'), ('trbvm.com')
on conflict do nothing;

-- 일회용 메일 여부 (앱이 가입 버튼을 누르기 전에 확인 — 비로그인도 호출 가능)
create or replace function public.is_disposable_email(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_email_domains d
    where d.domain = lower(split_part(btrim(coalesce(p_email, '')), '@', 2))
  );
$$;
grant execute on function public.is_disposable_email(text) to anon, authenticated;

-- 이메일 가입이 일회용 메일이면 거절 (앱 확인을 건너뛴 API 직접 가입도 막음)
create or replace function public.absolid_block_disposable_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'email' and public.is_disposable_email(new.email) then
    raise exception 'absolid: 일회용 이메일로는 가입할 수 없어요.';
  end if;
  return new;
end $$;
revoke all on function public.absolid_block_disposable_email() from public, anon, authenticated;

drop trigger if exists trg_absolid_block_disposable_email on auth.users;
create trigger trg_absolid_block_disposable_email
  before insert on auth.users
  for each row execute function public.absolid_block_disposable_email();

-- ══════════════════════════════════════════════
-- 2) 그룹 생성 — 하루 5개
-- ══════════════════════════════════════════════
create or replace function public.limit_group_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.groups g
      where g.created_by = new.created_by and g.created_at > now() - interval '1 day') >= 5 then
    raise exception '그룹은 하루에 5개까지 만들 수 있어요. 내일 다시 시도해 주세요.';
  end if;
  return new;
end $$;
revoke all on function public.limit_group_creation() from public, anon, authenticated;

drop trigger if exists trg_limit_group_creation on public.groups;
create trigger trg_limit_group_creation
  before insert on public.groups
  for each row execute function public.limit_group_creation();

-- ══════════════════════════════════════════════
-- 3) 신고 — 하루 20건, 중복 신고 불가
-- ══════════════════════════════════════════════
create or replace function public.limit_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.reports r
             where r.reporter_id = new.reporter_id and r.target_user_id = new.target_user_id
               and r.target_date = new.target_date) then
    raise exception '이미 신고한 인증샷이에요. 관리자가 확인 중이에요.';
  end if;
  if (select count(*) from public.reports r
      where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 day') >= 20 then
    raise exception '신고는 하루에 20건까지 할 수 있어요.';
  end if;
  return new;
end $$;
revoke all on function public.limit_reports() from public, anon, authenticated;

drop trigger if exists trg_limit_reports on public.reports;
create trigger trg_limit_reports
  before insert on public.reports
  for each row execute function public.limit_reports();

-- ══════════════════════════════════════════════
-- 4) 초대 코드 무작위 대입 방지
-- ══════════════════════════════════════════════
-- 틀린 코드 시도 기록 (사용자만, 최근 1시간분만 유지)
create table if not exists public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists join_attempts_user_time on public.join_attempts (user_id, created_at);
alter table public.join_attempts enable row level security; -- 정책 없음: join_group() 만 기록·조회

-- v0.5 join_group 교체: 틀린 코드는 오류 대신 빈 결과로 응답해야 시도 기록이 남음
-- (오류를 내면 트랜잭션이 되돌려져 기록도 사라짐 — 앱은 빈 결과를 "코드를 찾을 수 없어요"로 표시)
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

  -- 그룹 행을 잠근 채 조회 → 동시 참여 경합 방지
  select * into g from public.groups gr where gr.invite_code = upper(btrim(code)) for update;
  if g.id is null then
    insert into public.join_attempts (user_id) values (uid);
    return; -- 빈 결과
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

  -- 회원만 받기: 이름·전화번호 등록 필수
  if g.members_only then
    select * into me from public.profiles p where p.id = uid;
    if coalesce(me.full_name, '') = '' or coalesce(me.phone, '') = '' then
      raise exception '이 그룹은 이름·전화번호를 등록한 회원만 참여할 수 있어요. 설정에서 회원가입을 완료해 주세요.';
    end if;
  end if;

  insert into public.group_members (group_id, user_id) values (g.id, uid)
    on conflict do nothing;

  return query select g.id, g.name, g.invite_code, g.max_members, g.members_only;
end $$;
