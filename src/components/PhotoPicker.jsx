// 사진 고르기 공통 부품 — 프로필 사진(설정)과 그룹 사진(그룹 상세)에서 함께 사용
import { compressImage } from '../image.js'
import { Button, Modal, ModalTitle, cx } from './ui.jsx'

const MAX_FILE_BYTES = 10 * 1024 * 1024

// <input type="file"> 의 onChange 이벤트 → 압축된 사진(dataURL)
// 아무것도 고르지 않았으면 null, 쓸 수 없는 파일이면 한국어 문구를 담은 Error
export async function readPickedImage(event, { max = 512, quality = 0.85 } = {}) {
  const file = event.target.files?.[0]
  event.target.value = '' // 같은 파일을 다시 골라도 onChange 가 불리게
  if (!file) return null
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 업로드할 수 있어요.')
  if (file.size > MAX_FILE_BYTES) throw new Error('10MB 이하의 사진만 업로드할 수 있어요.')
  return compressImage(file, { max, quality })
}

// 사진 오른쪽 아래에 겹쳐 놓는 카메라 뱃지 ("눌러서 사진을 바꿀 수 있어요" 표시)
export function CameraBadge({ className, iconClassName = 'size-3.5' }) {
  return (
    <span
      className={cx(
        'absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-surface bg-brand text-white',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </span>
  )
}

// 이미 사진이 있을 때 뜨는 선택지: 교체 / 삭제 / 취소
export function PhotoActionSheet({ title, busy, onReplace, onRemove, onClose }) {
  return (
    <Modal label={title} onBackdrop={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <Button variant="secondary" className="mt-4.5" disabled={busy} onClick={onReplace}>
        사진 교체
      </Button>
      <Button variant="danger" className="mt-2.5" disabled={busy} onClick={onRemove}>
        사진 삭제
      </Button>
      <Button variant="secondary" className="mt-2.5" onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
