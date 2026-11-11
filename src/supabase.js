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

// 지금 로그인한 사용자 (없으면 null) — 서버 요청 전에 "로그인했는지" 확인할 때 공통으로 사용
export async function currentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

export async function currentUserId() {
  return (await currentUser())?.id || null
}
