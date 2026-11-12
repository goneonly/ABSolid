// 계정 — 가입, 로그인, 비밀번호, 탈퇴
// 모든 함수는 { data } 또는 { error: '사용자에게 보여줄 한국어 문구' } 를 돌려줌 (예외를 던지지 않음)
import { supabase } from './supabase.js'
import { clearLocalUserData, clearAllAppData } from '../lib/storage.js'
import { authErrorMessage } from './authErrors.js'
import { disablePush } from './push.js'

const NO_SERVER = { error: '서버가 연결되어 있지 않아요.' }
// Supabase 응답을 { data } | { error } 로 통일
const result = ({ data, error }) => (error ? { error: authErrorMessage(error) } : { data: data ?? true })
// 메일 링크를 누르면 앱으로 돌아오게
const backToApp = () => window.location.origin
// 캡차를 안 쓰는 배포에서는 토큰이 빈 문자열이라 아예 보내지 않음
const captcha = (token) => token || undefined

// 가입 — 이름, 전화번호, 동의는 요청에 함께 보내고, 서버 가입 트리거(v0.10 SQL)가 검증해 프로필에 저장
// captchaToken: 봇 방지 토큰 (components/Captcha.jsx) — 서버 캡차가 꺼져 있으면 없어도 됨
export async function signUp({ email, password, nickname, fullName, phone, termsVersion, captchaToken }) {
  if (!supabase) return NO_SERVER
  return result(
    await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: captcha(captchaToken),
        emailRedirectTo: backToApp(),
        data: {
          full_name: fullName,
          phone,
          nickname: nickname || '',
          age_over_14: true, // 가입 화면에서 필수 동의를 모두 체크해야만 호출됨
          terms_version: termsVersion,
        },
      },
    }),
  )
}

export async function signIn(email, password, captchaToken) {
  if (!supabase) return NO_SERVER
  return result(
    await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha(captchaToken) } }),
  )
}

export async function signOut() {
  // 이 기기 알림 구독 해제 — 남겨두면 로그아웃한 계정의 알림이 계속 옴 (느린 네트워크에서도 3초 이상 기다리지 않음)
  await Promise.race([disablePush(), new Promise((r) => setTimeout(r, 3000))])
  clearLocalUserData() // 세션 변경으로 화면이 다시 그려지기 전에 먼저 정리
  await supabase.auth.signOut()
}

// 가입 인증 메일 다시 보내기 (메일을 못 받았거나 링크가 만료된 경우)
export async function resendSignupEmail(email, captchaToken) {
  if (!supabase) return NO_SERVER
  return result(
    await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: backToApp(), captchaToken: captcha(captchaToken) },
    }),
  )
}

// 비밀번호 재설정 메일 — 링크를 누르면 앱으로 돌아와 새 비밀번호를 정함 (components/RecoveryModal.jsx)
export async function sendPasswordReset(email, captchaToken) {
  if (!supabase) return NO_SERVER
  return result(
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: backToApp(),
      captchaToken: captcha(captchaToken),
    }),
  )
}

// 로그인(또는 복구) 상태에서 새 비밀번호 저장
export async function updatePassword(newPassword) {
  if (!supabase) return NO_SERVER
  return result(await supabase.auth.updateUser({ password: newPassword }))
}

// 일회용(임시) 메일인지 가입 전에 확인 (v0.11 SQL) — 확인에 실패하면 false (서버가 가입 때 다시 막음)
export async function isDisposableEmail(email) {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_disposable_email', { p_email: (email || '').trim() })
  return !error && data === true
}

// 회원 탈퇴 — 계정과 모든 데이터 삭제 (delete-account 엣지 함수)
export async function deleteAccount() {
  if (!supabase) return NO_SERVER
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) return { error: '탈퇴 처리에 실패했어요. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.' }
  clearAllAppData() // 이 기기에 남은 값 정리 후 로그아웃
  await supabase.auth.signOut()
  return { data: true }
}
