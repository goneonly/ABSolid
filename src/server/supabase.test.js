import { describe, expect, it } from 'vitest'
import { parseStoredSession } from './supabase.js'

describe('저장된 로그인 정보 읽기', () => {
  it('사용자 id 와 갱신 토큰이 있으면 그대로 사용 (만료돼도 — 갱신은 뒤에서)', () => {
    const s = { access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u1' } }
    expect(parseStoredSession(JSON.stringify(s))).toEqual(s)
  })
  it('없거나 깨졌거나 필수값이 빠지면 null', () => {
    expect(parseStoredSession(null)).toBeNull()
    expect(parseStoredSession('{broken')).toBeNull()
    expect(parseStoredSession(JSON.stringify({ user: { id: 'u1' } }))).toBeNull()
    expect(parseStoredSession(JSON.stringify({ refresh_token: 'r' }))).toBeNull()
  })
})
