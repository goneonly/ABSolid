import { describe, expect, it } from 'vitest'
import { PUANG_AVATAR, easterEggAvatar } from './easterEggs.js'

describe('푸앙이 이스터에그', () => {
  it('닉네임이 푸앙이·푸앙이면 기본 사진이 푸앙이 (앞뒤 공백 무시)', () => {
    expect(easterEggAvatar('푸앙이')).toBe(PUANG_AVATAR)
    expect(easterEggAvatar('푸앙')).toBe(PUANG_AVATAR)
    expect(easterEggAvatar(' 푸앙 ')).toBe(PUANG_AVATAR)
  })
  it('다른 닉네임·빈 값은 기본 아이콘', () => {
    expect(easterEggAvatar('푸앙이짱')).toBeNull()
    expect(easterEggAvatar('')).toBeNull()
    expect(easterEggAvatar(undefined)).toBeNull()
  })
})
