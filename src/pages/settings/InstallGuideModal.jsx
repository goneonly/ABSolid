// 홈 화면에 앱 추가 방법 안내 (설치 창을 직접 띄울 수 없는 브라우저용 — 아이폰 Safari 등)
import { isPushConfigured } from '../../push.js'
import { isIOS } from '../../install.js'
import { Button, Modal, ModalText, ModalTitle } from '../../components/ui.jsx'

export default function InstallGuideModal({ onClose }) {
  const ios = isIOS()
  const steps = ios
    ? ['Safari 로 이 사이트를 열어요.', '아래쪽 공유 버튼(□↑)을 눌러요.', "'홈 화면에 추가'를 누르고 '추가'를 눌러요."]
    : ['Chrome 으로 이 사이트를 열어요.', '오른쪽 위 메뉴(⋮)를 눌러요.', "'앱 설치' 또는 '홈 화면에 추가'를 눌러요."]
  return (
    <Modal label="홈 화면에 앱 추가" onBackdrop={onClose}>
      <ModalTitle>홈 화면에 앱 추가</ModalTitle>
      <ModalText>앱처럼 바로 실행할 수 있어요.</ModalText>
      <ol className="mt-4 space-y-2.5 rounded-md bg-surface-2 px-4 py-3.5 text-base">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2.5">
            <span className="flex size-5.5 flex-none items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {/* 푸시 알림이 실제로 켜진 배포에서만 안내 (VAPID 키가 없으면 알림 기능 자체가 숨겨짐) */}
      {ios && isPushConfigured() && (
        <p className="mt-3 text-xs text-dim">
          아이폰은 홈 화면에 추가한 앱에서만 운동 리마인더 알림을 받을 수 있어요 (iOS 16.4 이상).
        </p>
      )}
      <Button variant="secondary" className="mt-4" onClick={onClose}>
        확인
      </Button>
    </Modal>
  )
}
