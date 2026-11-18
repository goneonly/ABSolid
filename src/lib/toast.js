// 간단 토스트 알림 — 화면 하단에 잠깐 떴다 사라지는 메시지
import { tServer } from './i18n.js'
const BASE =
  'fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-200 max-w-[min(440px,calc(100vw-40px))] -translate-x-1/2 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-fg shadow-float transition duration-250'
const HIDDEN = ['opacity-0', 'translate-y-2']

export function toast(msg, ms = 3500) {
  const el = document.createElement('div')
  el.className = `${BASE} ${HIDDEN.join(' ')}`
  el.setAttribute('role', 'status')
  el.textContent = tServer(msg) // 서버가 보낸 한국어 문구가 영어 화면에 섞이지 않게 (이미 번역된 문구는 그대로)
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.remove(...HIDDEN))
  setTimeout(() => {
    el.classList.add(...HIDDEN)
    setTimeout(() => el.remove(), 300)
  }, ms)
}
