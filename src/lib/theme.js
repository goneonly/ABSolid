// 화면 테마 (시스템 설정 따름 / 라이트 / 다크)
// 첫 그림 전 적용은 index.html 의 인라인 스크립트가 하고(깜빡임 방지), 여기서는 설정 변경, 시스템 변경을 반영
import { getThemeMode, saveThemeMode } from './storage.js'

export const THEME_MODES = [
  { key: 'system', label: '시스템' },
  { key: 'light', label: '라이트' },
  { key: 'dark', label: '다크' },
]

// 상태표시줄, 브라우저 주소창 색 (index.css 의 --color-bg 와 같은 값)
const BAR_COLOR = { dark: '#141519', light: '#f5f6f8' }

const systemQuery = () => (typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null)

// 실제로 그릴 테마 — 시스템 설정을 알 수 없으면 원래 앱 모습인 다크
export function resolveTheme(mode, systemDark) {
  if (mode === 'light' || mode === 'dark') return mode
  return systemDark === false ? 'light' : 'dark'
}

function applyTheme(mode = getThemeMode()) {
  const theme = resolveTheme(mode, systemQuery()?.matches)
  if (typeof document === 'undefined') return theme
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme])
  // 아이폰 홈 화면 앱의 상태표시줄 글자색 (앱을 다시 열 때 반영됨)
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default')
  return theme
}

export function setThemeMode(mode) {
  saveThemeMode(mode)
  applyTheme(mode)
}

// '시스템' 모드일 때 휴대폰의 라이트/다크 전환을 바로 따라감 (앱 시작 시 1회 등록)
// 홈 화면 앱은 백그라운드에서 변경 이벤트를 놓칠 수 있어, 앱으로 돌아올 때도 다시 확인
export function watchSystemTheme() {
  const follow = () => {
    if (getThemeMode() === 'system') applyTheme('system')
  }
  systemQuery()?.addEventListener?.('change', follow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') follow()
  })
}
