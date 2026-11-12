// 회원 탈퇴 — Supabase Edge Function
// 로그인한 본인이 호출하면 계정과 모든 데이터를 삭제합니다.
// 배포: supabase functions deploy delete-account
// (SUPABASE_URL 과 키들은 Supabase 가 자동 주입 — 키 선택은 _shared/keys.ts)
//
// 동작:
//   1) 호출자의 JWT 로 본인 user_id 확인 (남의 계정 삭제 불가)
//   2) service_role 로 그룹장 위임, 계정 삭제(나머지 cascade), 사진 정리 순서 (_shared/purgeUser.ts)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { serviceKey as getServiceKey, publishableKey } from '../_shared/keys.ts'
import { purgeUser } from '../_shared/purgeUser.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = getServiceKey()

  // 1) 호출자 인증 — Authorization 헤더의 JWT 로 본인만 확인
  const authHeader = req.headers.get('Authorization') || ''
  const asUser = createClient(url, publishableKey(), {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: uErr,
  } = await asUser.auth.getUser()
  if (uErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const uid = user.id

  // 2) service_role 로 정리
  const admin = createClient(url, serviceKey)
  try {
    await purgeUser(admin, uid)
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
