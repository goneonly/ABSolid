// 로그인 토큰 확인 미들웨어 — 로그인이 필요한 주소 앞에 세워 두는 문지기
// 통과하면 다음 단계(라우트)에서 c.get('user') 로 로그인한 사용자를, c.get('token') 으로 토큰을 꺼내 쓸 수 있음
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabaseFor } from './supabase.js'

export async function requireUser(c, next) {
  // 1. 헤더에서 출입증(토큰) 꺼내기. 없거나 'Bearer 토큰' 형식이 아니면 401
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: '로그인이 필요해요.' }, 401)
  }
  const token = header.slice('Bearer '.length)
  if (!token) {
    return c.json({ error: '로그인이 필요해요.' }, 401)
  }

  // 2. Supabase 에 진짜인지 묻기 (요청마다 확인. 로그아웃이나 탈퇴로 취소된 토큰도 바로 막힘)
  const { data, error } = await supabaseFor(token).auth.getUser(token)

  // 3. Supabase 에 연결이 안 됐으면 503 (사용자 잘못이 아니라 잠시 후 다시 시도하면 됨)
  if (error && isAuthRetryableFetchError(error)) {
    return c.json({ error: '로그인 확인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503)
  }

  // 4. 가짜이거나 만료된 토큰이면 401 (오류와 빈 사용자를 둘 다 확인하는 이중 안전장치)
  if (error || !data.user) {
    return c.json({ error: '로그인이 필요해요.' }, 401)
  }

  // 5. 통과: 사용자와 토큰을 저장하고 라우트로 넘김
  c.set('user', data.user)
  c.set('token', token)
  await next()
}
