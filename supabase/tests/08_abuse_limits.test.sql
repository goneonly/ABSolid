-- 남용 방지 — 일회용 메일 가입, 그룹 대량 생성, 신고 도배, 초대 코드 무작위 대입
begin;

-- ── 일회용 이메일 ──
select tests.logout();
select tests.ok(public.is_disposable_email('Bot@Mailinator.com'), '비로그인도 가입 전 일회용 메일 확인 가능 (대소문자 무시)');
select tests.ok(not public.is_disposable_email('me@gmail.com'), '일반 메일은 통과');
select tests.eq(tests.count('select * from public.blocked_email_domains'), 0, '차단 도메인 목록 직접 조회 불가');
select tests.as_operator();
select tests.throws($$insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values (gen_random_uuid(), 'bot@yopmail.com',
    '{"full_name":"김철수","phone":"01012345678","age_over_14":"true"}', '{"provider":"email"}')$$,
  '일회용 이메일', 'API 로 직접 일회용 메일 가입해도 서버가 거절');
select tests.lives($$insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values (gen_random_uuid(), 'ok@gmail.com',
    '{"full_name":"김철수","phone":"01012345678","age_over_14":"true"}', '{"provider":"email"}')$$,
  '일반 메일 가입은 정상');

-- ── 그룹 생성: 하루 5개 (A 는 fixtures 에서 오늘 2개 생성) ──
select tests.login('A');
select tests.lives($$select public.create_group('그룹3', 5, false)$$, 'A: 오늘 3번째 그룹');
select tests.lives($$select public.create_group('그룹4', 5, false)$$, 'A: 4번째');
select tests.lives($$select public.create_group('그룹5', 5, false)$$, 'A: 5번째');
select tests.throws($$select public.create_group('그룹6', 5, false)$$, '하루에 5개', 'A: 6번째 그룹은 거절');
select tests.login('B');
select tests.lives($$select public.create_group('B의그룹', 5, false)$$, 'B: 다른 사람은 영향 없음');

-- ── 신고: 중복 불가 ──
select tests.lives(format($$insert into public.reports (reporter_id, target_user_id, target_date) values (%L, %L, current_date)$$,
    tests.uid('B'), tests.uid('A')), 'B: A 인증샷 신고');
select tests.throws(format($$insert into public.reports (reporter_id, target_user_id, target_date) values (%L, %L, current_date)$$,
    tests.uid('B'), tests.uid('A')), '이미 신고한', 'B: 같은 인증샷 중복 신고 불가');

-- ── 신고: 하루 20건 ──
select tests.as_operator();
insert into public.reports (reporter_id, target_user_id, target_date)
select tests.uid('C'), tests.uid('A'), current_date - g from generate_series(1, 20) g;
select tests.login('C');
select tests.throws(format($$insert into public.reports (reporter_id, target_user_id, target_date) values (%L, %L, current_date)$$,
    tests.uid('C'), tests.uid('B')), '하루에 20건', 'C: 21번째 신고는 거절');

-- ── 초대 코드: 틀린 코드 한 시간 10번 ──
select tests.login('C');
select tests.eq((select count(*) from generate_series(1, 10) g, lateral public.join_group('ZZZZ' || lpad(g::text, 2, '0'))), 0::bigint,
  'C: 틀린 코드 10번 (빈 결과)');
select tests.throws(format($$select * from public.join_group(%L)$$, tests.code('회원반')), '너무 많이 틀렸어요',
  'C: 11번째는 맞는 코드여도 1시간 잠김');
select tests.eq(tests.count('select * from public.join_attempts'), 0, 'C: 시도 기록 직접 조회 불가');
select tests.affects('delete from public.join_attempts', 0, 'C: 시도 기록 지워서 잠금 풀기 불가');
select tests.login('B');
select tests.lives(format($$select * from public.join_group(%L)$$, tests.code('응원반')), 'B: 다른 사람은 영향 없음');

-- 1시간이 지나면 다시 시도 가능
select tests.as_operator();
update public.join_attempts set created_at = now() - interval '61 minutes';
select tests.login('C');
select tests.eq(tests.count($$select * from public.join_group('ZZZZ99')$$), 0, 'C: 1시간 뒤 다시 시도 가능');

rollback;
