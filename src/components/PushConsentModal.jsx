import { useState } from 'react'
import { enablePush } from '../push.js'
import { toast } from '../toast.js'
import { Button, Modal, ModalText, ModalTitle } from './ui.jsx'

// 가입 완료 후 1회: 푸시 알림을 받을지 묻는 팝업 — 결과는 팝업을 더 띄우지 않고 아래 안내 한 줄(토스트)로
// - 알림 받기 → 휴대폰 권한 창 → 허용하면 완료 안내, 거부·실패하면 그 이유만 안내
// - 나중에(또는 바깥 탭) → "설정에서 켤 수 있어요" 안내
export default function PushConsentModal({ onClose }) {
  const [busy, setBusy] = useState(false)

  async function agree() {
    setBusy(true)
    try {
      await enablePush()
      toast('알림을 켰어요. 운동 안 한 날 저녁과 응원받을 때 알려드릴게요.')
    } catch (e) {
      toast(e.message || '알림을 켜지 못했어요. 설정에서 다시 시도할 수 있어요.')
    }
    setBusy(false)
    onClose()
  }

  function later() {
    toast('알림은 설정 → 기타에서 언제든 켤 수 있어요.')
    onClose()
  }

  return (
    <Modal label="운동 알림" onBackdrop={busy ? undefined : later}>
      <ModalTitle>운동 알림 받을까요?</ModalTitle>
      <ModalText>
        운동을 안 한 날 저녁과 그룹 멤버가 응원을 보냈을 때 알려드려요. 꾸준한 streak에 도움이 돼요.
      </ModalText>
      <Button className="mt-5" disabled={busy} onClick={agree}>
        {busy ? '설정 중…' : '알림 받기'}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={later}>
        나중에
      </Button>
    </Modal>
  )
}
