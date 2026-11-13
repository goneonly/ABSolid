// ABSolid API 서버 — Hono 앱 (모든 주소는 /api 로 시작)
// 같은 앱을 두 곳에서 실행함
//   - 개발: server/dev.js 가 내 컴퓨터의 Node 서버(포트 8787)로 실행
//   - 배포: api/index.js 를 Vercel 이 서버 함수로 실행
// 설계와 진행 상황은 docs/SPRINT_BACKLOG.md 의 1번 참고
import { Hono } from 'hono'

const app = new Hono().basePath('/api')

// 서버가 살아 있는지 확인하는 주소 (배포 후 가장 먼저 열어 보는 곳)
app.get('/health', (c) => c.json({ ok: true }))

// 없는 주소: 앱이 읽기 쉬운 JSON 으로 404
app.notFound((c) => c.json({ error: '없는 주소예요.' }, 404))

// 코드에서 예상 못 한 오류: 내부 내용은 서버 로그에만 남기고, 앱에는 일반 안내만 보냄
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500)
})

export default app
