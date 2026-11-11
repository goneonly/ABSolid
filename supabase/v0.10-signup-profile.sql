-- Absolid v0.10 — 가입 정보(이름·전화번호·동의)를 서버가 가입 순간에 저장·검증
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- 선행: v0.9-user-blocks.sql 까지 실행되어 있어야 함
--
-- 문제: 이메일 인증을 켜면 가입 직후엔 로그인 세션이 없어 앱이 프로필을 저장하지 못함.
--       그래서 이름·전화번호·동의 기록을 그 기기에 임시 보관했다가 첫 로그인 때 올렸는데,
--       메일 인증 후 다른 기기에서 로그인하면 정보가 사라지고, API 로 직접 가입하면 아예 빠질 수 있었음.
-- 해결: 앱이 가입 요청에 실어 보낸 값(user metadata)을 auth.users 생성 트리거가 검증해 profiles 에 저장.
--       이메일 가입은 이름·전화번호·만 14세 동의가 없거나 형식이 틀리면 가입 자체를 거절.

create or replace function public.absolid_create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := btrim(coalesce(m->>'full_name', ''));
  v_digits text := regexp_replace(coalesce(m->>'phone', ''), '[^0-9]', '', 'g');
  v_nick text := btrim(coalesce(m->>'nickname', ''));
  v_age boolean := coalesce(m->>'age_over_14', '') = 'true';
  v_phone text;
begin
  -- 앱 가입 화면과 같은 규칙 (src/validation.js): 한글 또는 영문 2~20자 / 한국 휴대폰 번호
  if v_name !~ '^([가-힣]+|[A-Za-z]+( [A-Za-z]+)*)$' or char_length(v_name) not between 2 and 20 then v_name := ''; end if;
  if v_digits !~ '^01[016789][0-9]{7,8}$' then v_digits := ''; end if;
  if v_nick !~ '^[가-힣A-Za-z0-9_]{2,12}$' then v_nick := ''; end if;

  -- 이메일 가입은 필수값 강제 (대시보드에서 만든 계정·소셜 로그인 등은 그대로 허용)
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'email'
     and (v_name = '' or v_digits = '' or not v_age) then
    raise exception 'absolid: 가입 정보(이름·전화번호·만 14세 동의)가 올바르지 않아요.';
  end if;

  v_phone := case char_length(v_digits)
    when 11 then substr(v_digits, 1, 3) || '-' || substr(v_digits, 4, 4) || '-' || substr(v_digits, 8)
    when 10 then substr(v_digits, 1, 3) || '-' || substr(v_digits, 4, 3) || '-' || substr(v_digits, 7)
    else '' end;

  insert into public.profiles (id, nickname, full_name, phone, age_over_14, terms_version, terms_agreed_at)
  values (
    new.id,
    coalesce(nullif(v_nick, ''), left(v_name, 12)),
    v_name,
    v_phone,
    v_age,
    nullif(left(coalesce(m->>'terms_version', ''), 20), ''),
    case when v_age then now() end              -- 동의 시각은 서버 시간 (기기 시간 조작 방지)
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.absolid_create_profile() from public, anon, authenticated;

drop trigger if exists trg_absolid_create_profile on auth.users;
create trigger trg_absolid_create_profile
  after insert on auth.users
  for each row execute function public.absolid_create_profile();
