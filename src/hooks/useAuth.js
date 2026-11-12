import { useEffect, useState } from 'react'
import { supabase, storedSession } from '../server/supabase.js'

// 같은 계정이면 이전 객체를 그대로 유지
// supabase 는 토큰을 갱신할 때마다(약 1시간마다, 앱 시작 때도 2~3번) 새 session 객체를 주는데,
// 그대로 넘기면 session 을 보고 데이터를 불러오는 화면들이 매번 다시 불러옴. 화면은 계정(id, 이메일)만 쓰므로 유지해도 안전
export function keepSameAccount(prev, next) {
  return prev && next && prev.user?.id === next.user?.id ? prev : next
}

// 반환값: undefined = 세션 확인 중, null = 로그인 안 됨, 객체 = 로그인됨
// 기기에 저장된 로그인 정보가 있으면 그걸로 바로 시작 (만료됐으면 supabase 가 뒤에서 갱신하고,
// 그동안 서버 요청은 갱신이 끝날 때까지 자동으로 기다림. 갱신이 실패하면 SIGNED_OUT 으로 로그인 화면)
export function useAuth() {
  const [session, setSession] = useState(() => (supabase ? storedSession() || undefined : null))
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data, error }) =>
      setSession((prev) => {
        // 갱신이 네트워크 오류로 실패하면(error) 저장된 로그인을 유지 — 진짜 로그아웃은 SIGNED_OUT 이벤트로 옴
        if (!data.session && error) return prev ?? null
        return keepSameAccount(prev, data.session)
      }),
    )
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession((prev) => keepSameAccount(prev, next)),
    )
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}
