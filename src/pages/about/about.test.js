import { describe, expect, it } from 'vitest'
import { computeStreak, todayKey } from '../../lib/storage.js'
import { FEATURES, SHOWCASE } from './content.js'
import { DEMO_ME, DEMO_STREAK, demoMembers, demoRanking, demoRecords } from './demoData.js'
import { scrollProgress } from './motion.jsx'
import { ICONS } from './sections/Features.jsx'
import { SCREENS } from './sections/Showcase.jsx'

describe('스크롤 진행도', () => {
  const VIEW = 800
  it('through: 화면 아래에서 들어올 때 0, 위로 다 빠져나가면 1', () => {
    expect(scrollProgress({ top: 800, height: 400 }, VIEW)).toBe(0)
    expect(scrollProgress({ top: 200, height: 400 }, VIEW)).toBe(0.5)
    expect(scrollProgress({ top: -400, height: 400 }, VIEW)).toBe(1)
  })
  it('enter: 윗변이 화면 아래에 닿으면 0, 화면 맨 위에 닿으면 1', () => {
    expect(scrollProgress({ top: 800, height: 400 }, VIEW, 'enter')).toBe(0)
    expect(scrollProgress({ top: 400, height: 400 }, VIEW, 'enter')).toBe(0.5)
    expect(scrollProgress({ top: 0, height: 400 }, VIEW, 'enter')).toBe(1)
  })
  it('pin: 고정 구간에 들어서면 0, 끝까지 내리면 1 (4단계 구간이면 한 화면마다 1/3 씩)', () => {
    const height = VIEW * 4
    expect(scrollProgress({ top: 0, height }, VIEW, 'pin')).toBe(0)
    expect(scrollProgress({ top: -VIEW * 1.5, height }, VIEW, 'pin')).toBe(0.5)
    expect(scrollProgress({ top: -VIEW * 3, height }, VIEW, 'pin')).toBe(1)
  })
  it('범위를 벗어나도 0 과 1 사이로 유지, 화면보다 짧은 고정 구간은 0', () => {
    expect(scrollProgress({ top: 5000, height: 400 }, VIEW)).toBe(0)
    expect(scrollProgress({ top: -5000, height: 400 }, VIEW, 'enter')).toBe(1)
    expect(scrollProgress({ top: -100, height: 600 }, VIEW, 'pin')).toBe(0)
  })
})

describe('화면 예시 데이터', () => {
  it('오늘까지 이어진 연속 기록을 만든다 (언제 열어도 같은 숫자)', () => {
    expect(computeStreak(demoRecords())).toBe(DEMO_STREAK)
    expect(demoRecords()[todayKey()]).toEqual({ completed: true })
  })
  it('오늘 운동 전이면 어제까지의 연속 기록', () => {
    const records = demoRecords({ doneToday: false })
    expect(records[todayKey()]).toBeUndefined()
    expect(computeStreak(records)).toBe(DEMO_STREAK - 1)
  })
  it('그룹에는 오늘 운동한 멤버와 아직인 멤버가 함께 있다 (두 가지 응원 버튼이 모두 보이게)', () => {
    const today = todayKey()
    const others = demoMembers().filter((m) => m.id !== DEMO_ME)
    expect(others.some((m) => m.dates.has(today))).toBe(true)
    expect(others.some((m) => !m.dates.has(today))).toBe(true)
  })
  it('리더보드는 내가 1위이고 모든 줄에 순위와 변동이 있다', () => {
    const { rows, totalDays } = demoRanking()
    expect(rows[0].id).toBe(DEMO_ME)
    expect(rows[0].rank).toBe(1)
    expect(rows.every((r) => Number.isInteger(r.rank) && Number.isInteger(r.delta))).toBe(true)
    expect(rows.every((r) => r.count <= totalDays)).toBe(true)
  })
})

describe('문구와 화면 연결', () => {
  it('기능 소개의 모든 단계에 보여 줄 화면이 있다', () => {
    for (const step of SHOWCASE) expect(SCREENS[step.screen], step.screen).toBeDefined()
  })
  it('기능 목록의 모든 항목에 아이콘이 있다', () => {
    for (const item of FEATURES.items) expect(ICONS[item.icon], item.icon).toBeDefined()
  })
})
