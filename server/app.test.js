// API 서버 테스트 — 실제 서버를 띄우지 않고 app.request() 로 주소를 직접 불러 확인 (설계 Q12)
// Supabase 는 가짜(mock)로 바꿔서 네트워크 없이 돌림
//   'good-token' 은 진짜, 'down-token' 은 Supabase 연결 실패, 그 밖의 토큰은 가짜로 취급
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

// getUser 를 몇 번 불렀는지 세기 위한 감시용 함수 (vi.hoisted: vi.mock 보다 먼저 만들어지게 함)
const getUser = vi.hoisted(() => vi.fn())

// 가짜 DB 조회: from('announcements').select(...).eq(...).order(...).limit(...).maybeSingle() 처럼 이어 부를 수 있고,
// 어떤 순서로 무엇을 불렀는지 calls 에 남김. 마지막 결과는 db.result 로 정함
// maybeSingle 없이 바로 await 하는 조회(그룹 멤버, 운동 기록)는 테이블 이름별 결과 db.tables[이름] 으로 답함
const db = vi.hoisted(() => ({ calls: [], result: { data: null, error: null }, tables: {}, tokens: [] }))
const query = vi.hoisted(() => {
  const q = {}
  for (const step of ['from', 'select', 'eq', 'in', 'gte', 'lte', 'order', 'limit']) {
    q[step] = (...args) => {
      db.calls.push([step, ...args])
      if (step === 'from') q.table = args[0]
      return q
    }
  }
  q.maybeSingle = async () => {
    db.calls.push(['maybeSingle'])
    return db.result
  }
  // await 하면 마지막으로 고른 테이블의 결과를 돌려줌 (없으면 빈 목록)
  q.then = (resolve, reject) => Promise.resolve(db.tables[q.table] ?? { data: [], error: null }).then(resolve, reject)
  return q
})

// 가짜 서버 함수 호출 (supabase.rpc). 부른 이름과 인자를 기록하고, 결과는 테스트마다 정함
const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase.js', () => ({
  supabaseFor: (token) => {
    db.tokens.push(token)
    return { auth: { getUser }, from: query.from, rpc }
  },
}))

