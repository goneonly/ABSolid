// 소개 페이지의 화면 예시에 넣는 가짜 데이터 — 서버를 부르지 않고, 오늘 날짜 기준으로 만들어 언제 열어도 자연스럽게 보임
// 이름은 모두 지어낸 것
import { t } from '../../lib/i18n.js'
import { todayKey } from '../../lib/storage.js'
import { rankRows, withRankDelta } from '../../lib/stats.js'

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayKey(d)
}
const keys = (list) => list.map(daysAgo)

export const DEMO_STREAK = 12 // 오늘까지 이어진 연속 운동일
export const DEMO_ME = 'me'

// 내 운동 기록: 오늘까지 12일 연속, 그 전에는 하루 쉬고 띄엄띄엄
// doneToday=false 면 오늘 운동 전 (연속 11일)
export function demoRecords({ doneToday = true } = {}) {
  const out = {}
  for (let i = doneToday ? 0 : 1; i < DEMO_STREAK; i++) out[daysAgo(i)] = { completed: true }
  for (const k of keys([13, 14, 16, 17])) out[k] = { completed: true }
  return out
}

// 그룹 멤버와 최근 7일 운동한 날 (0 = 오늘)
const MEMBERS = [
  { id: DEMO_ME, name: t('수아'), days: [0, 1, 2, 3, 4, 5, 6], before: [7, 8, 9, 10, 11] },
  { id: 'm1', name: t('민준'), days: [0, 1, 2, 4, 5, 6], before: [7, 8, 9, 10, 11, 12, 13] },
  { id: 'm2', name: t('서연'), days: [1, 2, 3, 5], before: [8, 10] },
  { id: 'm3', name: t('지호'), days: [0, 2, 6], before: [7, 9, 11, 13] },
]

export const DEMO_GROUP = { name: t('아침 복근단'), invite_code: 'ABS247', max_members: 10 }

export function demoMembers() {
  return MEMBERS.map((m) => ({ id: m.id, name: m.name, avatar: '', dates: new Set(keys(m.days)) }))
}

// 리더보드: 최근 7일 순위와 그 전 7일 대비 순위 변동 (앱과 같은 계산 함수 사용)
export function demoRanking() {
  const members = MEMBERS.map((m) => ({ id: m.id, name: m.name, avatar: '' }))
  const sets = (field) => Object.fromEntries(MEMBERS.map((m) => [m.id, keys(m[field])]))
  const now = rankRows(members, sets('days'), DEMO_ME, null, daysAgo(6), daysAgo(0))
  const before = rankRows(members, sets('before'), DEMO_ME, null, daysAgo(13), daysAgo(7))
  return { rows: withRankDelta(now, before), totalDays: 7 }
}
