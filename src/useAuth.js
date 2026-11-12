import { useEffect, useState } from 'react'
import { supabase, storedSession } from './supabase.js'

// 반환값: undefined = 세션 확인 중, null = 로그인 안 됨, 객체 = 로그인됨
// 기기에 저장된 로그인 정보가 있으면 그걸로 바로 시작 (만료됐으면 supabase 가 뒤에서 갱신하고,
// 그동안 서버 요청은 갱신이 끝날 때까지 자동으로 기다림. 갱신이 실패하면 SIGNED_OUT 으로 로그인 화면)
export function useAuth() {
  const [session, setSession] = useState(() => (supabase ? storedSession() || undefined : null))
  useEffect(() => {
    if (!supabase) return
    // 갱신이 네트워크 오류로 실패하면(error) 저장된 로그인을 유지 — 진짜 로그아웃은 SIGNED_OUT 이벤트로 옴
    supabase.auth
      .getSession()
      .then(({ data, error }) => setSession((prev) => data.session ?? (error ? (prev ?? null) : null)))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}