beforeEach(() => {
  db.calls = []
  db.tokens = []
  db.result = { data: null, error: null }
  db.tables = {}
  rpc.mockReset()
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

// 3-1: 운동 시작 (로그인 필요) — 앱이 영상 재생을 시작하면 시청 세션을 만듦
describe('POST /api/workouts/start', () => {
  // 로그인한 사용자로 본문을 보내는 요청 (본문은 객체를 JSON 글자로 바꿔 보냄)
  const start = (body, token = 'good-token') =>
    app.request('/api/workouts/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })

  it('로그인하지 않으면 401, DB 에 묻지 않음', async () => {
    const res = await start({ videoSeconds: 600 }, null)
    expect(res.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('영상 길이가 숫자가 아니면 400, DB 에 묻지 않음', async () => {
    for (const body of [{}, { videoSeconds: '600' }, { videoSeconds: null }]) {
      const res = await start(body)
      expect(res.status).toBe(400)
      expect(typeof (await res.json()).error).toBe('string')
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('성공하면 200 과 { sessionId }. 로그인한 사람 신분(토큰)으로 start_workout 을 부르고 길이는 정수로', async () => {
    rpc.mockResolvedValue({ data: 'session-1', error: null })
    const res = await start({ videoSeconds: 599.6 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sessionId: 'session-1' })
    expect(rpc).toHaveBeenCalledWith('start_workout', { p_video_seconds: 600 })
    expect(db.tokens).toContain('good-token')
  })

  it('DB 가 판단해 거절(P0001)하면 422 와 DB 문구 그대로', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: '로그인이 필요해요.' } })
    const res = await start({ videoSeconds: 600 })
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: '로그인이 필요해요.' })
  })

  it('그 밖의 DB 오류는 503, 내부 내용은 숨김', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection failure' } })
    const res = await start({ videoSeconds: 600 })
    expect(res.status).toBe(503)
    expect((await res.json()).error).not.toContain('connection')
  })
})

// 3-2: 운동 완료 (로그인 필요) — 영상을 다 보면 서버가 시청 시간을 확인하고 기록
describe('POST /api/workouts/complete', () => {
  const complete = (body, token = 'good-token') =>
    app.request('/api/workouts/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })

  it('로그인하지 않으면 401, DB 에 묻지 않음', async () => {
    const res = await complete({ sessionId: 'session-1' }, null)
    expect(res.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('세션 번호가 없거나 글자가 아니면 400, DB 에 묻지 않음', async () => {
    for (const body of [{}, { sessionId: '' }, { sessionId: 123 }]) {
      const res = await complete(body)
      expect(res.status).toBe(400)
      expect(typeof (await res.json()).error).toBe('string')
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('성공하면 200 과 { date } (DB 가 기록한 날짜). 로그인한 사람 신분으로 complete_workout 을 부름', async () => {
    rpc.mockResolvedValue({ data: '2026-11-19', error: null })
    const res = await complete({ sessionId: 'session-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ date: '2026-11-19' })
    expect(rpc).toHaveBeenCalledWith('complete_workout', { p_session: 'session-1' })
    expect(db.tokens).toContain('good-token')
  })

  it('DB 가 판단해 거절(P0001: 시청 시간 부족 등)하면 422 와 DB 문구 그대로', async () => {
    const message = '영상을 끝까지 시청해야 완료로 기록돼요. 약 3분 남았어요.'
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message } })
    const res = await complete({ sessionId: 'session-1' })
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: message })
  })

  it('그 밖의 DB 오류는 503, 내부 내용은 숨김 (앱이 나중에 다시 시도할 수 있는 실패)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection failure' } })
    const res = await complete({ sessionId: 'session-1' })
    expect(res.status).toBe(503)
    expect((await res.json()).error).not.toContain('connection')
  })
})

// 백엔드 4-1: 리더보드용 기간 안 운동 날짜
describe('GET /api/groups/:groupId/workouts', () => {
  const GID = '11111111-2222-4333-8444-555555555555'
  const get = (path, token = 'good-token') =>
    app.request(`/api/groups/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const leaderboard = (start = '2026-11-01', end = '2026-11-19') => get(`${GID}/workouts?start=${start}&end=${end}`)
  // 나(user-1)와 user-2 가 있는 그룹
  const myGroup = () => {
    db.tables.group_members = { data: [{ user_id: 'user-1' }, { user_id: 'user-2' }], error: null }
  }

  it('토큰이 없으면 401', async () => {
    const res = await get(`${GID}/workouts?start=2026-11-01&end=2026-11-19`, null)
    expect(res.status).toBe(401)
  })

  it('그룹 id 가 uuid 가 아니면 400, DB 에 묻지 않음', async () => {
    const res = await get('abc/workouts?start=2026-11-01&end=2026-11-19')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('그룹 정보가 올바르지 않아요.')
    expect(db.calls).toEqual([])
  })

  it('기간이 없거나, 날짜가 아니거나, 시작이 끝보다 늦거나, 366일을 넘으면 400', async () => {
    for (const res of [
      await get(`${GID}/workouts`),
      await leaderboard('2026-11-1', '2026-11-19'),
      await leaderboard('2026-02-30', '2026-03-01'),
      await leaderboard('2026-11-20', '2026-11-19'),
      await leaderboard('2025-11-18', '2026-11-19'),
    ]) {
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('기간이 올바르지 않아요.')
    }
    expect(db.calls).toEqual([])
  })

  it('내가 그 그룹 멤버가 아니면 403, 운동 기록은 읽지 않음', async () => {
    db.tables.group_members = { data: [{ user_id: 'user-2' }], error: null }
    const res = await leaderboard()
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('그룹 멤버만 볼 수 있어요.')
    expect(db.calls).not.toContainEqual(['from', 'workouts'])
  })

  it('멤버면 기간 안의 날짜를 멤버별로 묶어 돌려줌', async () => {
    myGroup()
    db.tables.workouts = {
      data: [
        { user_id: 'user-1', date: '2026-11-18' },
        { user_id: 'user-2', date: '2026-11-18' },
        { user_id: 'user-1', date: '2026-11-19' },
      ],
      error: null,
    }
    const res = await leaderboard()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      dates: { 'user-1': ['2026-11-18', '2026-11-19'], 'user-2': ['2026-11-18'] },
    })
  })

  it('그 그룹 멤버만, 그 기간만 DB 에 물음', async () => {
    myGroup()
    await leaderboard()
    expect(db.calls).toEqual(
      expect.arrayContaining([
        ['from', 'group_members'],
        ['eq', 'group_id', GID],
        ['from', 'workouts'],
        ['in', 'user_id', ['user-1', 'user-2']],
        ['gte', 'date', '2026-11-01'],
        ['lte', 'date', '2026-11-19'],
      ]),
    )
  })

  it('기록이 없으면 빈 객체', async () => {
    myGroup()
    const res = await leaderboard()
    expect(await res.json()).toEqual({ dates: {} })
  })

  it('요청한 사람의 토큰으로 DB 에 접근 (RLS 적용)', async () => {
    myGroup()
    await leaderboard()
    expect(db.tokens.at(-1)).toBe('good-token')
  })

  it('그룹 멤버나 운동 기록을 읽지 못하면 503', async () => {
    db.tables.group_members = { data: null, error: { code: 'PGRST000', message: 'connection' } }
    const first = await leaderboard()
    expect(first.status).toBe(503)
    expect((await first.json()).error).toBe('그룹 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')

    myGroup()
    db.tables.workouts = { data: null, error: { code: 'PGRST000', message: 'connection' } }
    const second = await leaderboard()
    expect(second.status).toBe(503)
  })
})
