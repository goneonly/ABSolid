// 로컬(기기) 저장소 — localStorage 키는 이 파일에서만 정의하고, 바깥에는 용도별 함수만 노출
// (키 문자열이 여러 파일에 흩어지면 한쪽만 바뀌었을 때 오류 없이 기능이 꺼짐)
const KEY_PREFIX = 'absolid.'
const KEYS = {
  records: 'absolid.records.v1',
  profile: 'absolid.profile.v1',
  serverCleanup: 'absolid.cleanup.v1', // 서버 인증샷을 마지막으로 정리한 날짜
  remindDismissed: 'absolid.remind.dismissed', // 저녁 리마인더 배너를 닫은 날짜
  onboarding: 'absolid.onboarding.v1', // 'pending' | 'done'
  pushConsent: 'absolid.pushconsent.v1', // 푸시 동의 팝업을 이미 보여줬는지
  guest: 'absolid.guest.v1', // 첫 화면에서 '비회원으로 시작하기'를 골랐는지
  // 화면 테마 — 기기 설정이라 'absolid.' 접두사 밖에 둬서 앱 데이터를 지워도 유지 (index.html 첫 스크립트도 같은 키 사용)
  theme: 'absolid-theme', // 'system' | 'light' (없으면 기본값 다크)
}

// 단순 값 읽기, 쓰기 (프라이빗 모드 등에서 localStorage 접근이 실패해도 앱이 죽지 않게)
function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* noop */
  }
}
function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}
// JSON 값 읽기, 쓰기 (없거나 깨진 값이면 fallback)
function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}
function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 오늘 날짜의 "일" 기준 운동 Day 번호 (31일은 day 30)
export function todayWorkoutDay(d = new Date()) {
  return Math.min(d.getDate(), 30)
}

// ── 운동 기록 ────────────────────────────────
// { 'YYYY-MM-DD': { completed, day, completedAt, photo(기기 사진), photoUrl(서버 경로), pendingSession } }
export function getRecords() {
  return readJson(KEYS.records, {})
}

// 그 날짜 기록에 값을 덮어씀 (없던 날짜면 새로 만듦)
export function saveRecord(dateKey, rec) {
  const all = getRecords()
  all[dateKey] = { ...(all[dateKey] || {}), ...rec }
  writeJson(KEYS.records, all)
  return all
}

export function clearRecords() {
  localStorage.removeItem(KEYS.records)
}

// 로그아웃 시: 이 기기에 남은 계정별 데이터 정리
// (남겨두면 다른 계정으로 로그인할 때 이전 계정 기록이 새 계정으로 업로드됨)
const USER_SCOPED_KEYS = [KEYS.records, KEYS.profile, KEYS.serverCleanup, KEYS.remindDismissed]
export function clearLocalUserData() {
  for (const k of USER_SCOPED_KEYS) remove(k)
}

// 회원 탈퇴 시: 이 앱이 기기에 남긴 모든 값 삭제
export function clearAllAppData() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
    for (const k of keys) if (k?.startsWith(KEY_PREFIX)) localStorage.removeItem(k)
  } catch {
    /* noop */
  }
}

// ── 기기 플래그 ──────────────────────────────
// 비회원으로 시작하기 선택
export const isGuestChosen = () => read(KEYS.guest) === '1'
export const setGuestChosen = (on) => (on ? write(KEYS.guest, '1') : remove(KEYS.guest))

// 가입 직후 온보딩 팝업 (가입 요청 전에 pending, 팝업을 닫으면 done)
export const isOnboardingPending = () => read(KEYS.onboarding) === 'pending'
export const markOnboardingPending = () => write(KEYS.onboarding, 'pending')
export const markOnboardingDone = () => write(KEYS.onboarding, 'done')
export const cancelOnboarding = () => remove(KEYS.onboarding)

// 푸시 알림 동의 팝업 (기기당 1회)
export const isPushConsentAsked = () => !!read(KEYS.pushConsent)
export const markPushConsentAsked = () => write(KEYS.pushConsent, 'done')

// 서버 인증샷 정리 (하루 1회)
export const isServerCleanupDoneToday = () => read(KEYS.serverCleanup) === todayKey()
export const markServerCleanupDone = () => write(KEYS.serverCleanup, todayKey())

// 화면 테마: 'system' | 'light' | 'dark' — 기본값은 다크 (저장값이 없거나 잘못되면 다크)
export const getThemeMode = () => {
  const v = read(KEYS.theme)
  return v === 'system' || v === 'light' ? v : 'dark'
}
export const saveThemeMode = (mode) =>
  mode === 'system' || mode === 'light' ? write(KEYS.theme, mode) : remove(KEYS.theme)

// 저녁 리마인더 배너 닫기 (하루 1회)
export const isReminderDismissedToday = () => read(KEYS.remindDismissed) === todayKey()
export const dismissReminderToday = () => write(KEYS.remindDismissed, todayKey())

// 오래된 인증샷(dataURL)만 로컬에서 정리 — 완료 기록 자체는 유지
// localStorage 한도(약 5MB) 보호: 최근 keepDays일 사진만 남김
export function cleanupLocalPhotos(keepDays = 7) {
  const all = getRecords()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (keepDays - 1))
  const cutoffKey = todayKey(cutoff)
  let changed = false
  for (const k of Object.keys(all)) {
    if (k < cutoffKey && all[k]?.photo) {
      delete all[k].photo
      changed = true
    }
  }
  if (changed) writeJson(KEYS.records, all)
}

export function computeStreak(records = getRecords()) {
  let streak = 0
  const d = new Date()
  // 오늘 안 했으면 어제부터 카운트 (streak는 아직 깨지지 않음)
  if (!records[todayKey(d)]?.completed) d.setDate(d.getDate() - 1)
  while (records[todayKey(d)]?.completed) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function lastNDays(n, records = getRecords()) {
  const out = []
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  for (let i = 0; i < n; i++) {
    const key = todayKey(d)
    out.push({ key, date: new Date(d), done: !!records[key]?.completed })
    d.setDate(d.getDate() + 1)
  }
  return out
}

// ── 내 프로필 (닉네임, 프로필 사진) ─────────────
export function getProfile() {
  return readJson(KEYS.profile, { nickname: '' })
}

export function saveProfile(p) {
  writeJson(KEYS.profile, p)
}

// 서버 기록을 로컬로 병합 (로컬에만 있는 사진 등은 유지)
export function mergeRecords(server) {
  if (!server) return
  const all = getRecords()
  for (const [k, v] of Object.entries(server)) {
    all[k] = { ...v, ...(all[k]?.photo ? { photo: all[k].photo } : {}) }
  }
  writeJson(KEYS.records, all)
}
