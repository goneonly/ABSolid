import { Modal, ModalText, ModalTitle, HomeIcon, cx } from './ui.jsx'

// 운동 시작 전에 장소 고르기
// - 집에서: 지금의 영상 운동 화면으로 (onHome)
// - 헬스장에서: 아직 준비 중이라 눌리지 않음 (헬스장 루틴이 생기면 disabled 를 풀고 onClick 연결)

// 아령 아이콘 (속이 찬 모양, 집 아이콘과 같은 스타일)
function DumbbellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="9" width="3" height="6" rx="1" />
      <rect x="5" y="6" width="3.5" height="12" rx="1.2" />
      <rect x="8.5" y="10.75" width="7" height="2.5" />
      <rect x="15.5" y="6" width="3.5" height="12" rx="1.2" />
      <rect x="19.5" y="9" width="3" height="6" rx="1" />
    </svg>
  )
}

function PlaceButton({ icon, title, hint, disabled, onClick }) {
  return (
    <button
      className={cx(
        'flex flex-1 flex-col items-center gap-2 rounded-lg border px-4 py-6 [&>svg]:size-8',
        disabled
          ? 'cursor-not-allowed border-line bg-bg text-dot' // 준비 중: 바탕보다 어둡고 글자도 흐리게
          : 'border-line bg-surface-2 transition-transform active:scale-[.97]',
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <strong className="text-base font-bold">{title}</strong>
      <span className={cx('text-xs', !disabled && 'text-dim')}>{hint}</span>
    </button>
  )
}

export default function WorkoutPlaceModal({ onHome, onClose }) {
  return (
    <Modal label="운동 장소 선택" onBackdrop={onClose}>
      <ModalTitle>어디서 운동할까요?</ModalTitle>
      <ModalText>장소에 맞는 운동을 준비해 드릴게요.</ModalText>
      <div className="mt-6 flex gap-3">
        <PlaceButton icon={<HomeIcon />} title="집에서" hint="영상 보며 따라 하기" onClick={onHome} />
        <PlaceButton icon={<DumbbellIcon />} title="헬스장에서" hint="준비 중이에요" disabled />
      </div>
    </Modal>
  )
}
