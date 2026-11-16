// ABSolid API 서버 — Hono 앱 (모든 주소는 /api 로 시작)
// 같은 앱을 두 곳에서 실행함
//   - 개발: server/dev.js 가 내 컴퓨터의 Node 서버(포트 8787)로 실행
//   - 배포: api/index.js 를 Vercel 이 서버 함수로 실행
// 설계와 진행 상황은 docs/SPRINT_BACKLOG.md 의 1번 참고
import { Hono } from 'hono'
import { requireUser } from './auth.js'
import { supabaseFor } from './supabase.js'

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

// 없는 주소: 앱이 읽기 쉬운 JSON 으로 404
app.notFound((c) => c.json({ error: '없는 주소예요.' }, 404))

// 코드에서 예상 못 한 오류: 내부 내용은 서버 로그에만 남기고, 앱에는 일반 안내만 보냄
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500)
})

export default app
