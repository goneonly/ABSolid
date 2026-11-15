// 요청 한 번마다 Supabase 클라이언트를 새로 만드는 도우미
//
// 왜 요청마다 새로 만드나: 서버리스 함수는 여러 사용자의 요청을 같은 프로세스에서 처리할 수 있어서,
// 클라이언트 하나를 공유하면 A 의 로그인 정보로 B 의 요청을 처리하는 사고가 날 수 있음.
// 토큰을 넘기면 그 사용자 신분으로, 안 넘기면 비회원 신분으로 DB 에 접근함 (설계 Q8: RLS 규칙이 그대로 적용됨)
import { createClient } from '@supabase/supabase-js'

// 앱과 같은 공개 키를 씀 (.env, Vercel 환경 변수의 VITE_ 값). 서비스 키는 여기서 쓰지 않음
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

export function supabaseFor(token) {
  if (!url || !key) throw new Error('Supabase 환경 변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 없어요.')
  return createClient(url, key, {
    // 서버는 로그인 상태를 저장하거나 갱신하지 않음 (요청 하나 처리하고 끝)
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  })
}
