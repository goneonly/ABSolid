import { describe, expect, it } from 'vitest'
import { keepSameAccount } from './useAuth.js'

describe('로그인 정보 객체 유지', () => {
  const a1 = { access_token: 't1', user: { id: 'a' } }
  const a2 = { access_token: 't2', user: { id: 'a' } }
  const b = { access_token: 't3', user: { id: 'b' } }

  it('같은 계정의 토큰 갱신이면 이전 객체를 유지 (화면이 다시 불러오지 않게)', () => {
    expect(keepSameAccount(a1, a2)).toBe(a1)
  })
  it('계정이 바뀌거나 로그인, 로그아웃이면 새 값으로', () => {
    expect(keepSameAccount(a1, b)).toBe(b)
    expect(keepSameAccount(undefined, a1)).toBe(a1)
    expect(keepSameAccount(a1, null)).toBeNull()
  })
})
