// Supabase 연결 — .env에 키를 넣으면 자동 활성화, 없으면 로컬(비회원) 모드
import { createClient } from '@supabase/supabase-js'

let url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '')
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '')
if (url && !url.startsWith('http')) url = `https://${url}` // 프로젝트 ID만 넣은 경우 보정
if (url && !url.includes('.')) url = `${url.replace(/\/$/, '')}.supabase.co`

function makeClient() {
  try {
    return url && key ? createClient(url, key) : null
  } catch {
    return null
  } // 값이 잘못돼도 앱이 죽지 않게 (로컬 모드로 동작)
}

export const supabase = makeClient()

// 기기에 저장된 로그인 정보를 네트워크 없이 바로 읽기 (앱 시작을 빠르게)
// supabase.auth.getSession() 은 로그인 정보가 만료(1시간)됐으면 서버에서 새로 받아 올 때까지 기다려서
// 느린 회선에서는 첫 화면이 몇 초씩 늦어짐 → 저장된 정보로 먼저 그리고, 갱신은 뒤에서 (useAuth.js)
// 저장 위치는 supabase-js 기본값: localStorage 'sb-<프로젝트ID>-auth-token'
export function parseStoredSession(raw) {
  try {
    const s = JSON.parse(raw)
    return s?.user?.id && s.refresh_token ? s : null
  } catch {
    return null
  }
}

export function storedSession() {
  if (!supabase) return null
  try {
    return parseStoredSession(localStorage.getItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`))
  } catch {
    return null
  }
}

// 지금 로그인한 사용자 (없으면 null) — 서버 요청 전에 "로그인했는지" 확인할 때 공통으로 사용
export async function currentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

export async function currentUserId() {
  return (await currentUser())?.id || null
}
