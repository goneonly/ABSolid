// 빈 화면 안내용 작은 그림 (EmptyState 의 art) — 색은 currentColor(회색) + 브랜드 포인트 하나

// 카메라: 인증샷이 없을 때
export function CameraArt() {
  return (
    <svg viewBox="0 0 96 72" fill="none" aria-hidden="true">
      <rect
        x="8"
        y="16"
        width="80"
        height="50"
        rx="10"
        fill="var(--color-surface-2)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M32 16l5-9h22l5 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="48" cy="41" r="14" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="41" r="6" fill="var(--color-brand)" />
      <circle cx="74" cy="27" r="3" fill="currentColor" />
    </svg>
  )
}

// 사람 셋: 참여한 그룹이 없을 때
export function GroupArt() {
  return (
    <svg viewBox="0 0 96 72" fill="none" aria-hidden="true">
      <circle cx="26" cy="28" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M10 60c1.5-10 8-15 16-15s14.5 5 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="28" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M54 60c1.5-10 8-15 16-15s14.5 5 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="22" r="11" fill="var(--color-brand)" />
      <path
        d="M28 64c2-12 10-18 20-18s18 6 20 18"
        fill="var(--color-surface-2)"
        stroke="var(--color-brand)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 자물쇠: 로그인이 필요할 때
export function LockArt() {
  // 단순한 선 아이콘: 고리 + 몸통 테두리만
  return (
    <svg viewBox="0 0 96 72" fill="none" aria-hidden="true">
      <path d="M38 34v-8a10 10 0 0 1 20 0v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="30" y="34" width="36" height="28" rx="7" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}
