// 설정 > 내 프로필의 변경 모달 3종: 닉네임 / 이름·전화번호 / 비밀번호
import { useEffect, useState } from 'react'
import { getProfile, saveProfile } from '../../storage.js'
import { updatePassword } from '../../auth.js'
import { saveNickname, fetchMyProfileInfo, updateMyProfileInfo } from '../../api.js'
import { INVALID_CREDENTIALS } from '../../authErrors.js'
import { validateNickname, validateName, validatePhone, formatPhone, validatePassword } from '../../validation.js'
import { toast } from '../../toast.js'
import { Button, Field, Modal, ModalText, ModalTitle, Sub, cx } from '../../components/ui.jsx'
import { usePasswordCheck } from './PasswordConfirm.jsx'

// ── 닉네임 변경 ──
export function NicknameModal({ session, initial, onSaved, onClose }) {
  const [value, setValue] = useState(initial || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const err = validateNickname(value)
    setError(err)
    if (err) return
    const nick = value.trim()
    setBusy(true)
    saveProfile({ ...getProfile(), nickname: nick })
    if (session) await saveNickname(nick)
    setBusy(false)
    onSaved(nick)
    toast('닉네임을 변경했어요.')
    onClose()
  }

  return (
    <Modal label="닉네임 변경" onBackdrop={busy ? undefined : onClose}>
      <ModalTitle>닉네임 변경</ModalTitle>
      <ModalText>그룹에서 다른 멤버에게 보이는 이름이에요.</ModalText>
      <Field
        id="nick"
        label="닉네임 (2~12자, 한글·영문·숫자·_)"
        className="mt-3"
        autoFocus
        value={value}
        placeholder="그룹에 표시될 이름"
        maxLength={12}
        error={error}
        onChange={(e) => {
          setValue(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <Button className="mt-4" disabled={busy} onClick={submit}>
        {busy ? '저장 중…' : '저장'}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}

// ── 이름·전화번호 변경 (가입 때 입력한 값 — '회원만 받기' 그룹 참여 조건) ──
export function ProfileInfoModal({ onClose }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetchMyProfileInfo()
      .then((info) => {
        if (!alive || !info) return
        setFullName(info.fullName)
        setPhone(info.phone)
        setLoaded(true)
      })
      .catch((e) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [])

  async function submit() {
    // 둘 다 선택 입력 — 적었다면 형식 검사
    const errs = {
      fullName: fullName.trim() ? validateName(fullName) : '',
      phone: phone ? validatePhone(phone) : '',
    }
    setErrors(errs)
    if (errs.fullName || errs.phone) return
    setBusy(true)
    try {
      await updateMyProfileInfo({ fullName: fullName.trim(), phone: phone ? formatPhone(phone) : '' })
      toast('이름·전화번호를 저장했어요.')
      onClose()
    } catch (e) {
      setErrors({ phone: e.message })
    }
    setBusy(false)
  }

  return (
    <Modal label="이름·전화번호 변경" onBackdrop={busy ? undefined : onClose}>
      <ModalTitle>이름·전화번호 변경</ModalTitle>
      <ModalText>그룹 멤버에게는 보이지 않아요. '회원만 받기' 그룹에 참여하려면 둘 다 필요해요.</ModalText>
      {!loaded ? (
        <Sub className={cx('mt-4 text-center', loadError && 'text-danger')}>{loadError || '불러오는 중…'}</Sub>
      ) : (
        <>
          <Field
            id="full-name"
            label="이름"
            className="mt-3"
            value={fullName}
            maxLength={20}
            placeholder="홍길동"
            autoComplete="name"
            error={errors.fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setErrors((p) => ({ ...p, fullName: '' }))
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
            error={errors.phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value))
              setErrors((p) => ({ ...p, phone: '' }))
            }}
          />
        </>
      )}
      <Button className="mt-4" disabled={busy || !loaded} onClick={submit}>
        {busy ? '저장 중…' : '저장'}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}

// ── 비밀번호 변경 (현재 비밀번호로 본인 확인 후) ──
export function ChangePasswordModal({ email, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const pwCheck = usePasswordCheck(email)

  async function submit() {
    const errs = {
      current: current ? '' : '현재 비밀번호를 입력해 주세요.',
      next:
        validatePassword(next) || (next && next === current ? '현재 비밀번호와 다른 비밀번호를 입력해 주세요.' : ''),
      confirmPw: next === confirmPw ? '' : '새 비밀번호가 서로 달라요.',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setBusy(true)
    const failed = await pwCheck.check(current)
    if (failed) {
      setBusy(false)
      // 비밀번호가 틀린 경우만 문구를 바꾸고, 연결 실패 등은 원래 안내 그대로
      setErrors({ current: failed === INVALID_CREDENTIALS ? '현재 비밀번호가 올바르지 않아요.' : failed })
      return
    }
    const res = await updatePassword(next)
    setBusy(false)
    if (res?.error) {
      setErrors({ next: res.error })
      return
    }
    toast('비밀번호를 변경했어요.')
    onClose()
  }

  const clear = (key) => setErrors((p) => ({ ...p, [key]: '' }))

  return (
    <Modal label="비밀번호 변경" onBackdrop={busy ? undefined : onClose}>
      <ModalTitle>비밀번호 변경</ModalTitle>
      <Field
        id="pw-current"
        label="현재 비밀번호"
        className="mt-3"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={current}
        error={errors.current}
        onChange={(e) => {
          setCurrent(e.target.value)
          clear('current')
        }}
      />
      <Field
        id="pw-next"
        label="새 비밀번호 (8자 이상, 영문+숫자)"
        type="password"
        autoComplete="new-password"
        value={next}
        error={errors.next}
        onChange={(e) => {
          setNext(e.target.value)
          clear('next')
        }}
      />
      <Field
        id="pw-confirm"
        label="새 비밀번호 확인"
        type="password"
        autoComplete="new-password"
        value={confirmPw}
        error={errors.confirmPw}
        onChange={(e) => {
          setConfirmPw(e.target.value)
          clear('confirmPw')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      {pwCheck.widget}
      <Button className="mt-4" disabled={busy} onClick={submit}>
        {busy ? '변경 중…' : '비밀번호 변경'}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
