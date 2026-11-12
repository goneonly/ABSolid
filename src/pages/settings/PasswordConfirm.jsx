// 본인 확인 — 되돌릴 수 없는 작업(기록 초기화, 탈퇴, 비밀번호 변경) 전에 비밀번호를 다시 확인
import { useState } from 'react'
import { signIn } from '../../server/auth.js'
import { useCaptcha, CAPTCHA_WAIT } from '../../components/Captcha.jsx'
import { Button, Field, Modal, ModalText, ModalTitle } from '../../components/ui.jsx'

// 비밀번호가 맞는지 다시 로그인해서 확인 (서버 캡차가 켜져 있으면 확인란 토큰도 필요)
// 사용: const pwCheck = usePasswordCheck(email) 후 폼 안에 {pwCheck.widget}, 제출 때 await pwCheck.check(비밀번호)
// check 반환: '' = 맞음 / 그 외 = 사용자에게 보여줄 오류 문구
export function usePasswordCheck(email) {
  const captcha = useCaptcha()
  async function check(password) {
    if (!captcha.ready) return CAPTCHA_WAIT
    const { error } = await signIn(email, password, captcha.token)
    captcha.reset()
    return error || ''
  }
  return { check, widget: captcha.widget }
}

// 비밀번호를 입력받아 맞으면 onVerified 실행
// onVerified: 작업을 수행하고, 실패하면 오류 문구를 반환 (성공하면 아무것도 반환하지 않음)
export default function PasswordConfirmModal({ title, text, confirmLabel = '확인', email, onVerified, onClose }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pwCheck = usePasswordCheck(email)

  async function submit() {
    if (!pw) return setError('비밀번호를 입력해 주세요.')
    setBusy(true)
    const failed = (await pwCheck.check(pw)) || (await onVerified())
    setBusy(false)
    if (failed) setError(failed)
  }

  return (
    <Modal label={title} onBackdrop={busy ? undefined : onClose}>
      <ModalTitle>{title}</ModalTitle>
      <ModalText>{text}</ModalText>
      <Field
        id="confirm-pw"
        label="비밀번호"
        className="mt-3"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={pw}
        error={error}
        onChange={(e) => {
          setPw(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      {pwCheck.widget}
      <Button className="mt-4" disabled={busy} onClick={submit}>
        {busy ? '확인 중…' : confirmLabel}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
