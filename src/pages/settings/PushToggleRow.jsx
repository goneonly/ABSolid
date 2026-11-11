// 설정 > 기타의 알림 켜기/끄기 줄 (회원 전용)
import { useEffect, useState } from 'react'
import { isPushSupported, isPushConfigured, getPushEnabled, enablePush, disablePush } from '../../push.js'
import { isStandalone, isIOS } from '../../install.js'
import { toast } from '../../toast.js'
import { RowButton } from '../../components/ui.jsx'

// 오늘 운동 기록이 없으면 매일 저녁 브라우저 푸시로 알려줍니다 (회원 전용)
// onNeedInstall: 아이폰 Safari 처럼 홈 화면에 추가해야 알림을 켤 수 있을 때 설치 안내 열기
export default function PushToggleRow({ session, onNeedInstall }) {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = isPushSupported()

  useEffect(() => {
    if (session && supported) getPushEnabled().then(setEnabled)
  }, [session, supported])

  if (!session || !isPushConfigured()) return null // 비회원 또는 알림이 꺼진 배포
  if (!supported) {
    // 아이폰은 홈 화면에 추가한 앱에서만 알림 API 가 열림 → 방법 안내
    if (!isIOS() || isStandalone()) return null
    return (
      <RowButton hint="홈 화면에 추가하면 켤 수 있어요" onClick={onNeedInstall}>
        알림 (리마인더·응원)
      </RowButton>
    )
  }

  async function toggle() {
    setBusy(true)
    try {
      if (enabled) {
        await disablePush()
        setEnabled(false)
        toast('알림을 껐어요.')
      } else {
        await enablePush()
        setEnabled(true)
        toast('운동 안 한 날 저녁 리마인더와 응원 알림을 보내드릴게요.')
      }
    } catch (e) {
      toast(e.message || '알림 설정에 실패했어요.')
    }
    setBusy(false)
  }

  return (
    <RowButton disabled={busy} hint={busy ? '처리 중…' : enabled ? '켜짐' : '꺼짐'} onClick={toggle}>
      알림 (리마인더·응원)
    </RowButton>
  )
}
