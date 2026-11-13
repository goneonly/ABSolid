// 로그인 토큰 확인 미들웨어 — 로그인이 필요한 주소 앞에 세워 두는 문지기
// 통과하면 다음 단계(라우트)에서 c.get('user') 로 로그인한 사용자를 꺼내 쓸 수 있음
import { supabaseFor } from './supabase.js'

export async function requireUser(c, next) {
  // TODO 1. 요청 헤더에서 Authorization 값을 읽으세요.
  //   힌트: c.req.header('Authorization')  ->  'Bearer eyJ...' 또는 undefined
  //
  // TODO 2. 'Bearer ' 로 시작하지 않으면 401 을 돌려주고 끝내세요. (next() 를 부르지 않음)
  //   힌트: return c.json({ error: '로그인이 필요해요.' }, 401)
  //
  // TODO 3. 'Bearer ' 뒤의 토큰만 잘라 내세요.
  //   힌트: 문자열의 slice 또는 replace
  //
  // TODO 4. Supabase 에 토큰이 진짜인지 물어보세요. (설계 Q7)
  //   힌트: const { data, error } = await supabaseFor(token).auth.getUser(token)
  //         진짜면 data.user 에 사용자 정보, 가짜나 만료면 error 가 있고 data.user 는 null
  //
  // TODO 5. 사용자가 없으면 401, 있으면 다음 단계에서 쓸 수 있게 저장하고 next() 로 넘기세요.
  //   힌트: c.set('user', data.user)  /  c.set('token', token)  그다음  await next()
  //   (토큰도 저장해 두면 4단계에서 그 사용자 신분으로 DB 를 조회할 때 씀)

  await next() // 다 작성하면 이 줄은 지우거나 TODO 5 위치로 옮기세요
}
