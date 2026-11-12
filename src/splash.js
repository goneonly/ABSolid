// 앱 시작 로딩 화면 제어 — 화면과 3초·8초 안내는 index.html 에 있음 (앱 코드가 늦어도 먼저 보이게)
// 단계 막대: 1 = 페이지 열림, 2 = 앱 코드 실행, 3 = 로그인 상태 확인 끝
const MIN_VISIBLE_MS = 600 // 빨리 준비돼도 이만큼은 보여줌 (순식간에 번쩍 사라지는 깜빡임 방지)
const FADE_MS = 200

const el = () => (typeof document !== 'undefined' ? document.getElementById('splash') : null)

export function splashStage(stage) {
  el()?.setAttribute('data-stage', String(stage))
}

let hiding = false
export function hideSplash() {
  const splash = el()
  if (!splash || hiding) return
  hiding = true
  splashStage(3)
  window.__absolidSplashDone?.() // 3초·8초 안내 타이머 해제
  // performance.now() = 페이지를 연 뒤 지난 시간 ≈ 로딩 화면이 보인 시간
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now())
  setTimeout(() => {
    splash.classList.add('splash-out')
    setTimeout(() => splash.remove(), FADE_MS)
  }, wait)
}
