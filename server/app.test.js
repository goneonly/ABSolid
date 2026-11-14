// API 서버 테스트 — 실제 서버를 띄우지 않고 app.request() 로 주소를 직접 불러 확인 (설계 Q12)
// Supabase 는 가짜(mock)로 바꿔서 네트워크 없이 돌림
//   'good-token' 은 진짜, 'down-token' 은 Supabase 연결 실패, 그 밖의 토큰은 가짜로 취급
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

// getUser 를 몇 번 불렀는지 세기 위한 감시용 함수 (vi.hoisted: vi.mock 보다 먼저 만들어지게 함)
const getUser = vi.hoisted(() => vi.fn())

vi.mock('./supabase.js', () => ({
  supabaseFor: () => ({ auth: { getUser } }),
}))

beforeEach(() => {
  getUser.mockReset()
  getUser.mockImplementation(async (token) => {
    if (token === 'good-token')
      return { data: { user: { id: 'user-1', email: 'me@example.com', phone: '010' } }, error: null }
    if (token === 'down-token') return { data: { user: null }, error: new AuthRetryableFetchError('fetch failed', 0) }
    return { data: { user: null }, error: new AuthApiError('invalid JWT', 401, 'bad_jwt') }
  })
})

const { default: app } = await import('./app.js')

describe('GET /api/health', () => {
  it('서버가 살아 있으면 ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('GET /api/me', () => {
  it('토큰이 없으면 401', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
  })

  it('Bearer 형식이 아니면 401', async () => {
    const res = await app.request('/api/me', { headers: { Authorization: 'Basic abc' } })
    expect(res.status).toBe(401)
  })

  it('Bearer 뒤에 토큰이 비어 있으면 401, Supabase 에 묻지도 않음', async () => {
    // 헤더 끝 공백은 자동으로 잘려 'Bearer' 가 되므로 형식 검사에서 먼저 막힘
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer ' } })
    expect(res.status).toBe(401)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('가짜 토큰이면 401', async () => {
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer bad-token' } })
    expect(res.status).toBe(401)
  })

  it('Supabase 연결 실패면 503', async () => {
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer down-token' } })
    expect(res.status).toBe(503)
  })

  it('진짜 토큰이면 내 아이디와 이메일만 돌려줌', async () => {
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer good-token' } })
    expect(res.status).toBe(200)
    // toEqual 은 정확히 같아야 통과: 전화번호처럼 내보내지 않기로 한 값이 섞이면 실패함
    expect(await res.json()).toEqual({ id: 'user-1', email: 'me@example.com' })
  })
})
