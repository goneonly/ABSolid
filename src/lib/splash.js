// 앱 시작 로딩 화면 제어 — 화면과 3초, 8초 안내는 index.html 에 있음 (앱 코드가 늦어도 먼저 보이게)
// 단계 막대: 1 = 페이지 열림, 2 = 앱 코드 실행, 3 = 로그인 상태 확인 끝
// 빨리 준비돼도 이만큼은 보여줌: 로고 그리기, 문구 등장(약 0.8초)을 다 보고 잠깐 머무는 시간
const MIN_VISIBLE_MS = 1400
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
  window.__absolidSplashDone?.() // 3초, 8초 안내 타이머 해제
  // 기준은 로딩 화면이 실제로 보이기 시작한 시각 (index.html 에서 기록) — 페이지 요청 시각부터 세면
  // 네트워크가 느릴수록 화면이 덜 보이는 문제가 있었음 (배포 환경에서 0.1초만 보임)
  const shownAt = window.__absolidSplashAt ?? 0
  const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt))
  setTimeout(() => {
    splash.classList.add('splash-out')
    setTimeout(() => splash.remove(), FADE_MS)
  }, wait)
}
