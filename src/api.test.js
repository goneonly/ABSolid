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

const { completeWorkout, retryPendingCompletions, fetchBlockedIds, blockUser } = await import('./api.js')
const { getRecords, saveRecord } = await import('./storage.js')

const UID = 'u-1'
const signedIn = () => client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: UID } } } })
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

describe('운동 완료 요청', () => {
  it('성공하면 서버가 기록한 날짜를 돌려준다', async () => {
    client.rpc.mockResolvedValue({ data: '2026-10-14', error: null })
    await expect(completeWorkout('s1')).resolves.toBe('2026-10-14')
    expect(client.rpc).toHaveBeenCalledWith('complete_workout', { p_session: 's1' })
  })
  it('서버가 판단해 거절(P0001: 시청 시간 부족 등)하면 다시 시도하지 않는다', async () => {
    client.rpc.mockResolvedValue(rpcError('P0001', '영상을 끝까지 시청해야 완료로 기록돼요. 약 3분 남았어요.'))
    await expect(completeWorkout('s1')).rejects.toMatchObject({
      retryable: false,
      message: expect.stringContaining('약 3분 남았어요'),
    })
  })
  it('연결 문제 등 그 밖의 오류는 나중에 다시 시도할 수 있다', async () => {
    client.rpc.mockResolvedValue(rpcError('', 'TypeError: Failed to fetch'))
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true })
  })
  it('요청 자체가 끊겨도(예외) 다시 시도 대상 — 영어 원문 대신 한국어 안내', async () => {
    client.rpc.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(completeWorkout('s1')).rejects.toMatchObject({ retryable: true, message: '서버에 연결할 수 없어요.' })
  })
})

describe('못 보낸 완료 기록 재시도 (앱 시작 시)', () => {
  it('로그인 안 했으면 아무것도 하지 않는다', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null } })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    expect(client.rpc).not.toHaveBeenCalled()
    expect(getRecords()['2026-10-14'].pendingSession).toBe('s1')
  })

  it('대기 중인 기록만 다시 보내고, 성공하면 대기 표시를 지운다', async () => {
    signedIn()
    client.rpc.mockResolvedValue({ data: '2026-10-14', error: null })
    saveRecord('2026-10-13', { completed: true })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    expect(client.rpc).toHaveBeenCalledTimes(1)
    expect(client.rpc).toHaveBeenCalledWith('complete_workout', { p_session: 's1' })
    expect(getRecords()['2026-10-14']).toMatchObject({ completed: true, pendingSession: null })
    expect(bucket.upload).not.toHaveBeenCalled()
  })

  it('인증샷이 있으면 서버가 기록한 날짜로 이어서 업로드 (자정을 넘겨 보낸 경우)', async () => {
    signedIn()
    client.rpc.mockResolvedValue({ data: '2026-10-14', error: null })
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
    client.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    client.rpc.mockResolvedValueOnce(rpcError('PGRST000', 'connection error'))
    saveRecord('2026-10-13', { completed: true, pendingSession: 's0' })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    const r = getRecords()
    expect(r['2026-10-13'].pendingSession).toBe('s0')
    expect(r['2026-10-14'].pendingSession).toBe('s1')
  })

  it('서버가 거절(세션 만료 등)하면 더 시도하지 않는다 — 다른 기록 재시도는 계속', async () => {
    signedIn()
    client.rpc
      .mockResolvedValueOnce(rpcError('P0001', '시청한 지 너무 오래돼 기록할 수 없어요.'))
      .mockResolvedValueOnce({ data: '2026-10-14', error: null })
    saveRecord('2026-10-12', { completed: true, pendingSession: 'old' })
    saveRecord('2026-10-14', { completed: true, pendingSession: 's1' })
    await retryPendingCompletions()
    const r = getRecords()
    expect(r['2026-10-12'].pendingSession).toBeNull()
    expect(r['2026-10-14'].pendingSession).toBeNull()
    expect(client.rpc).toHaveBeenCalledTimes(2)
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
