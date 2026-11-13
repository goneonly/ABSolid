// ABSolid API 서버 — Hono 앱 (모든 주소는 /api 로 시작)
// 같은 앱을 두 곳에서 실행함
//   - 개발: server/dev.js 가 내 컴퓨터의 Node 서버(포트 8787)로 실행
//   - 배포: api/index.js 를 Vercel 이 서버 함수로 실행
// 설계와 진행 상황은 docs/SPRINT_BACKLOG.md 의 1번 참고
import { Hono } from 'hono'
import { requireUser } from './auth.js'

const app = new Hono().basePath('/api')

// 서버가 살아 있는지 확인하는 주소 (배포 후 가장 먼저 열어 보는 곳)
app.get('/health', (c) => c.json({ ok: true }))

// 내 정보 (로그인 필수) — 토큰 확인 미들웨어(requireUser)를 먼저 거침
app.get('/me', requireUser, (c) => {
  // TODO 6. 미들웨어가 저장해 둔 사용자를 꺼내, 아이디와 이메일만 JSON 으로 돌려주세요.
  //   힌트: const user = c.get('user')
  //         return c.json({ id: user.id, email: user.email })
  //   (user 에는 가입 정보 등 더 많은 값이 있지만, 필요한 것만 골라 내보내는 게 원칙)
  return c.json({ error: '아직 만드는 중이에요.' }, 501)
})

// 없는 주소: 앱이 읽기 쉬운 JSON 으로 404
app.notFound((c) => c.json({ error: '없는 주소예요.' }, 404))

// 코드에서 예상 못 한 오류: 내부 내용은 서버 로그에만 남기고, 앱에는 일반 안내만 보냄
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500)
})

export default app
