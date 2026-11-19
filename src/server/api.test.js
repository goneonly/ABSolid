import { beforeEach, describe, expect, it, vi } from 'vitest'

// Supabase 클라이언트를 가짜로 대체 — 서버 응답을 시나리오별로 정함
const { client, bucket, workoutsTable } = vi.hoisted(() => {
  const bucket = { upload: vi.fn(), createSignedUrl: vi.fn() }
  const workoutsTable = { update: vi.fn(), eq: vi.fn() }
  const client = {
    auth: { getSession: vi.fn() },
    rpc: vi.fn(),
    storage: { from: vi.fn(() => bucket) },
    from: vi.fn(() => workoutsTable),
  }
  return { client, bucket, workoutsTable }
})
// 로그인 사용자 조회(currentUserId)는 실제 구현과 같게: 가짜 클라이언트의 세션에서 읽음
vi.mock('./supabase.js', () => {
  const currentUser = async () => (await client.auth.getSession()).data.session?.user || null
  return { supabase: client, currentUser, currentUserId: async () => (await currentUser())?.id || null }
})

const {
  startWorkoutSession,
  completeWorkout,
  retryPendingCompletions,
  fetchBlockedIds,
  blockUser,
  unblockUser,
  fetchGroupStatus,
  fetchActiveAnnouncement,
} = await import('./api.js')
const { getRecords, saveRecord, todayKey } = await import('../lib/storage.js')

const UID = 'u-1'
const TOKEN = 'tok-1' // 로그인 토큰 (자체 API 서버에 Authorization 헤더로 보냄)
const signedIn = () =>
  client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: UID }, access_token: TOKEN } } })
const rpcError = (code, message = '거절') => ({ data: null, error: { code, message } })

beforeEach(() => {
  vi.clearAllMocks()
  client.storage.from.mockImplementation(() => bucket)
  client.from.mockImplementation(() => workoutsTable)
  bucket.upload.mockResolvedValue({ error: null })
  bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' } })
  workoutsTable.update.mockReturnValue(workoutsTable)
  workoutsTable.eq.mockImplementation(() => Object.assign(Promise.resolve({ error: null }), workoutsTable))
})

// 백엔드 3-3: 운동 시작과 완료는 Supabase 를 직접 부르지 않고 자체 API 서버(/api/workouts/...)에 요청
// 가짜 fetch: 부를 때마다 차례로 [상태 코드, 본문] 으로 답함
// 정해 둔 답을 다 쓰면 진짜 fetch 로 넘김 (인증샷 업로드가 data: 주소를 fetch 로 읽기 때문)
const realFetch = globalThis.fetch
const replies = (...answers) => {
  const f = vi.fn(realFetch)
  for (const [status, body] of answers) f.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', f)
  return f
}
const offline = () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
// fetch 에 넘긴 두 번째 값(method, headers, body)을 꺼내 봄
const sentOptions = (n = 0) => fetch.mock.calls[n][1]
const sentBody = (n = 0) => JSON.parse(sentOptions(n).body)

describe('운동 시작 요청 (자체 API 서버)', () => {
  it('비회원이면 서버에 묻지 않고 null', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null } })
    replies([200, { sessionId: 'x' }])
    expect(await startWorkoutSession(600)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('로그인 토큰을 실어 POST 로 보내고, 받은 세션 id 를 돌려준다', async () => {
    signedIn()
    replies([200, { sessionId: 'sess-1' }])
    expect(await startWorkoutSession(600)).toBe('sess-1')
    expect(fetch.mock.calls[0][0]).toBe('/api/workouts/start')
    expect(sentOptions()).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    })
    expect(sentBody()).toEqual({ videoSeconds: 600 })
  })
  it('서버가 실패(503 등)하면 null', async () => {
    signedIn()
    replies([503, { error: '운동 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }])
    expect(await startWorkoutSession(600)).toBeNull()
  })
  it('연결이 끊겨도(오프라인) 오류를 던지지 않고 null', async () => {
    signedIn()
    offline()
    expect(await startWorkoutSession(600)).toBeNull()
  })
  it('Supabase 서버 함수를 직접 부르지 않는다', async () => {
    signedIn()
    replies([200, { sessionId: 'sess-1' }])
    await startWorkoutSession(600)
    expect(client.rpc).not.toHaveBeenCalled()
  })
})

describe('운동 완료 요청 (자체 API 서버)', () => {
  beforeEach(signedIn)

  it('성공하면 서버가 기록한 날짜를 돌려준다', async () => {
    replies([200, { date: '2026-10-14' }])
    await expect(completeWorkout('s1')).resolves.toBe('2026-10-14')
    expect(fetch.mock.calls[0][0]).toBe('/api/workouts/complete')
    expect(sentOptions()).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    })
    expect(sentBody()).toEqual({ sessionId: 's1' })
  })
  it('서버가 판단해 거절(422: 시청 시간 부족 등)하면 그 문구를 보여 주고 다시 시도하지 않는다', async () => {
    replies([422, { error: '영상을 끝까지 시청해야 완료로 기록돼요. 약 3분 남았어요.' }])
    await expect(completeWorkout('s1')).rejects.toMatchObject({
      retryable: false,
      message: expect.stringContaining('약 3분 남았어요'),
    })
  })
  it('요청이 잘못됐으면(400) 다시 보내도 같으니 다시 시도하지 않는다', async () => {
    replies([400, { error: '운동 세션 정보가 올바르지 않아요.' }])
    await expect(completeWorkout('')).rejects.toMatchObject({ retryable: false })
  })
  it('서버나 DB 연결 문제(503, 500)는 나중에 다시 시도할 수 있다', async () => {
    replies([503, { error: '운동 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }], [500, {}])
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true })
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true })
  })
  it('로그인 정보가 만료됐으면(401) 다음 접속 때 다시 시도할 수 있다', async () => {
    replies([401, { error: '로그인이 필요해요.' }])
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true })
  })
  it('요청 자체가 끊겨도(오프라인) 다시 시도 대상, 영어 원문 대신 한국어 안내', async () => {
    offline()
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true, message: '서버에 연결할 수 없어요.' })
  })
  it('Supabase 서버 함수를 직접 부르지 않는다', async () => {
    replies([200, { date: '2026-10-14' }])
    await completeWorkout('s1')
    expect(client.rpc).not.toHaveBeenCalled()
  })
})

