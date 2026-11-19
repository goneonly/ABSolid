import { describe, expect, it } from 'vitest'
import { daysBetween, isDateKey, isDateRange, isUuid } from './validate.js'

describe('isUuid', () => {
  it('uuid 형식만 통과', () => {
    expect(isUuid('11111111-2222-4333-8444-555555555555')).toBe(true)
    expect(isUuid('ABCDEF12-2222-4333-8444-555555555555')).toBe(true)
    expect(isUuid('abc')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})

describe('isDateKey', () => {
  it('YYYY-MM-DD 이면서 달력에 있는 날만 통과', () => {
    expect(isDateKey('2026-11-19')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true) // 윤년
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2026-02-30')).toBe(false)
    expect(isDateKey('2026-11-1')).toBe(false)
    expect(isDateKey('abc')).toBe(false)
    expect(isDateKey(undefined)).toBe(false)
  })
})

describe('daysBetween', () => {
  it('두 날짜 사이의 날 수', () => {
    expect(daysBetween('2026-11-19', '2026-11-19')).toBe(0)
    expect(daysBetween('2026-11-01', '2026-11-19')).toBe(18)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('isDateRange', () => {
  it('하루짜리와 366일짜리까지는 통과', () => {
    expect(isDateRange('2026-11-19', '2026-11-19')).toBe(true)
    expect(isDateRange('2025-11-19', '2026-11-19')).toBe(true) // 366일
  })
  it('시작이 끝보다 늦거나, 366일을 넘거나, 날짜가 아니면 거절', () => {
    expect(isDateRange('2026-11-20', '2026-11-19')).toBe(false)
    expect(isDateRange('2025-11-18', '2026-11-19')).toBe(false) // 367일
    expect(isDateRange('2026-11-01', undefined)).toBe(false)
    expect(isDateRange('nope', '2026-11-19')).toBe(false)
  })
})
