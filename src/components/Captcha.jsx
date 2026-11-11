import { useCallback, useEffect, useRef, useState } from 'react'

// 봇 가입·로그인 방지 (Cloudflare Turnstile) — 보통 사용자는 퍼즐 없이 자동 통과
// VITE_TURNSTILE_SITE_KEY 가 없으면 아무것도 그리지 않음 (토큰 없이 요청 → 서버 캡차가 꺼져 있으면 정상 동작)
// 서버 쪽: Supabase 대시보드 Authentication → Attack Protection 에서 Turnstile 비밀키를 넣으면
//          가입·로그인·비밀번호 재설정·인증 메일 재발송에 토큰이 필수가 됨 (docs/SUPABASE_SETUP.md)
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const CAPTCHA_WAIT = '자동 가입 방지 확인이 끝날 때까지 잠시 기다려 주세요.'

let loading = null
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve(window.turnstile)
    s.onerror = () => {
      loading = null
      reject(new Error('turnstile load failed'))
    }
    document.head.appendChild(s)
  })
  return loading
}

function Widget({ onToken }) {
  const ref = useRef(null)
  useEffect(() => {
    let alive = true
    let id
    loadTurnstile()
      .then((ts) => {
        if (!alive || !ref.current) return
        id = ts.render(ref.current, {
          sitekey: SITE_KEY,
          theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', // 앱 화면 테마와 맞춤
          size: 'flexible',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        })
      })
      .catch(() => {}) // 스크립트가 막히면 토큰 없이 요청 → 서버가 안내 오류를 돌려줌
    return () => {
      alive = false
      if (id !== undefined) window.turnstile?.remove(id)
    }
  }, [onToken])
  return <div ref={ref} className="mt-3 min-h-16.5" />
}

// 사용: const captcha = useCaptcha() → 폼 안에 {captcha.widget}
//       요청 전 captcha.ready 확인, 요청에 captcha.token 전달, 요청이 끝나면 captcha.reset() (토큰은 1회용)
export function useCaptcha() {
  const [token, setToken] = useState('')
  const [round, setRound] = useState(0)
  const reset = useCallback(() => {
    setToken('')
    setRound((n) => n + 1) // 위젯을 새로 그려 새 토큰 발급
  }, [])
  return {
    token,
    ready: !SITE_KEY || !!token,
    reset,
    widget: SITE_KEY ? <Widget key={round} onToken={setToken} /> : null,
  }
}
