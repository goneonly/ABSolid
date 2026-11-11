import { useState } from 'react'
import { signIn, signUp, sendPasswordReset, resendSignupEmail, isDisposableEmail } from '../auth.js'
import { EMAIL_NOT_CONFIRMED } from '../authErrors.js'
import { getProfile, markOnboardingPending, cancelOnboarding } from '../storage.js'
import {
  validateEmail, validateName, validatePhone, formatPhone, validatePassword,
} from '../validation.js'
import { PrivacyModal, TermsModal, TERMS_VERSION } from '../components/LegalModals.jsx'
import { Button, Field, FieldError, LinkButton, Logo, Sub } from '../components/ui.jsx'
import { useCaptcha, CAPTCHA_WAIT } from '../components/Captcha.jsx'

// 앱 첫 화면 — 로그인 / 회원가입 / 비회원으로 시작
// 로그인(또는 즉시 세션이 생기는 가입)에 성공하면 onDone → App이 메인 화면으로 전환
const CHECKBOX = 'size-4 flex-none accent-brand'

export default function Login({ onDone, onGuest }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  // 가입 동의 3가지 (모두 필수)
  const [agreed, setAgreed] = useState({ age: false, terms: false, privacy: false })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [canResend, setCanResend] = useState(false) // 가입 직후·미인증 로그인 시 '인증 메일 다시 보내기' 노출
  const [resendBusy, setResendBusy] = useState(false)
  const captcha = useCaptcha() // 로그인·가입·메일 요청 모두 같은 확인란 사용 (토큰은 요청마다 새로)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const allAgreed = agreed.age && agreed.terms && agreed.privacy
  const signup = mode === 'signup'

  function clearFieldError(key) {
    setFieldErrors((p) => ({ ...p, [key]: '' }))
  }

  function switchMode() {
    setMode(signup ? 'signin' : 'signup')
    setError('')
    setNotice('')
    setFieldErrors({})
    setAgreed({ age: false, terms: false, privacy: false })
  }

  // 필드별 엄격 검증 — 통과 못 하면 제출 자체를 막음
  function validateAll() {
    const errs = { email: validateEmail(email) }
    if (signup) {
      errs.fullName = validateName(fullName)
      errs.phone = validatePhone(phone)
      errs.password = validatePassword(password)
      errs.agreed = allAgreed ? '' : '필수 항목에 모두 동의해 주세요.'
    } else {
      errs.password = password ? '' : '비밀번호를 입력해 주세요.'
    }
    setFieldErrors(errs)
    return !Object.values(errs).some(Boolean)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setCanResend(false)
    if (!validateAll()) return
    if (!captcha.ready) return setError(CAPTCHA_WAIT)
    setBusy(true)
    if (!signup) {
      const res = await signIn(email.trim(), password, captcha.token)
      captcha.reset()
      setBusy(false)
      if (res?.error) {
        setError(res.error)
        setCanResend(res.error === EMAIL_NOT_CONFIRMED)
      } else onDone()
      return
    }
    // 온보딩 플래그는 가입 요청 "전"에 저장해야 함 —
    // 가입 성공 시 세션 발급(App의 팝업 체크)이 응답보다 먼저 일어나기 때문
    if (await isDisposableEmail(email)) {
      setBusy(false)
      setFieldErrors((p) => ({ ...p, email: '일회용(임시) 이메일로는 가입할 수 없어요.' }))
      return
    }
    markOnboardingPending()
    const res = await signUp(email.trim(), password, getProfile().nickname, fullName.trim(), formatPhone(phone), {
      age_over_14: true,
      terms_version: TERMS_VERSION,
      terms_agreed_at: new Date().toISOString(),
    }, captcha.token)
    captcha.reset()
    setBusy(false)
    if (res?.error) {
      cancelOnboarding() // 가입 실패 시 롤백
      setError(res.error)
      return
    }
    if (res?.data?.session) {
      onDone()
    } else {
      // 이메일 인증이 필요한 경우: 로그인 모드로 돌려 인증 후 바로 로그인할 수 있게
      setMode('signin')
      setPassword('')
      setNotice('가입 확인 메일을 보냈어요. 메일의 링크를 누르면 바로 로그인돼요.')
      setCanResend(true)
    }
  }

  async function resendEmail() {
    setError('')
    setNotice('')
    const emailErr = validateEmail(email)
    if (emailErr) {
      setFieldErrors((p) => ({ ...p, email: emailErr }))
      return
    }
    if (!captcha.ready) return setError(CAPTCHA_WAIT)
    setResendBusy(true)
    const res = await resendSignupEmail(email.trim(), captcha.token)
    captcha.reset()
    setResendBusy(false)
    if (res?.error) setError(res.error)
    else setNotice('인증 메일을 다시 보냈어요. 스팸함도 확인해 주세요.')
  }

  async function forgotPassword() {
    setError('')
    setNotice('')
    const emailErr = validateEmail(email)
    if (emailErr) {
      setFieldErrors((p) => ({ ...p, email: emailErr }))
      return
    }
    if (!captcha.ready) return setError(CAPTCHA_WAIT)
    setResetBusy(true)
    const res = await sendPasswordReset(email.trim(), captcha.token)
    captcha.reset()
    setResetBusy(false)
    if (res?.error) setError(res.error)
    else setNotice('비밀번호 재설정 메일을 보냈어요. 메일의 링크를 열면 새 비밀번호를 정할 수 있어요.')
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <Logo size={48} className="justify-center gap-3 text-3xl" />
      <Sub className="mt-2 text-center">매일 복근, 같이</Sub>

      <form className="mt-8 w-full rounded-2xl border border-line bg-surface px-5 pt-6 pb-5" onSubmit={submit} noValidate>
        <h2 className="text-xl font-bold">{signup ? '회원가입' : '로그인'}</h2>
        {signup && (
          <>
            <Field
              id="name"
              label="이름"
              value={fullName}
              maxLength={20}
              placeholder="홍길동"
              autoComplete="name"
              error={fieldErrors.fullName}
              onBlur={() => setFieldErrors((p) => ({ ...p, fullName: fullName ? validateName(fullName) : '' }))}
              onChange={(e) => {
                setFullName(e.target.value)
                clearFieldError('fullName')
              }}
            />
            <Field
              id="phone"
              label="전화번호"
              type="tel"
              value={phone}
              maxLength={13}
              placeholder="010-0000-0000"
              autoComplete="tel"
              inputMode="numeric"
              error={fieldErrors.phone}
              onBlur={() => setFieldErrors((p) => ({ ...p, phone: phone ? validatePhone(phone) : '' }))}
              onChange={(e) => {
                setPhone(formatPhone(e.target.value))
                clearFieldError('phone')
              }}
            />
          </>
        )}
        <Field
          id="login-email"
          label="이메일"
          type="email"
          value={email}
          placeholder="name@example.com"
          autoComplete="email"
          error={fieldErrors.email}
          onChange={(e) => {
            setEmail(e.target.value)
            clearFieldError('email')
          }}
        />
        <Field
          id="login-pw"
          label={signup ? '비밀번호 (8자 이상, 영문+숫자)' : '비밀번호'}
          type="password"
          value={password}
          autoComplete={signup ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
          onBlur={() => signup && setFieldErrors((p) => ({ ...p, password: password ? validatePassword(password) : '' }))}
          onChange={(e) => {
            setPassword(e.target.value)
            clearFieldError('password')
          }}
        />

        {!signup && (
          <LinkButton type="button" className="mt-2.5 underline" disabled={resetBusy} onClick={forgotPassword}>
            {resetBusy ? '메일 보내는 중…' : '비밀번호를 잊으셨나요?'}
          </LinkButton>
        )}
        {signup && (
          <div className="mt-4 rounded-md border border-line bg-surface-2 px-3.5 py-3">
            <label className="flex cursor-pointer items-center gap-2 border-b border-line pb-2.5 text-base font-semibold">
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={allAgreed}
                onChange={(e) => {
                  const on = e.target.checked
                  setAgreed({ age: on, terms: on, privacy: on })
                  clearFieldError('agreed')
                }}
              />
              전체 동의
            </label>
            {[
              ['age', '(필수) 만 14세 이상입니다'],
              ['terms', '(필수) 이용약관 동의', () => setShowTerms(true)],
              ['privacy', '(필수) 개인정보 수집·이용 및 국외 이전 동의', () => setShowPrivacy(true)],
            ].map(([key, label, onView]) => (
              <div key={key} className="mt-2.5 flex items-center gap-2 text-sm">
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={agreed[key]}
                    onChange={(e) => {
                      setAgreed((p) => ({ ...p, [key]: e.target.checked }))
                      clearFieldError('agreed')
                    }}
                  />
                  {label}
                </label>
                {onView && (
                  <LinkButton type="button" className="flex-none underline" onClick={onView}>
                    보기
                  </LinkButton>
                )}
              </div>
            ))}
            {fieldErrors.agreed && <FieldError>{fieldErrors.agreed}</FieldError>}
          </div>
        )}

        {captcha.widget}
        {error && <Sub className="mt-2.5 text-brand">{error}</Sub>}
        {notice && <Sub className="mt-2.5">{notice}</Sub>}
        {canResend && !signup && (
          <LinkButton type="button" className="mt-1.5 underline" disabled={resendBusy} onClick={resendEmail}>
            {resendBusy ? '메일 보내는 중…' : '인증 메일 다시 보내기'}
          </LinkButton>
        )}

        <Button type="submit" className="mt-5" disabled={busy}>
          {busy ? '처리 중…' : signup ? '가입하기' : '로그인하기'}
        </Button>
        <LinkButton type="button" className="mx-auto mt-3.5 block px-2 py-1 text-md" onClick={switchMode}>
          {signup ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
          <span className="underline">{signup ? '로그인' : '회원가입'}</span>
        </LinkButton>
      </form>

      <LinkButton className="mt-5 px-2 py-1 underline" onClick={onGuest}>
        비회원으로 시작하기
      </LinkButton>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </main>
  )
}
