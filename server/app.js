// ABSolid API 서버 — Hono 앱 (모든 주소는 /api 로 시작)
// 같은 앱을 두 곳에서 실행함
//   - 개발: server/dev.js 가 내 컴퓨터의 Node 서버(포트 8787)로 실행
//   - 배포: api/index.js 를 Vercel 이 서버 함수로 실행
// 설계와 진행 상황은 docs/SPRINT_BACKLOG.md 의 1번 참고
import { Hono } from 'hono'
import { requireUser } from './auth.js'
import { supabaseFor } from './supabase.js'
import { isDateRange, isUuid } from './validate.js'

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

// 없는 주소: 앱이 읽기 쉬운 JSON 으로 404
app.notFound((c) => c.json({ error: '없는 주소예요.' }, 404))

// 코드에서 예상 못 한 오류: 내부 내용은 서버 로그에만 남기고, 앱에는 일반 안내만 보냄
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500)
})

export default app
