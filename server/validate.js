// 요청 값 검사 도우미 — 주소에 담겨 온 값(그룹 id, 날짜)이 올바른지 DB 에 묻기 전에 확인
// 잘못된 값을 DB 에 그대로 넘기면 DB 오류(503)가 나서, "내가 잘못 보냄(400)" 과 "서버 문제(503)" 가 섞임

// 그룹 id 는 uuid: 8-4-4-4-12 자리의 16진수 (예: 11111111-2222-4333-8444-555555555555)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return typeof value === 'string' && UUID.test(value)
}

// 날짜 키: 'YYYY-MM-DD' 이면서 달력에 있는 날 (2026-02-30 같은 날은 거절)
export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const DAY_MS = 24 * 60 * 60 * 1000

// 두 날짜 키 사이의 날 수 (같은 날이면 0)
export function daysBetween(startKey, endKey) {
  return Math.round((Date.parse(endKey) - Date.parse(startKey)) / DAY_MS)
}

// 리더보드 기간: 둘 다 날짜이고, 시작이 끝보다 늦지 않고, 최대 366일(윤년 1년)까지
export const MAX_RANGE_DAYS = 366

export function isDateRange(startKey, endKey) {
  if (!isDateKey(startKey) || !isDateKey(endKey)) return false
  const days = daysBetween(startKey, endKey) + 1 // 시작일과 종료일을 모두 세면 +1
  return days >= 1 && days <= MAX_RANGE_DAYS
}
