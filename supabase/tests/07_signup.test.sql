-- 가입 — 이름, 전화번호, 동의 누락, 형식 위조, 메타데이터로 관리자 권한 주입
begin;
select tests.as_operator(); -- 가입은 인증 서버(GoTrue)가 auth.users 에 직접 넣음

create function pg_temp.signup(p_meta jsonb, p_provider text default 'email') returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (v, v || '@test.local', p_meta, jsonb_build_object('provider', p_provider));
  return v;
end $$;
-- 가입 직후 만들어진 프로필
create function pg_temp.prof(p_meta jsonb, p_provider text default 'email') returns public.profiles language plpgsql as $$
declare v uuid := pg_temp.signup(p_meta, p_provider); r public.profiles;
begin
  select * into r from public.profiles where id = v;
  return r;
end $$;

-- ── 정상 가입: 가입 순간 서버에 프로필 저장 (메일 인증 후 어느 기기로 로그인해도 유지) ──
create temp table ok as select pg_temp.signup(
  '{"full_name":"김철수","phone":"01012345678","age_over_14":"true","terms_version":"2026-10"}') as id;
select tests.eq((select full_name || '/' || phone || '/' || nickname from public.profiles where id = (select id from ok)),
  '김철수/010-1234-5678/김철수', '이름, 전화번호 저장, 닉네임 기본값은 이름');
select tests.ok((select age_over_14 and terms_version = '2026-10' and terms_agreed_at is not null
  from public.profiles where id = (select id from ok)), '만 14세, 약관 동의 기록 저장 (동의 시각은 서버 시간)');
select tests.eq((select role from public.profiles where id = (select id from ok)), 'user', '일반 회원으로 시작');
select tests.eq((pg_temp.prof('{"full_name":"Jane Doe","phone":"010-9876-5432","age_over_14":"true","nickname":"jane_1"}')).nickname, 'jane_1',
  '영문 이름 + 닉네임 지정 가입');

-- ── 필수값 누락, 형식 위조는 가입 거절 ──
select tests.throws($$select pg_temp.signup('{"phone":"01012345678","age_over_14":"true"}')$$, '가입 정보', '이름 없이 가입 불가');
select tests.throws($$select pg_temp.signup('{"full_name":"김철수","age_over_14":"true"}')$$, '가입 정보', '전화번호 없이 가입 불가');
select tests.throws($$select pg_temp.signup('{"full_name":"김철수","phone":"01012345678"}')$$, '가입 정보', '만 14세 동의 없이 가입 불가');
select tests.throws($$select pg_temp.signup('{"full_name":"<script>","phone":"01012345678","age_over_14":"true"}')$$, '가입 정보',
  '이름 형식 위조 불가');
select tests.throws($$select pg_temp.signup('{"full_name":"김철수","phone":"02-123-4567","age_over_14":"true"}')$$, '가입 정보',
  '휴대폰이 아닌 번호 불가');
select tests.throws($$select pg_temp.signup('{}')$$, '가입 정보', '정보 없이 API 로 직접 가입 불가');

-- ── 메타데이터로 권한, 잘못된 값 주입 시도 ──
select tests.eq((pg_temp.prof('{"full_name":"김철수","phone":"01012345678","age_over_14":"true","role":"admin","is_active":false}')).role, 'user',
  '메타데이터의 role 은 무시 (관리자 위장 불가)');
select tests.eq((pg_temp.prof('{"full_name":"김철수","phone":"01012345678","age_over_14":"true","nickname":"x"}')).nickname, '김철수',
  '규칙에 안 맞는 닉네임은 이름으로 대체');

-- ── 이메일 가입이 아닌 계정(대시보드 생성 등)은 그대로 허용 ──
select tests.eq((pg_temp.prof(null, 'phone')).full_name, '', '이메일 외 가입은 빈 프로필로 생성');

rollback;
