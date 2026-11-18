// 화면 언어 (한국어, 영어) — 화면에 보이는 모든 문구는 t() 를 거침
//
// 쓰는 법
//   t('로그인이 필요해요.')                          한국어 원문이 곧 열쇠. 영어면 i18n.en.js 에서 찾아 바꿈
//   t('멤버 {count}/{max}명', { count: 3, max: 10 })  {이름} 자리에 값을 끼워 넣음
//   t('일수|일')                                      같은 한국어가 다른 뜻으로 쓰일 때 '구분|원문'. 한국어로는 | 뒤만 보임
//
// 언어를 바꾸면 페이지를 새로 불러옴 (setLanguage). 그래서 파일 맨 위의 상수에서 t() 를 불러도 늘 맞는 언어가 나옴
// 새 문구를 넣으면 i18n.en.js 에 영어를 추가해야 함. 빠뜨리면 src/lib/i18n.test.js 가 실패함
import { getLanguage, saveLanguage } from './storage.js'
import EN, { SERVER_PATTERNS } from './i18n.en.js'

// 고르는 화면에는 각 언어를 그 언어로 보여 줌 (번역하지 않음)
export const LANGUAGES = [
  { key: 'ko', label: '한국어' },
  { key: 'en', label: 'English' },
]

let lang = getLanguage()
export const currentLanguage = () => lang

// 테스트용: 페이지를 다시 불러오지 않고 언어만 바꿈
export function setLanguageForTest(next) {
  lang = next
}

// 설정에서 언어를 고르면 저장하고 처음부터 다시 그림
export function setLanguage(next) {
  saveLanguage(next)
  if (typeof window !== 'undefined') window.location.reload()
}

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text)
const plain = (key) => (key.includes('|') ? key.slice(key.indexOf('|') + 1) : key)

// 번역문의 틀 ({이름} 자리는 아직 비어 있음). 영어 번역이 함수면 값(예: 1 day, 2 days)에 맞는 틀을 고름
function template(key, vars) {
  if (lang === 'en') {
    const v = EN[key]
    if (v !== undefined) return typeof v === 'function' ? v(vars || {}) : v
    if (import.meta.env?.DEV) console.warn('[i18n] 영어 번역 없음:', key)
  }
  return plain(key)
}

export function t(key, vars) {
  return fill(template(key, vars), vars)
}

// 문장 가운데에 강조된 숫자 같은 화면 요소를 끼울 때: 번역문을 {name} 자리에서 둘로 나눔
// 예: const [before, after] = tSplit('연속 {n}일째,', 'n', { n })  그 사이에 <strong>{n}</strong>
// 언어마다 숫자 위치가 달라도 (영어는 숫자가 앞) 문장 순서가 자연스럽게 맞춰짐
export function tSplit(key, name, vars = {}) {
  const keep = { ...vars, [name]: `{${name}}` }
  const [before, after = ''] = fill(template(key, vars), keep).split(`{${name}}`)
  return [before, after]
}

// 서버(DB 함수, Edge Function, 자체 API 서버)가 보낸 한국어 문구를 화면 언어로
// 번역표에 없거나 모양이 정해지지 않은 문구는 영어 화면에 한국어가 섞이지 않게 일반 안내로 바꿈
export function tServer(message) {
  const msg = String(message || '').replace(/^absolid:\s*/, '')
  if (lang !== 'en' || !/[가-힣]/.test(msg)) return msg
  if (EN[msg] !== undefined && typeof EN[msg] === 'string') return EN[msg]
  for (const [re, make] of SERVER_PATTERNS) {
    const m = msg.match(re)
    if (m) return make(m)
  }
  return EN['일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.']
}

// 요일 한 글자 (0 = 일요일)
const WEEKDAYS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
}
export const weekdayShort = (day) => WEEKDAYS[lang][day]

// <html lang> 을 화면 언어로 (화면 낭독기, 줄바꿈 규칙에 쓰임)
if (typeof document !== 'undefined') document.documentElement.lang = lang
