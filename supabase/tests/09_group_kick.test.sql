-- 그룹장의 내보내기와 참여 막기 (v0.12)
begin;

-- 준비: C 가 응원반에 들어오면 3/3명 (A 그룹장, B, C)
select tests.login('C');
select name from public.join_group(tests.code('응원반'));

-- ── 그룹장이 아닌 사람 ──
select tests.login('B');
select tests.throws(format($$select public.kick_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), '그룹장만',
  'B(멤버): 다른 멤버 내보내기 불가');
select tests.throws(format($$select * from public.group_bans_of(%L)$$, tests.gid('응원반')), '그룹장만',
  'B(멤버): 막은 사람 목록 조회 불가');
select tests.throws(format($$select public.unban_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), '그룹장만',
  'B(멤버): 막기 풀기 불가');
select tests.throws(format($$select public._require_group_owner(%L)$$, tests.gid('응원반')), 'permission denied',
  'B: 내부용 그룹장 확인 함수 직접 호출 불가');
select tests.affects(format($$delete from public.group_members where group_id = %L and user_id = %L$$, tests.gid('응원반'), tests.uid('C')), 0,
  'B: 멤버 직접 삭제 0건');
select tests.throws(format($$insert into public.group_bans (group_id, user_id) values (%L, %L)$$, tests.gid('응원반'), tests.uid('C')),
  'row-level security', 'B: 참여 막기 직접 추가 불가');
select tests.logout();
select tests.throws(format($$select public.kick_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), 'permission denied',
  '비로그인: 내보내기 호출 불가');

-- ── 그룹장 A ──
select tests.login('A');
select tests.throws(format($$select public.kick_member(%L, %L)$$, tests.gid('응원반'), tests.uid('A')), '자기 자신은 내보낼 수 없어요',
  'A: 자기 자신은 내보낼 수 없음');
select tests.throws(format($$select public.kick_member(%L, %L)$$, tests.gid('회원반'), tests.uid('C')), '멤버가 아니에요',
  'A: 그 그룹 멤버가 아닌 사람은 내보낼 수 없음');
select tests.lives(format($$select public.kick_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), 'A: C 내보내기');
select tests.eq((select count(*) from public.group_members m where m.group_id = tests.gid('응원반')), 2::bigint, '응원반 2명 남음');
select tests.eq((select count(*) from public.group_bans_of(tests.gid('응원반'))), 0::bigint, '그냥 내보내면 막은 사람 목록은 비어 있음');

-- 그냥 내보낸 사람은 다시 들어올 수 있음, 내보낸 뒤에는 응원도 못 보냄
select tests.login('C');
select tests.throws(format($$select public.send_cheer(%L, %L)$$, tests.gid('응원반'), tests.uid('A')), '같은 그룹 멤버만',
  'C: 내보내진 뒤 응원 불가');
select tests.lives(format($$select * from public.join_group(%L)$$, tests.code('응원반')), 'C: 그냥 내보내진 경우 다시 참여 가능');

-- 내보내고 막기
select tests.login('A');
select tests.lives(format($$select public.kick_member(%L, %L, true)$$, tests.gid('응원반'), tests.uid('C')), 'A: C 내보내고 참여 막기');
select tests.eq((select nickname from public.group_bans_of(tests.gid('응원반'))), '외부인', 'A: 막은 사람 목록에 닉네임으로 보임');
select tests.eq(tests.count(format('select * from public.group_bans where group_id = %L', tests.gid('응원반'))), 1,
  'A(그룹장): 막은 사람 표 조회 가능');
select tests.login('C');
select tests.throws(format($$select * from public.join_group(%L)$$, tests.code('응원반')), '참여할 수 없어요',
  'C: 막힌 그룹에는 초대 코드로도 참여 불가');
select tests.eq(tests.count(format('select * from public.group_bans where group_id = %L', tests.gid('응원반'))), 0,
  'C: 내가 막힌 기록은 볼 수 없음');
select tests.login('B');
select tests.eq(tests.count(format('select * from public.group_bans where group_id = %L', tests.gid('응원반'))), 0,
  'B(멤버): 막은 사람 표 조회 불가');

-- 막기 풀기
select tests.login('A');
select tests.lives(format($$select public.unban_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), 'A: C 막기 풀기');
select tests.login('C');
select tests.lives(format($$select * from public.join_group(%L)$$, tests.code('응원반')), 'C: 막기가 풀리면 다시 참여 가능');

-- 그룹장이 바뀌면 권한도 넘어감
select tests.login('A');
select tests.eq(public.leave_group(tests.gid('응원반')), false, 'A 나가기 (B 에게 그룹장 위임)');
select tests.throws(format($$select public.kick_member(%L, %L)$$, tests.gid('응원반'), tests.uid('C')), '그룹장만',
  '나간 전 그룹장 A: 내보내기 불가');
select tests.login('B');
select tests.lives(format($$select public.kick_member(%L, %L, true)$$, tests.gid('응원반'), tests.uid('C')), '새 그룹장 B: 내보내기 가능');

rollback;
