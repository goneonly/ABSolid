// API 서버 테스트 — 실제 서버를 띄우지 않고 app.request() 로 주소를 직접 불러 확인 (설계 Q12)
// Supabase 는 가짜(mock)로 바꿔서 네트워크 없이 돌림: 'good-token' 만 진짜로 취급
import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase.js', () => ({
  supabaseFor: () => ({
    auth: {
      getUser: async (token) =>
        token === 'good-token'
          ? { data: { user: { id: 'user-1', email: 'me@example.com', phone: '010' } }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } },
    },
  }),
}))

const { default: app } = await import('./app.js')

describe('GET /api/health', () => {
  it('서버가 살아 있으면 ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('GET /api/me', () => {
  // 예시 테스트 (제가 작성): 토큰 없이 부르면 401
  it('토큰이 없으면 401', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
  })

  // TODO 7. 아래 세 가지를 직접 테스트로 써 보세요. 위 예시와 같은 모양이에요.
  //   - 'Bearer ' 형식이 아닌 헤더 (예: 'Basic abc') 는 401
  //   - 가짜 토큰 ('Bearer bad-token') 은 401
  //   - 진짜 토큰 ('Bearer good-token') 은 200, 응답이 { id: 'user-1', email: 'me@example.com' } 와 정확히 같음
  //     (phone 처럼 내보내지 않기로 한 값이 섞여 나오지 않는지도 이걸로 확인됨)
  //   힌트: app.request('/api/me', { headers: { Authorization: 'Bearer good-token' } })
})
