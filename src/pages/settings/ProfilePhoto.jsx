// 설정 상단의 프로필 사진 + 닉네임
// 회원: 사진이 없으면 누르면 바로 고르기 / 있으면 교체·삭제 선택지. 비회원: 기본 아이콘 고정
import { useEffect, useRef, useState } from 'react'
import { getProfile, saveProfile } from '../../storage.js'
import { uploadAvatar, deleteAvatar, fetchMyAvatarUrl } from '../../api.js'
import { toast } from '../../toast.js'
import { CameraBadge, PhotoActionSheet, readPickedImage } from '../../components/PhotoPicker.jsx'
import { PersonIcon } from '../../components/ui.jsx'

const CIRCLE =
  'relative flex size-24 items-center justify-center rounded-full border-2 border-line bg-surface-2 p-0 text-dot'

export default function ProfilePhoto({ nickname, session, onChanged }) {
  const fileRef = useRef(null)
  const [avatar, setAvatar] = useState(getProfile().avatar || '')
  const [showSheet, setShowSheet] = useState(false)
  const [busy, setBusy] = useState(false)

  // 새 기기에서 로그인한 경우: 서버에 저장된 프로필 사진 불러오기
  useEffect(() => {
    if (!session || getProfile().avatar) return
    let alive = true
    fetchMyAvatarUrl().then((url) => {
      if (alive && url) setAvatar(url)
    })
    return () => {
      alive = false
    }
  }, [session])

  if (!session) {
    return (
      <div className="flex flex-col items-center pt-2">
        <div className={CIRCLE} aria-label="기본 프로필 사진">
          <PersonIcon className="size-12" />
        </div>
        <ProfileName nickname={nickname} />
        <div className="mt-1 text-xs text-dim">프로필 사진은 로그인 후 설정할 수 있어요</div>
      </div>
    )
  }

  async function handleFile(e) {
    setBusy(true)
    try {
      const dataUrl = await readPickedImage(e)
      if (dataUrl) {
        // 기기에 먼저 저장하고 서버에도 올림 — 서버 업로드가 실패해도 이 기기에서는 보임
        saveProfile({ ...getProfile(), avatar: dataUrl })
        setAvatar(dataUrl)
        if (!(await uploadAvatar(dataUrl))) toast('서버 업로드에 실패했어요. 사진은 이 기기에서만 보여요.')
        onChanged()
      }
    } catch (err) {
      toast(err.message || '사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요.')
    }
    setBusy(false)
    setShowSheet(false)
  }

  async function removePhoto() {
    setBusy(true)
    const profile = getProfile()
    delete profile.avatar
    saveProfile(profile)
    setAvatar('')
    await deleteAvatar()
    setBusy(false)
    setShowSheet(false)
    onChanged()
  }

  return (
    <div className="flex flex-col items-center pt-2">
      <button
        className={`${CIRCLE} disabled:opacity-60`}
        aria-label={avatar ? '프로필 사진 관리' : '프로필 사진 업로드'}
        disabled={busy}
        onClick={() => (avatar ? setShowSheet(true) : fileRef.current?.click())}
      >
        {avatar ? (
          <img className="block size-full rounded-full object-cover" src={avatar} alt="프로필 사진" />
        ) : (
          <PersonIcon className="size-12" />
        )}
        <CameraBadge className="size-7.5 border-3" />
      </button>
      <ProfileName nickname={nickname} />
      <div className="mt-1 text-xs text-dim">{session.user.email}</div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {showSheet && (
        <PhotoActionSheet
          title="프로필 사진"
          busy={busy}
          onReplace={() => fileRef.current?.click()}
          onRemove={removePhoto}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  )
}

function ProfileName({ nickname }) {
  return <div className="mt-3 text-base font-bold">{nickname?.trim() || '닉네임을 설정해 주세요'}</div>
}
