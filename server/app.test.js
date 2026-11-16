// API 서버 테스트 — 실제 서버를 띄우지 않고 app.request() 로 주소를 직접 불러 확인 (설계 Q12)
// Supabase 는 가짜(mock)로 바꿔서 네트워크 없이 돌림
//   'good-token' 은 진짜, 'down-token' 은 Supabase 연결 실패, 그 밖의 토큰은 가짜로 취급
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

// getUser 를 몇 번 불렀는지 세기 위한 감시용 함수 (vi.hoisted: vi.mock 보다 먼저 만들어지게 함)
const getUser = vi.hoisted(() => vi.fn())

// 가짜 DB 조회: from('announcements').select(...).eq(...).order(...).limit(...).maybeSingle() 처럼 이어 부를 수 있고,
// 어떤 순서로 무엇을 불렀는지 calls 에 남김. 마지막 결과는 db.result 로 정함
const db = vi.hoisted(() => ({ calls: [], result: { data: null, error: null }, tokens: [] }))
const query = vi.hoisted(() => {
  const q = {}
  for (const step of ['from', 'select', 'eq', 'order', 'limit']) {
    q[step] = (...args) => {
      db.calls.push([step, ...args])
      return q
    }
  }
  q.maybeSingle = async () => {
    db.calls.push(['maybeSingle'])
    return db.result
  }
  return q
})

vi.mock('./supabase.js', () => ({
  supabaseFor: (token) => {
    db.tokens.push(token)
    return { auth: { getUser }, from: query.from }
  },
}))

beforeEach(() => {
  db.calls = []
  db.tokens = []
  db.result = { data: null, error: null }
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

// 2단계: 공지 주소 (로그인 필요 없음)
describe('GET /api/announcements/active', () => {
  const ROW = { id: 7, message: '이번 주 이벤트!', active: true, created_at: '2026-11-16T00:00:00Z' }

  it('켜진 공지가 있으면 200 과 { announcement: { id, message } }', async () => {
    db.result = { data: ROW, error: null }
    const res = await app.request('/api/announcements/active')
    expect(res.status).toBe(200)
    // 앱에 필요한 id 와 message 만. DB 의 다른 칸(active, created_at)은 내보내지 않음
    expect(await res.json()).toEqual({ announcement: { id: 7, message: '이번 주 이벤트!' } })
  })

  it('공지가 없으면 200 과 { announcement: null }', async () => {
    db.result = { data: null, error: null }
    const res = await app.request('/api/announcements/active')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ announcement: null })
  })

  it('Supabase 에서 읽지 못하면 503 과 { error }', async () => {
    db.result = { data: null, error: { message: 'connection refused' } }
    const res = await app.request('/api/announcements/active')
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
    expect(body.error).not.toContain('connection') // 내부 오류 내용은 앱에 보내지 않음
  })

  it('로그인 없이 부를 수 있고, 비회원 신분(토큰 없음)으로 조회한다', async () => {
    db.result = { data: ROW, error: null }
    const res = await app.request('/api/announcements/active')
    expect(res.status).toBe(200)
    expect(getUser).not.toHaveBeenCalled() // 문지기(requireUser)를 거치지 않음
    expect(db.tokens).toEqual([undefined])
  })

  it('announcements 표에서 켜진 공지 중 가장 최근 1건만 읽는다', async () => {
    await app.request('/api/announcements/active')
    const steps = db.calls.map(([step]) => step)
    expect(db.calls).toContainEqual(['from', 'announcements'])
    expect(db.calls).toContainEqual(['eq', 'active', true])
    expect(db.calls).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(db.calls).toContainEqual(['limit', 1])
    expect(steps.at(-1)).toBe('maybeSingle')
  })
})
