import { describe, expect, it } from 'vitest'
import { resolveTheme, setThemeMode } from './theme.js'
import { clearAllAppData, getThemeMode } from './storage.js'

describe('화면 테마', () => {
  it('직접 고른 테마는 시스템 설정과 상관없이 그대로', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  it('시스템 모드는 휴대폰 설정을 따르고, 알 수 없으면 다크', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('system', undefined)).toBe('dark')
  })
  it('기본값은 다크, 잘못된 값도 다크로', () => {
    expect(getThemeMode()).toBe('dark')
    localStorage.setItem('absolid-theme', 'blue')
    expect(getThemeMode()).toBe('dark')
  })
  it('저장한 테마는 앱 데이터를 지워도 유지 (기기 설정)', () => {
    setThemeMode('light')
    expect(getThemeMode()).toBe('light')
    clearAllAppData()
    expect(getThemeMode()).toBe('light')
    setThemeMode('system')
    expect(getThemeMode()).toBe('system')
    setThemeMode('dark')
    expect(localStorage.getItem('absolid-theme')).toBeNull()
  })
})
