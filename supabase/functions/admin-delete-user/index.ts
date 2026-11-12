// 관리자 계정 삭제 — Supabase Edge Function (테스트 계정 정리 등)
// 배포: npx supabase functions deploy admin-delete-user
//
// 안전장치:
//   1) 호출자 JWT 로 본인 확인 후, profiles 에서 관리자(role='admin')이고 활성 계정인지 서버가 직접 확인
//      (앱 화면을 거치지 않고 API 로 직접 불러도 일반 회원은 403)
//   2) 본인 계정은 삭제 불가 (설정의 회원 탈퇴 사용), 다른 관리자 계정도 삭제 불가 (실수로 관리자를 모두 지우는 일 방지)
//   3) 삭제 자체는 회원 탈퇴와 같은 과정 (_shared/purgeUser.ts): 그룹장 위임, 계정 삭제(cascade), 사진 정리 순서
import { createClient } from 'npm:@supabase/supabase-js@2'
import { serviceKey, publishableKey } from '../_shared/keys.ts'
import { purgeUser } from '../_shared/purgeUser.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, publishableKey(), {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const {
    data: { user },
  } = await asUser.auth.getUser()
  if (!user) return json({ error: '로그인이 필요해요.' }, 401)

  const admin = createClient(url, serviceKey())
  const { data: me } = await admin.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin' || me?.is_active === false) return json({ error: '관리자만 사용할 수 있어요.' }, 403)

  const { userId } = await req.json().catch(() => ({}))
  if (typeof userId !== 'string' || !userId) return json({ error: '삭제할 회원을 지정해 주세요.' }, 400)
  if (userId === user.id) return json({ error: '본인 계정은 설정의 회원 탈퇴에서 삭제해 주세요.' }, 400)

  const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (target?.role === 'admin') return json({ error: '관리자 계정은 삭제할 수 없어요.' }, 400)

  try {
    await purgeUser(admin, userId)
  } catch (err) {
    return json({ error: `삭제에 실패했어요: ${(err as Error).message}` }, 500)
  }
  return json({ ok: true })
})
