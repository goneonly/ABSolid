// ABSolid API 서버 — Hono 앱 (모든 주소는 /api 로 시작)
// 같은 앱을 두 곳에서 실행함
//   - 개발: server/dev.js 가 내 컴퓨터의 Node 서버(포트 8787)로 실행
//   - 배포: api/index.js 를 Vercel 이 서버 함수로 실행
// 설계와 진행 상황은 docs/SPRINT_BACKLOG.md 의 1번 참고
import { Hono } from 'hono'
import { requireUser } from './auth.js'
import { supabaseFor } from './supabase.js'
import { addDays, isDateKey, isDateRange, isUuid } from './validate.js'

const app = new Hono().basePath('/api')

// 서버가 살아 있는지 확인하는 주소 (배포 후 가장 먼저 열어 보는 곳)
app.get('/health', (c) => c.json({ ok: true }))

// 내 정보 (로그인 필수) — 토큰 확인 미들웨어(requireUser)를 먼저 거침
app.get('/me', requireUser, (c) => {
  const user = c.get('user')
  return c.json({ id: user.id, email: user.email })
})

// 지금 켜져 있는 공지 1건 (로그인 필요 없음 — 홈 화면 배너용)
// 응답: 있으면 { announcement: { id, message } }, 없으면 { announcement: null }, Supabase 에서 못 읽으면 503 { error }
app.get('/announcements/active', async (c) => {
  // 1. 비회원 신분으로 연결 (토큰을 넘기지 않음 — 공지는 누구나 볼 수 있음)
  const supabase = supabaseFor()

  // 2. 켜진 공지 중 가장 최근 1건 읽기 (결과와 실패 이유를 함께 받음)
  const { data, error } = await supabase
    .from('announcements')
    .select('id, message')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3. 못 읽었으면 503 (내부 오류 내용은 보내지 않고 안내 문구만)
  if (error) {
    return c.json({ error: '공지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 4. 공지가 있으면 id 와 message 만, 없으면 null
  return c.json({ announcement: data ? { id: data.id, message: data.message } : null })
})

// 운동 시작 (로그인 필요) — 영상 재생을 시작하면 시청 세션을 만들고 그 id 를 돌려줌
// 요청 본문: { videoSeconds: 영상 길이(초, 숫자) }
// 응답: 200 { sessionId } / 400 길이가 숫자가 아님 / 401 로그인 필요 / 422 DB 가 거절 / 503 DB 연결 실패
app.post('/workouts/start', requireUser, async (c) => {
  // 1. 본문 { videoSeconds } 에서 영상 길이를 꺼냄
  const { videoSeconds } = await c.req.json()

  // 2. 숫자가 아니면 400 (잘못된 요청)
  if (typeof videoSeconds !== 'number') {
    return c.json({ error: '영상 길이가 올바르지 않아요.' }, 400)
  }

  // 3. 문지기가 저장해 둔 토큰으로, 로그인한 사람 신분으로 DB 함수를 부름
  const { data, error } = await supabaseFor(c.get('token')).rpc('start_workout', {
    p_video_seconds: Math.round(videoSeconds),
  })

  // 4. DB 가 판단해 거절(P0001)했으면 그 이유를 422 로, 그 밖의 오류는 503
  if (error) {
    if (error.code === 'P0001') return c.json({ error: error.message }, 422)
    return c.json({ error: '운동 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 5. 성공: 시청 세션 번호
  return c.json({ sessionId: data })
})

// 운동 완료 (로그인 필요) — 영상을 다 보면 서버가 시작한 지 충분히 지났는지 확인하고 기록
// 요청 본문: { sessionId: 운동 시작 때 받은 세션 번호(글자) }
// 응답: 200 { date: 기록된 날짜 } / 400 세션 번호가 없음 / 401 로그인 필요 / 422 DB 가 거절(시청 시간 부족 등) / 503 DB 연결 실패
app.post('/workouts/complete', requireUser, async (c) => {
  // 1. 본문 { sessionId } 에서 운동 시작 때 받은 세션 번호를 꺼냄
  const { sessionId } = await c.req.json()

  // 2. 글자가 아니거나 비어 있으면 400 (잘못된 요청)
  if (typeof sessionId !== 'string' || !sessionId) {
    return c.json({ error: '운동 세션 정보가 올바르지 않아요.' }, 400)
  }

  // 3. 로그인한 사람 신분으로 DB 함수를 부름. DB 가 시작한 지 충분히 지났는지 확인하고 기록함
  const { data, error } = await supabaseFor(c.get('token')).rpc('complete_workout', { p_session: sessionId })

  // 4. DB 가 판단해 거절(P0001: 시청 시간 부족 등)했으면 그 이유를 422 로, 그 밖의 오류는 503
  if (error) {
    if (error.code === 'P0001') return c.json({ error: error.message }, 422)
    return c.json({ error: '운동 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 5. 성공: DB 가 기록한 날짜
  return c.json({ date: data })
})

// 리더보드: 기간 안에 그룹 멤버별로 운동한 날짜 (로그인 필수, 그 그룹 멤버만)
// 요청: GET /api/groups/그룹id/workouts?start=2026-11-01&end=2026-11-19
// 응답: { dates: { 멤버id: ['2026-11-18', '2026-11-19'], ... } }
//       그룹 id 가 이상하면 400, 기간이 이상하면 400, 멤버가 아니면 403, DB 를 못 읽으면 503
app.get('/groups/:groupId/workouts', requireUser, async (c) => {
  // 1. 주소에서 값 꺼내기
  //    c.req.param('groupId'): 주소 가운데 :groupId 자리에 들어온 값
  //    c.req.query('start'):   주소 뒤 ?start=... 의 값 (없으면 undefined)
  const groupId = c.req.param('groupId')
  const start = c.req.query('start')
  const end = c.req.query('end')

  // 2. 값 검사 (DB 에 묻기 전에)
  if (!isUuid(groupId)) return c.json({ error: '그룹 정보가 올바르지 않아요.' }, 400)
  if (!isDateRange(start, end)) {
    return c.json({ error: '기간이 올바르지 않아요.' }, 400)
  }

  // 3. 요청한 사람 신분으로 DB 연결
  const supabase = supabaseFor(c.get('token'))

  // 4. 그룹 멤버 목록 읽기 (아래 운동 기록과 이름이 겹치지 않게 members, membersError 로 받음). 못 읽으면 503
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
  if (membersError) {
    return c.json({ error: '그룹 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 5. 멤버 id 만 담은 배열로 바꾸고, 내가 없으면 403
  const ids = members.map((m) => m.user_id)
  if (!ids.includes(c.get('user').id)) {
    return c.json({ error: '그룹 멤버만 볼 수 있어요.' }, 403)
  }

  // 6. 멤버들의 기간 안 운동 기록 읽기 (start 이상, end 이하). 못 읽으면 503
  const { data: rows, error } = await supabase
    .from('workouts')
    .select('user_id, date')
    .in('user_id', ids)
    .gte('date', start)
    .lte('date', end)
  if (error) {
    return c.json({ error: '그룹 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 7. 멤버별로 날짜 묶기: { 멤버id: [날짜, ...] }. 처음 보는 멤버면 빈 배열부터 만듦
  const dates = {}
  for (const r of rows) {
    if (!dates[r.user_id]) {
      dates[r.user_id] = []
    }
    dates[r.user_id].push(r.date)
  }
  return c.json({ dates })
})

// 그룹 현황: 멤버, 멤버별 최근 7일 운동 날짜, 오늘 인증샷 (로그인 필수, 그 그룹 멤버만, 내가 차단한 사람은 뺌)
// 요청: GET /api/groups/그룹id/status?today=2026-11-20  (오늘 날짜는 앱이 기기 날짜로 보냄)
// 응답: { members: [{ id, nickname, avatar, dates }], photos: [{ id, path }], hiddenCount }
//       사진은 경로만 보내고, 볼 수 있는 주소는 앱이 발급받음 (signPhotoPaths)
app.get('/groups/:groupId/status', requireUser, async (c) => {
  const DOWN = '그룹 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' // 503 문구 (여러 번 써서 상자에 담아 둠)

  // 1. 주소에서 값 꺼내기
  const groupId = c.req.param('groupId')
  const today = c.req.query('today')

  // 2. 값 검사
  if (!isUuid(groupId)) return c.json({ error: '그룹 정보가 올바르지 않아요.' }, 400)
  // TODO A. [복습] isDateKey(today) 가 아니면 400 '날짜가 올바르지 않아요.' (바로 위 줄과 같은 모양)

  const supabase = supabaseFor(c.get('token'))
  if (!isDateKey(today)) {
    return c.json({ error: '날짜가 올바르지 않아요.' }, 400)
  }
  // 3. 그룹 멤버 읽고, 내가 멤버인지 확인
  // TODO B. [복습] 4-1 의 4번, 5번과 똑같이 (members, membersError 로 받기, ids 만들기, 없으면 403)
  //         실패 문구는 이제 DOWN 상자를 쓰면 됨:  return c.json({ error: DOWN }, 503)
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
  if (membersError) return c.json({ error: DOWN }, 503)

  const ids = members.map((m) => m.user_id)
  if (!ids.includes(c.get('user').id)) return c.json({ error: '그룹 멤버만 볼 수 있어요.' }, 403)
  // 4. 내가 차단한 사람 목록
  // TODO C. [복습] user_blocks 에서 'blocked' 칸 읽기 (조건 없음, DB 규칙이 내 것만 돌려줌)
  //         결과는 { data: blocks, error: blocksError }, 실패면 503
  const { data: blocks, error: blocksError } = await supabase.from('user_blocks').select('blocked')
  if (blocksError) {
    return c.json({ error: DOWN }, 503)
  }
  // [새 문법] Set: 중복 없는 모음. .has(값) 으로 들어 있는지 빠르게 확인
  //   new Set(['a', 'b']).has('a')  는 true
  const blocked = new Set(blocks.map((b) => b.blocked))

  // 5. 멤버 프로필 (닉네임, 사진)
  // TODO D. [복습] 3-1 처럼 서버 함수 부르기: supabase.rpc('get_group_profiles', { gid: groupId })
  const { data: profiles, error: profilesError } = await supabase.rpc('get_group_profiles', { gid: groupId })
  if (profilesError) {
    return c.json({ error: DOWN }, 503)
  }

  // 6. 최근 7일(오늘 포함) 운동 기록
  // TODO E. [복습] 4-1 의 6번과 같은 모양. 다른 점 두 가지
  //         select 는 'user_id, date, photo_url'
  //         기간은 addDays(today, -6) 이상, today 이하   (addDays('2026-11-20', -6) 은 '2026-11-14')

  // [새 문법] .filter: 조건이 true 인 칸만 남긴 새 배열
  //   [1, 2, 3, 4].filter((n) => n > 2)  는 [3, 4]
  // 차단한 사람의 기록은 뺌 (! 는 '아니면')
  const visible = rows.filter((r) => !blocked.has(r.user_id))

  // 7. 멤버별 날짜 묶기
  // TODO F. [복습] 4-1 의 7번과 똑같이 dates 만들기. 다른 점: rows 대신 visible 을 돌기 (return 은 아직 하지 않음)

  // 8. 오늘 인증샷
  // TODO G. [새 문법 연습] visible 에서 r.date === today 이고 r.photo_url 이 있는 것만 .filter 로 남기고,
  //         .map 으로 { id: r.user_id, path: r.photo_url } 모양으로 바꿔 photos 에 담기
  //   예시) const big = nums.filter((n) => n > 2).map((n) => ({ value: n }))
  //         ({ }) 처럼 괄호로 감싸야 객체를 돌려줌 (괄호가 없으면 함수 본문으로 읽힘)

  // 9. 보여 줄 멤버: 차단한 사람 빼고, 프로필이 없으면 빈 값 (앱이 '이름 없음'으로 표시)
  const profileOf = {}
  for (const p of profiles) profileOf[p.id] = p
  const shown = ids
    .filter((id) => !blocked.has(id))
    .map((id) => ({
      id,
      nickname: profileOf[id]?.nickname || null, // ?. 는 앞이 없으면(undefined) 오류 대신 undefined
      avatar: profileOf[id]?.avatar_url || '', // || 는 앞이 비었으면 뒤의 값
      dates: dates[id] || [],
    }))

  return c.json({ members: shown, photos, hiddenCount: ids.length - shown.length })
})

// 없는 주소: 앱이 읽기 쉬운 JSON 으로 404
app.notFound((c) => c.json({ error: '없는 주소예요.' }, 404))

// 코드에서 예상 못 한 오류: 내부 내용은 서버 로그에만 남기고, 앱에는 일반 안내만 보냄
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500)
})

export default app
