-- 사용자 차단 — 차단 목록 엿보기, 위조, 차단 우회 응원, 받은 응원 노출
begin;

-- ── 차단하기 ──
select tests.login('A');
select tests.throws('select public.block_user(auth.uid())', '자기 자신', '자기 자신 차단 불가');
select tests.throws($$select public.block_user('00000000-0000-0000-0000-00000000dead')$$, '존재하지 않는', '없는 사용자 차단 불가');
select tests.lives(format('select public.block_user(%L)', tests.uid('B')), 'A: B 차단');
select tests.lives(format('select public.block_user(%L)', tests.uid('B')), 'A: 같은 사람 다시 차단해도 오류 없음');
select tests.eq((select nickname from public.my_blocks()), '서연', 'A: 내 차단 목록 — 닉네임만');
select tests.eq(tests.count('select * from public.user_blocks'), 1, 'A: 본인 차단 1건 조회');

select tests.logout();
select tests.throws(format('select public.block_user(%L)', tests.uid('A')), 'permission denied', '비로그인: 차단 함수 실행 권한 없음');
select tests.eq(tests.count('select * from public.user_blocks'), 0, '비로그인: 차단 목록 조회 불가');

-- ── 상대, 제3자는 차단 사실을 볼 수 없고 조작할 수 없음 ──
select tests.login('B');
select tests.eq(tests.count('select * from public.user_blocks'), 0, 'B: 자신이 차단당한 사실 조회 불가');
select tests.eq((select count(*) from public.my_blocks()), 0::bigint, 'B: 내 차단 목록 비어 있음');
select tests.affects('delete from public.user_blocks', 0, 'B: 남이 한 차단 해제 0건');
select tests.lives(format('select public.unblock_user(%L)', tests.uid('A')), 'B: 남의 차단을 해제 함수로 풀기 시도');
select tests.login('C');
select tests.throws(format($$insert into public.user_blocks (blocker, blocked) values (%L, %L)$$, tests.uid('B'), tests.uid('A')),
  'row-level security', 'C: 남의 이름으로 차단 위조 불가');
select tests.throws('select public.is_blocked_between(gen_random_uuid(), gen_random_uuid())', 'permission denied',
  'C: 차단 관계 직접 조회 함수 실행 불가');
select tests.as_operator();
select tests.eq((select count(*) from public.user_blocks), 1::bigint, 'B 의 해제 시도 후에도 A 의 차단 유지');

-- ── 응원: 차단 관계에서는 양쪽 모두 불가 ──
select tests.login('B');
select tests.throws(format('select public.send_cheer(%L, %L)', tests.gid('응원반'), tests.uid('A')), '응원을 보낼 수 없어요',
  'B(차단당함)는 A 응원 불가');
select tests.login('A');
select tests.throws(format('select public.send_cheer(%L, %L)', tests.gid('응원반'), tests.uid('B')), '응원을 보낼 수 없어요',
  'A(차단함)는 B 응원 불가');

-- ── 받은 응원: 차단 전에 온 응원도 숨김 ──
select tests.as_operator();
insert into public.cheers (group_id, from_user, to_user, date, kind)
values (tests.gid('응원반'), tests.uid('B'), tests.uid('A'), (now() at time zone 'Asia/Seoul')::date, 'nudge');
select tests.login('A');
select tests.eq((select count(*) from public.my_received_cheers()), 0::bigint, 'A: 차단한 사람의 응원은 받은 목록에서 제외');

-- ── 해제 ──
select tests.lives(format('select public.unblock_user(%L)', tests.uid('B')), 'A: B 차단 해제');
select tests.eq((select count(*) from public.my_blocks()), 0::bigint, 'A: 차단 목록 비어 있음');
select tests.eq((select count(*) from public.my_received_cheers()), 1::bigint, 'A: 해제 후 응원 다시 표시');
select tests.ok(public.send_cheer(tests.gid('응원반'), tests.uid('B')) is not null, 'A: 해제 후 B 응원 가능');

rollback;