describe('못 보낸 완료 기록 재시도 (앱 시작 시)', () => {
  it('로그인 안 했으면 아무것도 하지 않는다', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null } })
    replies()
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    expect(fetch).not.toHaveBeenCalled()
    expect(getRecords()['2026-10-14'].pendingSession).toBe('s1')
  })

  it('대기 중인 기록만 다시 보내고, 성공하면 대기 표시를 지운다', async () => {
    signedIn()
    replies([200, { date: '2026-10-14' }])
    saveRecord('2026-10-13', { completed: true })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(sentBody()).toEqual({ sessionId: 's1' })
    expect(getRecords()['2026-10-14']).toMatchObject({ completed: true, pendingSession: null })
    expect(bucket.upload).not.toHaveBeenCalled()
  })

  it('인증샷이 있으면 서버가 기록한 날짜로 이어서 업로드 (자정을 넘겨 보낸 경우)', async () => {
    signedIn()
    replies([200, { date: '2026-10-14' }])
    saveRecord('2026-10-15', { completed: true, pendingSession: 's1', photo: 'data:image/jpeg;base64,AAAA' })
    await retryPendingCompletions()
    expect(bucket.upload).toHaveBeenCalledWith(
      `${UID}/2026-10-14.jpg`,
      expect.any(Blob),
      expect.objectContaining({ upsert: true }),
    )
    expect(workoutsTable.update).toHaveBeenCalledWith({ photo_url: `${UID}/2026-10-14.jpg` })
  })

  it('연결이 또 실패하면 대기 표시를 남겨 다음에 다시 시도', async () => {
    signedIn()
    const f = replies([503, { error: '운동 기록 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }])
    f.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    saveRecord('2026-10-13', { completed: true, pendingSession: 's0' })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    const r = getRecords()
    expect(r['2026-10-13'].pendingSession).toBe('s0')
    expect(r['2026-10-14'].pendingSession).toBe('s1')
  })

  it('서버가 거절(세션 만료 등)하면 더 시도하지 않는다, 다른 기록 재시도는 계속', async () => {
    signedIn()
    replies([422, { error: '시청한 지 너무 오래돼 기록할 수 없어요.' }], [200, { date: '2026-10-14' }])
    saveRecord('2026-10-12', { completed: true, pendingSession: 'old' })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    const r = getRecords()
    expect(r['2026-10-12'].pendingSession).toBeNull()
    expect(r['2026-10-14'].pendingSession).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('사용자 차단', () => {
  const blocksTable = (result) => client.from.mockReturnValueOnce({ select: vi.fn().mockResolvedValue(result) })

  it('차단한 사용자 id 를 Set 으로 돌려준다', async () => {
    signedIn()
    blocksTable({ data: [{ blocked: 'u-2' }, { blocked: 'u-3' }], error: null })
    const ids = await fetchBlockedIds()
    expect([...ids]).toEqual(['u-2', 'u-3'])
    expect(client.from).toHaveBeenCalledWith('user_blocks')
  })
  it('조회 실패(SQL 미적용 등)면 아무도 숨기지 않는다', async () => {
    signedIn()
    blocksTable({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    expect((await fetchBlockedIds()).size).toBe(0)
  })
  it('비회원은 서버에 묻지 않고 빈 목록', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null } })
    expect((await fetchBlockedIds()).size).toBe(0)
    expect(client.from).not.toHaveBeenCalled()
  })
  it('서버가 판단해 거절(P0001)하면 그 문구를, 그 외 오류는 일반 안내를 보여준다', async () => {
    signedIn()
    client.rpc.mockResolvedValueOnce(rpcError('P0001', '자기 자신은 차단할 수 없어요.'))
    await expect(blockUser(UID)).rejects.toThrow('자기 자신은 차단할 수 없어요.')
    client.rpc.mockResolvedValueOnce(rpcError('PGRST202', 'function not found'))
    await expect(blockUser('u-2')).rejects.toThrow('차단 기능을 쓸 수 없어요')
    expect(client.rpc).toHaveBeenLastCalledWith('block_user', { p_target: 'u-2' })
  })
  it('차단 해제는 해제용 서버 함수를 부른다', async () => {
    signedIn()
    client.rpc.mockResolvedValueOnce({ data: null, error: null })
    await unblockUser('u-2')
    expect(client.rpc).toHaveBeenLastCalledWith('unblock_user', { p_target: 'u-2' })
  })
})

describe('그룹 화면 데이터', () => {
  // 테이블 이름별로 정해 둔 결과를 돌려주는 가짜 조회 (select, eq, in, gte 를 몇 번 이어 불러도 같은 결과)
  const tables = (results) =>
    client.from.mockImplementation((name) => {
      const query = Object.assign(Promise.resolve(results[name]), {})
      for (const step of ['select', 'eq', 'in', 'gte']) query[step] = () => query
      return query
    })

  it('차단한 멤버는 빼고, 멤버별 운동 날짜와 오늘의 인증샷을 묶어 준다', async () => {
    signedIn()
    const today = todayKey()
    tables({
      group_members: { data: [{ user_id: 'u-1' }, { user_id: 'u-2' }, { user_id: 'u-3' }] },
      user_blocks: { data: [{ blocked: 'u-3' }], error: null },
      workouts: {
        data: [
          { user_id: 'u-1', date: today, photo_url: 'u-1/a.jpg' },
          { user_id: 'u-1', date: '2026-01-01', photo_url: null },
          { user_id: 'u-2', date: today, photo_url: null },
          { user_id: 'u-3', date: today, photo_url: 'u-3/c.jpg' },
        ],
      },
    })
    client.rpc.mockResolvedValueOnce({ data: [{ id: 'u-1', nickname: '민준', avatar_url: 'https://a' }] })
    bucket.createSignedUrls = vi
      .fn()
      .mockResolvedValue({ data: [{ path: 'u-1/a.jpg', signedUrl: 'https://signed/a' }] })

    const { members, photos, hiddenCount } = await fetchGroupStatus('g-1')

    expect(hiddenCount).toBe(1)
    expect(members.map((m) => [m.id, m.name, m.avatar, [...m.dates].sort()])).toEqual([
      ['u-1', '민준', 'https://a', ['2026-01-01', today].sort()],
      ['u-2', '이름 없음', '', [today]],
    ])
    expect(photos).toEqual([{ id: 'u-1', name: '민준', url: 'https://signed/a' }])
    // 차단한 멤버의 사진은 서명 요청에도 넣지 않음
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(['u-1/a.jpg'], expect.any(Number))
  })
  it('멤버가 없으면 빈 결과', async () => {
    signedIn()
    tables({ group_members: { data: [] }, user_blocks: { data: [], error: null } })
    expect(await fetchGroupStatus('g-1')).toEqual({ members: [], photos: [], hiddenCount: 0 })
  })
})

describe('일회용 이메일 확인', async () => {
  const { isDisposableEmail } = await import('./auth.js')
  it('서버가 일회용이라고 답하면 true', async () => {
    client.rpc.mockResolvedValueOnce({ data: true, error: null })
    await expect(isDisposableEmail(' bot@yopmail.com ')).resolves.toBe(true)
    expect(client.rpc).toHaveBeenLastCalledWith('is_disposable_email', { p_email: 'bot@yopmail.com' })
  })
  it('확인에 실패하면(SQL 미적용 등) 가입을 막지 않는다 — 서버가 가입 때 다시 검사', async () => {
    client.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    await expect(isDisposableEmail('me@gmail.com')).resolves.toBe(false)
  })
})

// 백엔드 3단계: 공지는 Supabase 를 직접 부르지 않고 자체 API 서버(/api/announcements/active)에서 받음
describe('홈 배너 공지 (자체 API 서버)', () => {
  const NOTICE = { id: 7, message: '이번 주 이벤트!' }
  // 가짜 fetch: 주어진 상태 코드와 본문으로 답함
  const reply = (status, body) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    )

  it('서버가 공지를 주면 { id, message } 를 돌려준다', async () => {
    reply(200, { announcement: NOTICE })
    expect(await fetchActiveAnnouncement()).toEqual(NOTICE)
    expect(fetch).toHaveBeenCalledWith('/api/announcements/active')
  })
  it('공지가 없으면 null', async () => {
    reply(200, { announcement: null })
    expect(await fetchActiveAnnouncement()).toBeNull()
  })
  it('서버가 실패(503)하면 null — 배너만 안 보이고 앱은 그대로', async () => {
    reply(503, { error: '공지를 불러오지 못했어요.' })
    expect(await fetchActiveAnnouncement()).toBeNull()
  })
  it('연결이 끊겨도(오프라인) 오류를 던지지 않고 null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    expect(await fetchActiveAnnouncement()).toBeNull()
  })
  it('Supabase 를 직접 부르지 않는다', async () => {
    reply(200, { announcement: NOTICE })
    await fetchActiveAnnouncement()
    expect(client.from).not.toHaveBeenCalled()
  })
})
